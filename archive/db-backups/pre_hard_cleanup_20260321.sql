


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."actor_type" AS ENUM (
    'USER',
    'PATIENT',
    'VENDOR',
    'CLINIC'
);


ALTER TYPE "public"."actor_type" OWNER TO "postgres";


CREATE TYPE "public"."contact_type" AS ENUM (
    'WhatsApp',
    'Fixo',
    'Email',
    'Telegram'
);


ALTER TYPE "public"."contact_type" OWNER TO "postgres";


CREATE TYPE "public"."fin_status" AS ENUM (
    'PAID',
    'PENDING',
    'CANCELED'
);


ALTER TYPE "public"."fin_status" OWNER TO "postgres";


CREATE TYPE "public"."fin_type" AS ENUM (
    'REVENUE',
    'EXPENSE'
);


ALTER TYPE "public"."fin_type" OWNER TO "postgres";


CREATE TYPE "public"."key_type" AS ENUM (
    'PUBLISHABLE',
    'SECRET'
);


ALTER TYPE "public"."key_type" OWNER TO "postgres";


CREATE TYPE "public"."record_type" AS ENUM (
    'EVOLUCAO',
    'RECEITA',
    'EXAME',
    'TRIAGEM'
);


ALTER TYPE "public"."record_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_patient_with_actor"("p_clinic_id" "uuid", "p_name" "text", "p_cpf" "text", "p_birth_date" "date", "p_gender" "text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$ DECLARE new_actor_id UUID; new_patient_row RECORD; BEGIN INSERT INTO actor (clinic_id, name, type) VALUES (p_clinic_id, p_name, 'patient') RETURNING id INTO new_actor_id; INSERT INTO patient (id, clinic_id, cpf, birth_date, gender) VALUES (new_actor_id, p_clinic_id, p_cpf, p_birth_date, p_gender) RETURNING * INTO new_patient_row; RETURN json_build_object('id', new_actor_id, 'name', p_name, 'clinicId', p_clinic_id, 'cpf', p_cpf, 'birthDate', p_birth_date, 'gender', p_gender); END; $$;


ALTER FUNCTION "public"."create_patient_with_actor"("p_clinic_id" "uuid", "p_name" "text", "p_cpf" "text", "p_birth_date" "date", "p_gender" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_with_actor"("p_user_id" "uuid", "p_email" "text", "p_name" "text", "p_clinic_id" "text", "p_role" "text", "p_iam_bindings" "jsonb", "p_assigned_room" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_actor_id uuid;
  v_user_result jsonb;
begin
  -- 1. Create Actor
  insert into actor (clinic_id, name, type)
  values (p_clinic_id, p_name, 'user')
  returning id into v_actor_id;

  -- 2. Create User linked to Actor
  insert into app_user (id, actor_id, email, role, iam_bindings, assigned_room)
  values (p_user_id, v_actor_id, p_email, p_role, p_iam_bindings, p_assigned_room);

  -- 3. Return the created user with actor info
  select jsonb_build_object(
    'id', u.id,
    'actor_id', u.actor_id,
    'email', u.email,
    'role', u.role,
    'iam_bindings', u.iam_bindings,
    'assigned_room', u.assigned_room,
    'actor', jsonb_build_object(
      'id', a.id,
      'name', a.name,
      'clinic_id', a.clinic_id
    )
  )
  into v_user_result
  from app_user u
  join actor a on u.actor_id = a.id
  where u.id = p_user_id;

  return v_user_result;
exception
  when others then
    raise;
end;
$$;


ALTER FUNCTION "public"."create_user_with_actor"("p_user_id" "uuid", "p_email" "text", "p_name" "text", "p_clinic_id" "text", "p_role" "text", "p_iam_bindings" "jsonb", "p_assigned_room" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_user_metadata_sync"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
   BEGIN
     UPDATE auth.users
     SET raw_app_meta_data =
       coalesce(raw_app_meta_data, '{}'::jsonb) ||
       jsonb_build_object('role', NEW.role, 'clinic_id', NEW.clinic_id)
     WHERE id = NEW.id::uuid;
     RETURN NEW;
   END;
   $$;


ALTER FUNCTION "public"."handle_user_metadata_sync"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_permission"("required_permission" "text", "target_clinic_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE user_iam JSONB;
BEGIN
  IF is_super_admin() THEN RETURN TRUE; END IF;
  SELECT iam_bindings INTO user_iam FROM public."user" WHERE id = auth.uid()::text;
  IF user_iam IS NULL THEN RETURN FALSE; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(user_iam) AS b WHERE (b->>'resource' = '*' OR (b->>'resource')::uuid = target_clinic_id) AND (b->'denied') ? required_permission) THEN RETURN FALSE; END IF;
  RETURN EXISTS (SELECT 1 FROM jsonb_array_elements(user_iam) AS b WHERE (b->>'resource' = '*' OR (b->>'resource')::uuid = target_clinic_id) AND ( (b->'permissions') ? required_permission OR (b->'permissions') ? '*' ));
END;
$$;


ALTER FUNCTION "public"."has_permission"("required_permission" "text", "target_clinic_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_super_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
   BEGIN
     -- Verifica no Token (tentando os dois nomes comuns de metadados)
     IF (auth.jwt() -> 'app_metadata' ->> 'role') = 'SUPER_ADMIN' THEN RETURN TRUE; END IF;

     -- Fallback no Banco
     RETURN EXISTS (
       SELECT 1 FROM public."user"
       WHERE id = auth.uid()::text AND role = 'SUPER_ADMIN'
     );
   END;
   $$;


ALTER FUNCTION "public"."is_super_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."perform_procedure"("p_clinic_id" "uuid", "p_patient_id" "uuid", "p_professional_id" "uuid", "p_procedure_type_id" "uuid", "p_notes" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_procedure_id uuid;
  v_recipe record;
begin
  -- Gera ID ficticio (Stub)
  v_procedure_id := gen_random_uuid(); 

  for v_recipe in select * from procedure_recipe where procedure_type_id = p_procedure_type_id loop
    
    update inventory_item
    set current_stock = current_stock - v_recipe.quantity,
        updated_at = now()
    where id = v_recipe.item_id;

    insert into inventory_movement (clinic_id, item_id, qty_change, reason, related_procedure_id, actor_id, notes)
    values (
      p_clinic_id,
      v_recipe.item_id,
      -v_recipe.quantity,
      'PROCEDURE',
      v_procedure_id,
      p_professional_id,
      'Auto-deduction via procedure: ' || p_procedure_type_id
    );
    
  end loop;

  return v_procedure_id;
end;
$$;


ALTER FUNCTION "public"."perform_procedure"("p_clinic_id" "uuid", "p_patient_id" "uuid", "p_professional_id" "uuid", "p_procedure_type_id" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."proc_stock_impact"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    old_stock INTEGER;
    old_avg DECIMAL(10,2);
    new_avg DECIMAL(10,2);
    batch_cost DECIMAL(10,2);
BEGIN
    IF (NEW.type = 'IN') THEN
        SELECT "currentStock", "avgCostPrice" INTO old_stock, old_avg FROM public."Product" WHERE id = NEW."productId";
        
        -- Busca custo do lote mais recente para o cálculo ponderado
        SELECT "costPrice" INTO batch_cost FROM public."Batch" WHERE "productId" = NEW."productId" ORDER BY "createdAt" DESC LIMIT 1;
        
        IF (old_stock + NEW."totalQty" > 0) THEN
            new_avg := ((old_stock * old_avg) + (NEW."totalQty" * COALESCE(batch_cost, 0))) / (old_stock + NEW."totalQty");
        ELSE
            new_avg := COALESCE(batch_cost, 0);
        END IF;

        UPDATE public."Product" SET "currentStock" = old_stock + NEW."totalQty", "avgCostPrice" = new_avg WHERE id = NEW."productId";
        INSERT INTO public."ProductHistory" ("productId", "stockAtTime", "avgCostAtTime") VALUES (NEW."productId", old_stock + NEW."totalQty", new_avg);
    ELSE
        UPDATE public."Product" SET "currentStock" = "currentStock" - NEW."totalQty" WHERE id = NEW."productId";
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."proc_stock_impact"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_with_actor"("p_user_id" "uuid", "p_name" "text", "p_role" "text", "p_iam_bindings" "jsonb", "p_assigned_room" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_actor_id uuid;
  v_user_result jsonb;
begin
  -- 1. Get Actor ID
  select actor_id into v_actor_id from app_user where id = p_user_id;

  if v_actor_id is null then
    raise exception 'User not found or not linked to actor';
  end if;

  -- 2. Update Actor
  update actor
  set name = p_name
  where id = v_actor_id;

  -- 3. Update User
  update app_user
  set 
    role = p_role,
    iam_bindings = p_iam_bindings,
    assigned_room = p_assigned_room
  where id = p_user_id;

  -- 4. Return the updated user with actor info
  select jsonb_build_object(
    'id', u.id,
    'actor_id', u.actor_id,
    'email', u.email,
    'role', u.role,
    'iam_bindings', u.iam_bindings,
    'assigned_room', u.assigned_room,
    'actor', jsonb_build_object(
      'id', a.id,
      'name', a.name,
      'clinic_id', a.clinic_id
    )
  )
  into v_user_result
  from app_user u
  join actor a on u.actor_id = a.id
  where u.id = p_user_id;

  return v_user_result;
exception
  when others then
    raise;
end;
$$;


ALTER FUNCTION "public"."update_user_with_actor"("p_user_id" "uuid", "p_name" "text", "p_role" "text", "p_iam_bindings" "jsonb", "p_assigned_room" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."AccessBinding" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actorId" "uuid" NOT NULL,
    "permission" "text" NOT NULL,
    "resourceId" "text" NOT NULL,
    "isDenial" boolean DEFAULT false
);


ALTER TABLE "public"."AccessBinding" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."AccessRequest" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinicId" "uuid" NOT NULL,
    "clinicName" "text" NOT NULL,
    "requesterId" "text" NOT NULL,
    "requesterName" "text" NOT NULL,
    "reason" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "requestedRoleId" "text" NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."AccessRequest" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ApiKey" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinicId" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "keyPrefix" "text" NOT NULL,
    "keyHash" "text" NOT NULL,
    "type" "public"."key_type" DEFAULT 'PUBLISHABLE'::"public"."key_type",
    "lastUsedAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ApiKey" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Batch" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "productId" "uuid" NOT NULL,
    "batchNumber" "text",
    "expiryDate" "date",
    "costPrice" numeric(10,2) NOT NULL,
    "currentQty" integer NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."Batch" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Contact" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actorId" "uuid" NOT NULL,
    "type" "public"."contact_type" NOT NULL,
    "value" "text" NOT NULL,
    "isPrimary" boolean DEFAULT false
);


ALTER TABLE "public"."Contact" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."FinancialCategory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinicId" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "public"."fin_type" NOT NULL,
    "isFixed" boolean DEFAULT false
);


ALTER TABLE "public"."FinancialCategory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."FinancialTransaction" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinicId" "uuid" NOT NULL,
    "partyId" "uuid" NOT NULL,
    "categoryId" "uuid",
    "description" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "type" "public"."fin_type" NOT NULL,
    "status" "public"."fin_status" DEFAULT 'PENDING'::"public"."fin_status",
    "dueDate" "date" NOT NULL,
    "paymentDate" "date",
    "createdAt" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."FinancialTransaction" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ProductHistory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "productId" "uuid" NOT NULL,
    "date" timestamp with time zone DEFAULT "now"(),
    "stockAtTime" integer NOT NULL,
    "avgCostAtTime" numeric(10,2) NOT NULL
);


ALTER TABLE "public"."ProductHistory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."StockTransaction" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinicId" "uuid" NOT NULL,
    "productId" "uuid" NOT NULL,
    "type" "text",
    "totalQty" integer NOT NULL,
    "reason" "text",
    "performedBy" "text" NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "StockTransaction_type_check" CHECK (("type" = ANY (ARRAY['IN'::"text", 'OUT'::"text"])))
);


