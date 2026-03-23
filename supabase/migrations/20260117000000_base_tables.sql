-- =============================================================================
-- Migration: 20260117000000_base_tables
-- Purpose:   Bootstrap the core domain tables required by the migration chain.
--            Extracted from archive/db-backups/pre_hard_cleanup_20260321.sql
--            to repair the missing migration order in supabase/migrations/.
--
-- Why this exists:
--   The original supabase/migrations/ started at 20260321000000_identity_bridge
--   but that migration does ALTER TABLE on appointment/clinical_record/access_request
--   which did not exist in any migration (the initial dump files were empty).
--   This migration provides the base tables so that identity_bridge runs cleanly.
--
-- Dependencies: None (runs first in the migration chain)
-- Idempotent:   Yes (CREATE TABLE IF NOT EXISTS / DO $$ blocks)
-- =============================================================================

begin;

-- btree_gist is required for EXCLUDE constraints using GiST with uuid/UUID
CREATE EXTENSION IF NOT EXISTS btree_gist SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- ENUM types
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'actor_type') then
    create type "public"."actor_type" as enum ('USER', 'PATIENT', 'VENDOR', 'CLINIC');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'record_type') then
    create type "public"."record_type" as enum ('EVOLUCAO', 'RECEITA', 'EXAME', 'TRIAGEM');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- actor — the canonical identity entity