ALTER TABLE "public"."StockTransaction" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."access_request" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "clinic_name" "text" NOT NULL,
    "requester_id" "text" NOT NULL,
    "requester_name" "text" NOT NULL,
    "requested_role_id" "text" NOT NULL,
    "reason" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "requester_user_id" "uuid"
);


ALTER TABLE "public"."access_request" OWNER TO "postgres";


COMMENT ON COLUMN "public"."access_request"."requester_user_id" IS 'Canonical requester reference to app_user. Transitional bridge while legacy requester_id text still exists.';



CREATE TABLE IF NOT EXISTS "public"."actor" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "type" "public"."actor_type" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."actor" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_user" (
    "id" "uuid" NOT NULL,
    "actor_id" "uuid",
    "email" "text",
    "role" "text",
    "iam_bindings" "jsonb",
    "assigned_room" "text"
);


ALTER TABLE "public"."app_user" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."appointment" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "doctor_id" "text",
    "patient_name" "text" NOT NULL,
    "doctor_name" "text" NOT NULL,
    "appointment_date" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'Agendado'::"text",
    "priority" "text" DEFAULT 'Normal'::"text",
    "room_number" "text",
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "doctor_actor_id" "uuid"
);


ALTER TABLE "public"."appointment" OWNER TO "postgres";