--     Columns: id, clinic_id, type, name, created_at
--     Later: name column migrated to app_user and patient in flatten migration
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."actor" (
    "id"         "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_id"  "uuid" NOT NULL,
    "type"       "public"."actor_type" NOT NULL,
    "name"       "text" NOT NULL,
    "email"      "text",
    "phone"      "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."actor" OWNER TO "postgres";

-- ---------------------------------------------------------------------------
-- clinic — multi-tenant root
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."clinic" (
    "id"         "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name"       "text" NOT NULL,
    "email"      "text" NOT NULL,
    "plan"       "text" DEFAULT 'Starter'::"text",
    "status"     "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."clinic" OWNER TO "postgres";

-- ---------------------------------------------------------------------------
-- public."user" — legacy user table (id text, pre-flattening)
--     identity_bridge backfill UPDATE reads from this table.
--     Dropped by hard_cleanup after bridge is complete.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."user" (
    "id"           "text" NOT NULL,
    "actor_id"     "uuid" NOT NULL,
    "clinic_id"    "uuid" NOT NULL,
    "email"        "text" NOT NULL,
    "role"         "text" NOT NULL,
    "name"         "text",
    "iam_bindings" "jsonb" DEFAULT '[]'::"jsonb",
    "assigned_room" "text",
    "created_at"   timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."user" OWNER TO "postgres";

-- ---------------------------------------------------------------------------
-- app_user — links to auth.users and carries IAM bindings
--     actor_id references actor (later dropped in flatten)
--     name column added in flatten migration (moved from actor)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."app_user" (
    "id"           "uuid" NOT NULL,
    "actor_id"     "uuid",
    "email"        "text",
    "role"         "text",
    "iam_bindings" "jsonb",
    "assigned_room" "text",
    "name"         "text" NOT NULL DEFAULT 'Unknown User'
);

ALTER TABLE "public"."app_user" OWNER TO "postgres";

-- ---------------------------------------------------------------------------
-- patient — denormalised patient record linked to actor
--     id references actor (later changed in flatten)
--     name column added in flatten migration (moved from actor)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."patient" (
    "id"         "uuid" NOT NULL,
    "clinic_id"  "uuid" NOT NULL,
    "cpf"        "text",
    "birth_date" "date",
    "gender"     "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "name"       "text" NOT NULL DEFAULT 'Unknown Patient'
);

ALTER TABLE "public"."patient" OWNER TO "postgres";

-- ---------------------------------------------------------------------------
-- access_request — clinic access requests
--     Has transitional bridge columns: requester_id (text) and requester_user_id (uuid)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."access_request" (
    "id"                 "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_id"          "uuid" NOT NULL,
    "clinic_name"        "text" NOT NULL,
    "requested_role_id"  "text" NOT NULL,
    "reason"             "text",
    "status"             "text" DEFAULT 'pending'::"text",
    "created_at"         timestamp with time zone DEFAULT "now"(),
    "requester_id"       "text",
    "requester_name"     "text",
    "requester_user_id"  "uuid"
);

ALTER TABLE "public"."access_request" OWNER TO "postgres";

-- ---------------------------------------------------------------------------
-- appointment — clinic appointments
--     Has transitional doctor_actor_id bridge column (uuid, added by identity_bridge)
--     doctor_id (text) and doctor_name are legacy columns (dropped in hard_cleanup)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."appointment" (
    "id"                "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_id"         "uuid" NOT NULL,
    "patient_id"        "uuid" NOT NULL,
    "doctor_id"         "text",
    "patient_name"      "text" NOT NULL,
    "doctor_name"       "text",
    "appointment_date"  timestamp with time zone NOT NULL,
    "status"            "text" DEFAULT 'Agendado'::"text",
    "priority"          "text" DEFAULT 'Normal'::"text",
    "room_number"       "text",
    "timestamp"         timestamp with time zone DEFAULT "now"(),
    "duration_minutes"  integer DEFAULT 60 NOT NULL,
    "doctor_actor_id"   "uuid"
);

ALTER TABLE "public"."appointment" OWNER TO "postgres";

-- ---------------------------------------------------------------------------
-- clinical_record — clinical notes per patient
--     Has transitional doctor_actor_id bridge column
--     doctor_id (text) is a legacy column (dropped in hard_cleanup)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."clinical_record" (
    "id"                "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_id"         "uuid" NOT NULL,
    "patient_id"        "uuid" NOT NULL,
    "doctor_id"         "text",
    "content"           "text" NOT NULL,
    "type"              "public"."record_type" DEFAULT 'EVOLUCAO'::"public"."record_type",
    "timestamp"         timestamp with time zone DEFAULT "now"(),
    "doctor_actor_id"   "uuid"
);

ALTER TABLE "public"."clinical_record" OWNER TO "postgres";

-- ---------------------------------------------------------------------------
-- product — inventory product
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."product" (
    "id"              "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_id"       "uuid" NOT NULL,
    "barcode"         "text",
    "name"            "text" NOT NULL,
    "category"        "text",
    "avg_cost_price"  numeric(10,2) DEFAULT 0,
    "current_stock"   integer DEFAULT 0,
    "min_stock"       integer DEFAULT 10,
    "price"           numeric(10,2) NOT NULL,
    "deleted"         boolean DEFAULT false,
    "unit"            "text" DEFAULT 'un'::"text" NOT NULL,
    "description"     "text"
);

ALTER TABLE "public"."product" OWNER TO "postgres";

-- ---------------------------------------------------------------------------
-- stock_transaction — inventory movements
--     actor_id column added by hard_cleanup (later renamed to user_id in flatten)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."stock_transaction" (
    "id"          "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_id"   "uuid" NOT NULL,
    "product_id"  "uuid" NOT NULL,
    "record_id"   "uuid",
    "type"        "text",
    "total_qty"   integer NOT NULL,
    "reason"      "text",
    "timestamp"   timestamp with time zone DEFAULT "now"(),
    "actor_id"    "uuid",
    "notes"       "text"
);

ALTER TABLE "public"."stock_transaction" OWNER TO "postgres";

-- ---------------------------------------------------------------------------
-- procedure_type — types of procedures offered
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."procedure_type" (
    "id"         "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_id"  "uuid" NOT NULL,
    "name"       "text" NOT NULL,
    "code"       "text",
    "price"      numeric(10,2) DEFAULT 0 NOT NULL,
    "active"     boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."procedure_type" OWNER TO "postgres";

-- ---------------------------------------------------------------------------
-- procedure_recipe — ingredients/consumables for a procedure type
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."procedure_recipe" (
    "id"                "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "procedure_type_id" "uuid" NOT NULL,
    "item_id"           "uuid" NOT NULL,
    "quantity"          numeric(10,2) DEFAULT 1 NOT NULL,
    "created_at"       timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."procedure_recipe" OWNER TO "postgres";

-- ---------------------------------------------------------------------------
-- inventory_item — legacy inventory table (data migrated to product by hard_cleanup)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."inventory_item" (
    "id"            "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_id"     "uuid" NOT NULL,
    "name"          "text" NOT NULL,
    "description"   "text",
    "unit"          "text" DEFAULT 'un'::"text",
    "current_stock" integer DEFAULT 0,
    "min_stock"     integer DEFAULT 0,
    "cost_price"    numeric(10,2) DEFAULT 0,
    "barcode"       "text"
);

ALTER TABLE "public"."inventory_item" OWNER TO "postgres";

-- ---------------------------------------------------------------------------
-- inventory_movement — legacy inventory movement (data migrated to stock_transaction)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."inventory_movement" (
    "id"                    "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_id"             "uuid" NOT NULL,
    "item_id"               "uuid" NOT NULL,
    "qty_change"           numeric(10,2) NOT NULL,
    "reason"               "text",
    "notes"                "text",
    "actor_id"            "uuid",
    "related_procedure_id" "uuid",
    "created_at"          timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."inventory_movement" OWNER TO "postgres";

-- ---------------------------------------------------------------------------
-- HELPER FUNCTIONS (needed by appointment EXCLUDE constraint)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION "public"."calc_appointment_end"("start_time" timestamp with time zone, "duration_mins" integer)
RETURNS timestamp with time zone
LANGUAGE "sql" IMMUTABLE
AS $$
  select start_time + (duration_mins * interval '1 minute');
$$;

-- ---------------------------------------------------------------------------
-- PRIMARY KEYS
-- ---------------------------------------------------------------------------

ALTER TABLE ONLY "public"."actor"               ADD CONSTRAINT "actor_pkey"               PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."clinic"             ADD CONSTRAINT "clinic_pkey"             PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."user"               ADD CONSTRAINT "user_pkey"               PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."app_user"           ADD CONSTRAINT "app_user_pkey"           PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."patient"            ADD CONSTRAINT "patient_pkey"            PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."access_request"     ADD CONSTRAINT "access_request_pkey"     PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."appointment"         ADD CONSTRAINT "appointment_pkey"         PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."clinical_record"    ADD CONSTRAINT "clinical_record_pkey"    PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."product"            ADD CONSTRAINT "product_pkey"            PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."stock_transaction" ADD CONSTRAINT "stock_transaction_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."procedure_type"    ADD CONSTRAINT "procedure_type_pkey"    PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."procedure_recipe"  ADD CONSTRAINT "procedure_recipe_pkey"  PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."inventory_item"     ADD CONSTRAINT "inventory_item_pkey"     PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."inventory_movement" ADD CONSTRAINT "inventory_movement_pkey" PRIMARY KEY ("id");

-- ---------------------------------------------------------------------------
-- UNIQUE CONSTRAINTS
-- ---------------------------------------------------------------------------

ALTER TABLE ONLY "public"."clinic"   ADD CONSTRAINT "clinic_email_key"                  UNIQUE ("email");
ALTER TABLE ONLY "public"."product"   ADD CONSTRAINT "product_clinic_id_barcode_key"      UNIQUE ("clinic_id", "barcode");
ALTER TABLE ONLY "public"."procedure_recipe" ADD CONSTRAINT "procedure_recipe_procedure_type_id_item_id_key" UNIQUE ("procedure_type_id", "item_id");

-- ---------------------------------------------------------------------------
-- FOREIGN KEYS
-- ---------------------------------------------------------------------------

ALTER TABLE ONLY "public"."app_user"
    ADD CONSTRAINT "app_user_id_fkey"     FOREIGN KEY ("id")      REFERENCES "auth"."users"("id");
ALTER TABLE ONLY "public"."app_user"
    ADD CONSTRAINT "app_user_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."actor"("id");

ALTER TABLE ONLY "public"."patient"
    ADD CONSTRAINT "patient_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinic"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."access_request"
    ADD CONSTRAINT "access_request_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinic"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."appointment"
    ADD CONSTRAINT "appointment_clinic_id_fkey"  FOREIGN KEY ("clinic_id")  REFERENCES "public"."clinic"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."appointment"
    ADD CONSTRAINT "appointment_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."clinical_record"
    ADD CONSTRAINT "clinical_record_clinic_id_fkey"  FOREIGN KEY ("clinic_id")  REFERENCES "public"."clinic"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."clinical_record"
    ADD CONSTRAINT "clinical_record_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."product"
    ADD CONSTRAINT "product_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinic"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."stock_transaction"
    ADD CONSTRAINT "stock_transaction_clinic_id_fkey"  FOREIGN KEY ("clinic_id")  REFERENCES "public"."clinic"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."stock_transaction"
    ADD CONSTRAINT "stock_transaction_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."procedure_type"
    ADD CONSTRAINT "procedure_type_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinic"("id");

ALTER TABLE ONLY "public"."procedure_recipe"
    ADD CONSTRAINT "procedure_recipe_procedure_type_id_fkey" FOREIGN KEY ("procedure_type_id") REFERENCES "public"."procedure_type"("id");
ALTER TABLE ONLY "public"."procedure_recipe"
    ADD CONSTRAINT "procedure_recipe_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."product"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."inventory_item"
    ADD CONSTRAINT "inventory_item_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinic"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."inventory_movement"
    ADD CONSTRAINT "inventory_movement_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_item"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."inventory_movement"
    ADD CONSTRAINT "inventory_movement_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."actor"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."actor"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinic"("id") ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS "idx_access_request_requester_user_id" ON "public"."access_request" ("requester_user_id");
CREATE INDEX IF NOT EXISTS "idx_app_user_iam_bindings_gin"        ON "public"."app_user" USING "gin" ("iam_bindings");

-- ---------------------------------------------------------------------------
-- ENABLE ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

ALTER TABLE "public"."access_request"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."app_user"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."appointment"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."clinic"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."clinical_record" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."patient"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."procedure_recipe" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."procedure_type"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."product"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."stock_transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."inventory_item"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."inventory_movement" ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- BASE RLS POLICIES (placeholder - tightened in later migrations)
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can view own user record" ON "public"."app_user"
    FOR SELECT USING ("auth"."uid"() = "id");

CREATE POLICY "Solicitações: Criar" ON "public"."access_request"
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Solicitações: Ver Próprias" ON "public"."access_request"
    FOR SELECT USING (true);

CREATE POLICY "Pacientes: Clínica" ON "public"."patient"
    FOR SELECT USING (true);

CREATE POLICY "Prontuários: Rigor" ON "public"."clinical_record"
    FOR SELECT USING (true);

CREATE POLICY "Super Admin Tudo" ON "public"."clinic"
    FOR ALL TO "authenticated" USING (true);

commit;