COMMENT ON COLUMN "public"."appointment"."doctor_actor_id" IS 'Canonical doctor reference. Transitional bridge while legacy doctor_id text still exists.';



CREATE TABLE IF NOT EXISTS "public"."batch" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "batch_number" "text",
    "expiry_date" "date",
    "cost_price" numeric(10,2) NOT NULL,
    "current_qty" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."batch" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clinic" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "plan" "text" DEFAULT 'Starter'::"text",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."clinic" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clinical_record" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "doctor_id" "text" NOT NULL,
    "content" "text" NOT NULL,
    "type" "public"."record_type" DEFAULT 'EVOLUCAO'::"public"."record_type",
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "doctor_actor_id" "uuid"
);


ALTER TABLE "public"."clinical_record" OWNER TO "postgres";


COMMENT ON COLUMN "public"."clinical_record"."doctor_actor_id" IS 'Canonical doctor reference. Transitional bridge while legacy doctor_id text still exists.';



CREATE TABLE IF NOT EXISTS "public"."financial_transaction" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "party_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "type" "public"."fin_type" NOT NULL,
    "status" "public"."fin_status" DEFAULT 'PENDING'::"public"."fin_status",
    "due_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."financial_transaction" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_item" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "barcode" "text",
    "unit" "text" DEFAULT 'un'::"text" NOT NULL,
    "current_stock" numeric(10,2) DEFAULT 0 NOT NULL,
    "min_stock" numeric(10,2) DEFAULT 0,
    "cost_price" numeric(10,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."inventory_item" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_movement" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "qty_change" numeric(10,2) NOT NULL,
    "reason" "text" NOT NULL,
    "related_procedure_id" "uuid",
    "actor_id" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "inventory_movement_reason_check" CHECK (("reason" = ANY (ARRAY['PURCHASE'::"text", 'PROCEDURE'::"text", 'CORRECTION'::"text", 'LOSS'::"text", 'RETURN'::"text"])))
);


ALTER TABLE "public"."inventory_movement" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patient" (
    "id" "uuid" NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "cpf" "text",
    "birth_date" "date",
    "gender" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."patient" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."procedure_recipe" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "procedure_type_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "quantity" numeric(10,2) DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."procedure_recipe" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."procedure_type" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "price" numeric(10,2) DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."procedure_type" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "barcode" "text",
    "name" "text" NOT NULL,
    "category" "text",
    "avg_cost_price" numeric(10,2) DEFAULT 0,
    "current_stock" integer DEFAULT 0,
    "min_stock" integer DEFAULT 10,
    "price" numeric(10,2) NOT NULL,
    "deleted" boolean DEFAULT false
);


ALTER TABLE "public"."product" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."social_post" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "platform" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."social_post" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_transaction" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "record_id" "uuid",
    "type" "text",
    "total_qty" integer NOT NULL,
    "reason" "text",
    "timestamp" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "stock_transaction_type_check" CHECK (("type" = ANY (ARRAY['IN'::"text", 'OUT'::"text"])))
);


ALTER TABLE "public"."stock_transaction" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user" (
    "id" "text" NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "iam_bindings" "jsonb" DEFAULT '[]'::"jsonb",
    "assigned_room" "text"
);


ALTER TABLE "public"."user" OWNER TO "postgres";


ALTER TABLE ONLY "public"."AccessBinding"
    ADD CONSTRAINT "AccessBinding_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."AccessRequest"
    ADD CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ApiKey"
    ADD CONSTRAINT "ApiKey_keyHash_key" UNIQUE ("keyHash");



ALTER TABLE ONLY "public"."ApiKey"
    ADD CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Batch"
    ADD CONSTRAINT "Batch_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Contact"
    ADD CONSTRAINT "Contact_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."FinancialCategory"
    ADD CONSTRAINT "FinancialCategory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."FinancialTransaction"
    ADD CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ProductHistory"
    ADD CONSTRAINT "ProductHistory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."StockTransaction"
    ADD CONSTRAINT "StockTransaction_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."access_request"
    ADD CONSTRAINT "access_request_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."actor"
    ADD CONSTRAINT "actor_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_user"
    ADD CONSTRAINT "app_user_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointment"
    ADD CONSTRAINT "appointment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."batch"
    ADD CONSTRAINT "batch_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clinic"
    ADD CONSTRAINT "clinic_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."clinic"
    ADD CONSTRAINT "clinic_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clinical_record"
    ADD CONSTRAINT "clinical_record_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_transaction"
    ADD CONSTRAINT "financial_transaction_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_item"
    ADD CONSTRAINT "inventory_item_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_movement"
    ADD CONSTRAINT "inventory_movement_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient"
    ADD CONSTRAINT "patient_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."procedure_recipe"
    ADD CONSTRAINT "procedure_recipe_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."procedure_recipe"
    ADD CONSTRAINT "procedure_recipe_procedure_type_id_item_id_key" UNIQUE ("procedure_type_id", "item_id");



ALTER TABLE ONLY "public"."procedure_type"
    ADD CONSTRAINT "procedure_type_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product"
    ADD CONSTRAINT "product_clinic_id_barcode_key" UNIQUE ("clinic_id", "barcode");



ALTER TABLE ONLY "public"."product"
    ADD CONSTRAINT "product_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."social_post"
    ADD CONSTRAINT "social_post_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_transaction"
    ADD CONSTRAINT "stock_transaction_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_actor_id_key" UNIQUE ("actor_id");



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_access_matrix" ON "public"."AccessBinding" USING "btree" ("actorId", "permission", "resourceId");



CREATE INDEX "idx_access_request_requester_user_id" ON "public"."access_request" USING "btree" ("requester_user_id");



CREATE INDEX "idx_appointment_doctor_actor_id" ON "public"."appointment" USING "btree" ("doctor_actor_id");



CREATE INDEX "idx_clinical_record_doctor_actor_id" ON "public"."clinical_record" USING "btree" ("doctor_actor_id");



CREATE OR REPLACE TRIGGER "on_user_profile_change" AFTER INSERT OR UPDATE OF "role", "clinic_id" ON "public"."user" FOR EACH ROW EXECUTE FUNCTION "public"."handle_user_metadata_sync"();



CREATE OR REPLACE TRIGGER "trg_stock_impact" AFTER INSERT ON "public"."StockTransaction" FOR EACH ROW EXECUTE FUNCTION "public"."proc_stock_impact"();



ALTER TABLE ONLY "public"."FinancialTransaction"
    ADD CONSTRAINT "FinancialTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."FinancialCategory"("id");



ALTER TABLE ONLY "public"."access_request"
    ADD CONSTRAINT "access_request_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinic"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."access_request"
    ADD CONSTRAINT "access_request_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "public"."user"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."access_request"
    ADD CONSTRAINT "access_request_requester_user_id_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "public"."app_user"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."actor"
    ADD CONSTRAINT "actor_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinic"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."app_user"
    ADD CONSTRAINT "app_user_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."actor"("id");



ALTER TABLE ONLY "public"."app_user"
    ADD CONSTRAINT "app_user_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."appointment"
    ADD CONSTRAINT "appointment_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinic"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointment"
    ADD CONSTRAINT "appointment_doctor_actor_id_fkey" FOREIGN KEY ("doctor_actor_id") REFERENCES "public"."actor"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."appointment"
    ADD CONSTRAINT "appointment_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."user"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."appointment"
    ADD CONSTRAINT "appointment_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."batch"
    ADD CONSTRAINT "batch_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clinical_record"
    ADD CONSTRAINT "clinical_record_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinic"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clinical_record"
    ADD CONSTRAINT "clinical_record_doctor_actor_id_fkey" FOREIGN KEY ("doctor_actor_id") REFERENCES "public"."actor"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."clinical_record"
    ADD CONSTRAINT "clinical_record_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."user"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."clinical_record"
    ADD CONSTRAINT "clinical_record_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."financial_transaction"
    ADD CONSTRAINT "financial_transaction_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinic"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financial_transaction"
    ADD CONSTRAINT "financial_transaction_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "public"."actor"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inventory_item"
    ADD CONSTRAINT "inventory_item_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinic"("id");



ALTER TABLE ONLY "public"."inventory_movement"
    ADD CONSTRAINT "inventory_movement_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."actor"("id");



ALTER TABLE ONLY "public"."inventory_movement"
    ADD CONSTRAINT "inventory_movement_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinic"("id");



ALTER TABLE ONLY "public"."inventory_movement"
    ADD CONSTRAINT "inventory_movement_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_item"("id");



ALTER TABLE ONLY "public"."patient"
    ADD CONSTRAINT "patient_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinic"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient"
    ADD CONSTRAINT "patient_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."actor"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."procedure_recipe"
    ADD CONSTRAINT "procedure_recipe_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_item"("id");



ALTER TABLE ONLY "public"."procedure_recipe"
    ADD CONSTRAINT "procedure_recipe_procedure_type_id_fkey" FOREIGN KEY ("procedure_type_id") REFERENCES "public"."procedure_type"("id");



ALTER TABLE ONLY "public"."procedure_type"
    ADD CONSTRAINT "procedure_type_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinic"("id");



ALTER TABLE ONLY "public"."product"
    ADD CONSTRAINT "product_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinic"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."social_post"
    ADD CONSTRAINT "social_post_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinic"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_transaction"
    ADD CONSTRAINT "stock_transaction_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinic"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."stock_transaction"
    ADD CONSTRAINT "stock_transaction_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."actor"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinic"("id") ON DELETE CASCADE;



CREATE POLICY "Atores: Gestão Total" ON "public"."actor" USING ("public"."is_super_admin"());



CREATE POLICY "Atores: Leitura" ON "public"."actor" FOR SELECT USING ((("id" IN ( SELECT "user"."actor_id"
   FROM "public"."user"
  WHERE ("user"."id" = ("auth"."uid"())::"text"))) OR (("clinic_id")::"text" = ("auth"."jwt"() ->> 'clinic_id'::"text"))));



CREATE POLICY "Clínicas: Admin Total" ON "public"."clinic" USING ("public"."is_super_admin"());



CREATE POLICY "Clínicas: Visibilidade" ON "public"."clinic" FOR SELECT USING (("public"."is_super_admin"() OR ("id" IN ( SELECT "user"."clinic_id"
   FROM "public"."user"
  WHERE ("user"."id" = ("auth"."uid"())::"text")))));



CREATE POLICY "Estoque: Escrita" ON "public"."product" FOR INSERT WITH CHECK ("public"."has_permission"('inventory.write'::"text", "clinic_id"));



CREATE POLICY "Estoque: Leitura" ON "public"."product" FOR SELECT USING ("public"."has_permission"('inventory.read'::"text", "clinic_id"));



ALTER TABLE "public"."FinancialTransaction" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Inventory Access Policy" ON "public"."inventory_item" USING (("clinic_id" IN ( SELECT "actor"."clinic_id"
   FROM "public"."actor"
  WHERE ("actor"."id" = ( SELECT "app_user"."actor_id"
           FROM "public"."app_user"
          WHERE ("app_user"."id" = "auth"."uid"()))))));



CREATE POLICY "Movement Access Policy" ON "public"."inventory_movement" USING (("clinic_id" IN ( SELECT "actor"."clinic_id"
   FROM "public"."actor"
  WHERE ("actor"."id" = ( SELECT "app_user"."actor_id"
           FROM "public"."app_user"
          WHERE ("app_user"."id" = "auth"."uid"()))))));



CREATE POLICY "Pacientes: Clínica" ON "public"."patient" FOR SELECT USING ((("clinic_id")::"text" = ("auth"."jwt"() ->> 'clinic_id'::"text")));



CREATE POLICY "Pacientes: Gestão Total" ON "public"."patient" USING ("public"."is_super_admin"());



CREATE POLICY "Procedure Type Access Policy" ON "public"."procedure_type" USING (("clinic_id" IN ( SELECT "actor"."clinic_id"
   FROM "public"."actor"
  WHERE ("actor"."id" = ( SELECT "app_user"."actor_id"
           FROM "public"."app_user"
          WHERE ("app_user"."id" = "auth"."uid"()))))));



CREATE POLICY "Prontuários: Rigor" ON "public"."clinical_record" USING ("public"."has_permission"('clinical.read_records'::"text", "clinic_id"));



CREATE POLICY "Recipe Access Policy" ON "public"."procedure_recipe" USING (("procedure_type_id" IN ( SELECT "procedure_type"."id"
   FROM "public"."procedure_type")));



CREATE POLICY "Solicitações: Criar" ON "public"."access_request" FOR INSERT WITH CHECK (("requester_id" = ("auth"."uid"())::"text"));



CREATE POLICY "Solicitações: Ver Próprias" ON "public"."access_request" FOR SELECT USING ((("requester_id" = ("auth"."uid"())::"text") OR "public"."is_super_admin"()));



CREATE POLICY "Super Admin Tudo" ON "public"."clinic" USING ("public"."is_super_admin"());



CREATE POLICY "Users can view own user record" ON "public"."app_user" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Usuários: Gestão Total" ON "public"."user" USING ("public"."is_super_admin"());



CREATE POLICY "Usuários: Leitura" ON "public"."user" FOR SELECT USING (((("auth"."uid"())::"text" = "id") OR (("clinic_id")::"text" = ("auth"."jwt"() ->> 'clinic_id'::"text"))));



ALTER TABLE "public"."access_request" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."actor" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_user" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."appointment" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."batch" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clinic" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clinical_record" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."financial_transaction" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_item" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_movement" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patient" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."procedure_recipe" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."procedure_type" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."social_post" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_transaction" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."create_patient_with_actor"("p_clinic_id" "uuid", "p_name" "text", "p_cpf" "text", "p_birth_date" "date", "p_gender" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_patient_with_actor"("p_clinic_id" "uuid", "p_name" "text", "p_cpf" "text", "p_birth_date" "date", "p_gender" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_patient_with_actor"("p_clinic_id" "uuid", "p_name" "text", "p_cpf" "text", "p_birth_date" "date", "p_gender" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_with_actor"("p_user_id" "uuid", "p_email" "text", "p_name" "text", "p_clinic_id" "text", "p_role" "text", "p_iam_bindings" "jsonb", "p_assigned_room" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_with_actor"("p_user_id" "uuid", "p_email" "text", "p_name" "text", "p_clinic_id" "text", "p_role" "text", "p_iam_bindings" "jsonb", "p_assigned_room" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_with_actor"("p_user_id" "uuid", "p_email" "text", "p_name" "text", "p_clinic_id" "text", "p_role" "text", "p_iam_bindings" "jsonb", "p_assigned_room" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_metadata_sync"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_metadata_sync"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_metadata_sync"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_permission"("required_permission" "text", "target_clinic_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_permission"("required_permission" "text", "target_clinic_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_permission"("required_permission" "text", "target_clinic_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."perform_procedure"("p_clinic_id" "uuid", "p_patient_id" "uuid", "p_professional_id" "uuid", "p_procedure_type_id" "uuid", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."perform_procedure"("p_clinic_id" "uuid", "p_patient_id" "uuid", "p_professional_id" "uuid", "p_procedure_type_id" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."perform_procedure"("p_clinic_id" "uuid", "p_patient_id" "uuid", "p_professional_id" "uuid", "p_procedure_type_id" "uuid", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."proc_stock_impact"() TO "anon";
GRANT ALL ON FUNCTION "public"."proc_stock_impact"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."proc_stock_impact"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_with_actor"("p_user_id" "uuid", "p_name" "text", "p_role" "text", "p_iam_bindings" "jsonb", "p_assigned_room" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_with_actor"("p_user_id" "uuid", "p_name" "text", "p_role" "text", "p_iam_bindings" "jsonb", "p_assigned_room" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_with_actor"("p_user_id" "uuid", "p_name" "text", "p_role" "text", "p_iam_bindings" "jsonb", "p_assigned_room" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."AccessBinding" TO "anon";
GRANT ALL ON TABLE "public"."AccessBinding" TO "authenticated";
GRANT ALL ON TABLE "public"."AccessBinding" TO "service_role";



GRANT ALL ON TABLE "public"."AccessRequest" TO "anon";
GRANT ALL ON TABLE "public"."AccessRequest" TO "authenticated";
GRANT ALL ON TABLE "public"."AccessRequest" TO "service_role";



GRANT ALL ON TABLE "public"."ApiKey" TO "anon";
GRANT ALL ON TABLE "public"."ApiKey" TO "authenticated";
GRANT ALL ON TABLE "public"."ApiKey" TO "service_role";



GRANT ALL ON TABLE "public"."Batch" TO "anon";
GRANT ALL ON TABLE "public"."Batch" TO "authenticated";
GRANT ALL ON TABLE "public"."Batch" TO "service_role";



GRANT ALL ON TABLE "public"."Contact" TO "anon";
GRANT ALL ON TABLE "public"."Contact" TO "authenticated";
GRANT ALL ON TABLE "public"."Contact" TO "service_role";



GRANT ALL ON TABLE "public"."FinancialCategory" TO "anon";
GRANT ALL ON TABLE "public"."FinancialCategory" TO "authenticated";
GRANT ALL ON TABLE "public"."FinancialCategory" TO "service_role";



GRANT ALL ON TABLE "public"."FinancialTransaction" TO "anon";
GRANT ALL ON TABLE "public"."FinancialTransaction" TO "authenticated";
GRANT ALL ON TABLE "public"."FinancialTransaction" TO "service_role";



GRANT ALL ON TABLE "public"."ProductHistory" TO "anon";
GRANT ALL ON TABLE "public"."ProductHistory" TO "authenticated";
GRANT ALL ON TABLE "public"."ProductHistory" TO "service_role";



GRANT ALL ON TABLE "public"."StockTransaction" TO "anon";
GRANT ALL ON TABLE "public"."StockTransaction" TO "authenticated";
GRANT ALL ON TABLE "public"."StockTransaction" TO "service_role";



GRANT ALL ON TABLE "public"."access_request" TO "anon";
GRANT ALL ON TABLE "public"."access_request" TO "authenticated";
GRANT ALL ON TABLE "public"."access_request" TO "service_role";



GRANT ALL ON TABLE "public"."actor" TO "anon";
GRANT ALL ON TABLE "public"."actor" TO "authenticated";
GRANT ALL ON TABLE "public"."actor" TO "service_role";



GRANT ALL ON TABLE "public"."app_user" TO "anon";
GRANT ALL ON TABLE "public"."app_user" TO "authenticated";
GRANT ALL ON TABLE "public"."app_user" TO "service_role";



GRANT ALL ON TABLE "public"."appointment" TO "anon";
GRANT ALL ON TABLE "public"."appointment" TO "authenticated";
GRANT ALL ON TABLE "public"."appointment" TO "service_role";



GRANT ALL ON TABLE "public"."batch" TO "anon";
GRANT ALL ON TABLE "public"."batch" TO "authenticated";
GRANT ALL ON TABLE "public"."batch" TO "service_role";



GRANT ALL ON TABLE "public"."clinic" TO "anon";
GRANT ALL ON TABLE "public"."clinic" TO "authenticated";
GRANT ALL ON TABLE "public"."clinic" TO "service_role";



GRANT ALL ON TABLE "public"."clinical_record" TO "anon";
GRANT ALL ON TABLE "public"."clinical_record" TO "authenticated";
GRANT ALL ON TABLE "public"."clinical_record" TO "service_role";



GRANT ALL ON TABLE "public"."financial_transaction" TO "anon";
GRANT ALL ON TABLE "public"."financial_transaction" TO "authenticated";
GRANT ALL ON TABLE "public"."financial_transaction" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_item" TO "anon";
GRANT ALL ON TABLE "public"."inventory_item" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_item" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_movement" TO "anon";
GRANT ALL ON TABLE "public"."inventory_movement" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_movement" TO "service_role";



GRANT ALL ON TABLE "public"."patient" TO "anon";
GRANT ALL ON TABLE "public"."patient" TO "authenticated";
GRANT ALL ON TABLE "public"."patient" TO "service_role";



GRANT ALL ON TABLE "public"."procedure_recipe" TO "anon";
GRANT ALL ON TABLE "public"."procedure_recipe" TO "authenticated";
GRANT ALL ON TABLE "public"."procedure_recipe" TO "service_role";



GRANT ALL ON TABLE "public"."procedure_type" TO "anon";
GRANT ALL ON TABLE "public"."procedure_type" TO "authenticated";
GRANT ALL ON TABLE "public"."procedure_type" TO "service_role";



GRANT ALL ON TABLE "public"."product" TO "anon";
GRANT ALL ON TABLE "public"."product" TO "authenticated";
GRANT ALL ON TABLE "public"."product" TO "service_role";



GRANT ALL ON TABLE "public"."social_post" TO "anon";
GRANT ALL ON TABLE "public"."social_post" TO "authenticated";
GRANT ALL ON TABLE "public"."social_post" TO "service_role";



GRANT ALL ON TABLE "public"."stock_transaction" TO "anon";
GRANT ALL ON TABLE "public"."stock_transaction" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_transaction" TO "service_role";



GRANT ALL ON TABLE "public"."user" TO "anon";
GRANT ALL ON TABLE "public"."user" TO "authenticated";
GRANT ALL ON TABLE "public"."user" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































