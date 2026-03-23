-- =============================================================================
-- IntraClinica: Master Database Schema (V2 Greenfield)
-- Generated on: 2026-03-22
--
-- Note: This is the consolidated baseline schema. It replaces all incremental
-- migrations and establishes the single source of truth for the database
-- structure, including RLS policies, EXCLUDE constraints, and RPCs.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. EXTENSIONS
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- -----------------------------------------------------------------------------
-- 1. BASE TABLES (No Foreign Keys First)
-- -----------------------------------------------------------------------------

CREATE TABLE public.clinic (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  plan text DEFAULT 'Starter'::text,
  status text DEFAULT 'active'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT clinic_pkey PRIMARY KEY (id)
);

CREATE TABLE public.ui_module (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key character varying NOT NULL UNIQUE,
  label character varying NOT NULL,
  icon character varying NOT NULL,
  route character varying NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ui_module_pkey PRIMARY KEY (id)
);

-- -----------------------------------------------------------------------------
-- 2. CORE DOMAIN TABLES (Multi-Tenant)
-- -----------------------------------------------------------------------------

CREATE TABLE public.clinic_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  key character varying NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT clinic_config_pkey PRIMARY KEY (id),
  CONSTRAINT clinic_config_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinic(id)
);

CREATE TABLE public.clinic_module (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  module_key character varying NOT NULL,
  enabled boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  CONSTRAINT clinic_module_pkey PRIMARY KEY (id),
  CONSTRAINT clinic_module_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinic(id),
  CONSTRAINT clinic_module_module_key_fkey FOREIGN KEY (module_key) REFERENCES public.ui_module(key)
);

CREATE TABLE public.actor (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  type text NOT NULL, 
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT actor_pkey PRIMARY KEY (id),
  CONSTRAINT actor_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinic(id)
);

CREATE TABLE public.app_user (
  id uuid NOT NULL, 
  actor_id uuid,
  email text,
  role text,
  iam_bindings jsonb,
  assigned_room text,
  CONSTRAINT app_user_pkey PRIMARY KEY (id),
  CONSTRAINT app_user_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.actor(id)
);

CREATE TABLE public.access_request (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  clinic_name text NOT NULL,
  requested_role_id text NOT NULL,
  reason text,
  status text DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  requester_user_id uuid,
  CONSTRAINT access_request_pkey PRIMARY KEY (id),
  CONSTRAINT access_request_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinic(id),
  CONSTRAINT access_request_requester_user_id_fkey FOREIGN KEY (requester_user_id) REFERENCES public.app_user(id)
);

-- -----------------------------------------------------------------------------
-- 3. MEDICAL DOMAIN TABLES
-- -----------------------------------------------------------------------------

CREATE TABLE public.patient (
  id uuid NOT NULL,
  clinic_id uuid NOT NULL,
  cpf text,
  birth_date date,
  gender text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT patient_pkey PRIMARY KEY (id),
  CONSTRAINT patient_id_fkey FOREIGN KEY (id) REFERENCES public.actor(id),
  CONSTRAINT patient_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinic(id)
);

CREATE TABLE public.appointment (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  patient_name text NOT NULL,
  appointment_date timestamp with time zone NOT NULL,
  status text DEFAULT 'Agendado'::text,
  priority text DEFAULT 'Normal'::text,
  room_number text,
  timestamp timestamp with time zone DEFAULT now(),
  doctor_actor_id uuid,
  duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes > 0 AND duration_minutes <= 480),
  CONSTRAINT appointment_pkey PRIMARY KEY (id),
  CONSTRAINT appointment_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinic(id),
  CONSTRAINT appointment_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient(id),
  CONSTRAINT appointment_doctor_actor_id_fkey FOREIGN KEY (doctor_actor_id) REFERENCES public.actor(id)
);

CREATE TABLE public.clinical_record (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  content text NOT NULL,
  type text DEFAULT 'EVOLUCAO'::text,
  timestamp timestamp with time zone DEFAULT now(),
  doctor_actor_id uuid,
  CONSTRAINT clinical_record_pkey PRIMARY KEY (id),
  CONSTRAINT clinical_record_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinic(id),
  CONSTRAINT clinical_record_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient(id),
  CONSTRAINT clinical_record_doctor_actor_id_fkey FOREIGN KEY (doctor_actor_id) REFERENCES public.actor(id)
);

-- -----------------------------------------------------------------------------
-- 4. INVENTORY & PROCEDURES
-- -----------------------------------------------------------------------------

CREATE TABLE public.product (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  barcode text,
  name text NOT NULL,
  category text,
  avg_cost_price numeric DEFAULT 0,
  current_stock integer DEFAULT 0,
  min_stock integer DEFAULT 10,
  price numeric NOT NULL,
  deleted boolean DEFAULT false,
  unit text NOT NULL DEFAULT 'un'::text,
  description text,
  CONSTRAINT product_pkey PRIMARY KEY (id),
  CONSTRAINT product_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinic(id)
);

CREATE TABLE public.stock_transaction (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  product_id uuid NOT NULL,
  record_id uuid,
  type text CHECK (type = ANY (ARRAY['IN'::text, 'OUT'::text])),
  total_qty integer NOT NULL,
  reason text,
  timestamp timestamp with time zone DEFAULT now(),
  actor_id uuid,
  notes text,
  CONSTRAINT stock_transaction_pkey PRIMARY KEY (id),
  CONSTRAINT stock_transaction_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinic(id),
  CONSTRAINT stock_transaction_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(id),
  CONSTRAINT stock_transaction_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.actor(id)
);

CREATE TABLE public.procedure_type (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  name text NOT NULL,
  code text,
  price numeric NOT NULL DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT procedure_type_pkey PRIMARY KEY (id),
  CONSTRAINT procedure_type_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinic(id)
);

CREATE TABLE public.procedure_recipe (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  procedure_type_id uuid NOT NULL,
  item_id uuid NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT procedure_recipe_pkey PRIMARY KEY (id),
  CONSTRAINT procedure_recipe_procedure_type_id_fkey FOREIGN KEY (procedure_type_id) REFERENCES public.procedure_type(id),
  CONSTRAINT procedure_recipe_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.product(id)
);

CREATE TABLE public.social_post (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  platform text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT social_post_pkey PRIMARY KEY (id),
  CONSTRAINT social_post_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinic(id)
);

-- -----------------------------------------------------------------------------
-- 5. CONSTRAINTS & TRIGGERS (V2 Logic)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.calc_appointment_end(start_time timestamptz, duration_mins int)
RETURNS timestamptz
LANGUAGE sql IMMUTABLE
AS $$
  SELECT start_time + (duration_mins * interval '1 minute');
$$;

ALTER TABLE public.appointment
  ADD CONSTRAINT appointment_no_doctor_overlap
  EXCLUDE USING gist (
    doctor_actor_id WITH =,
    tstzrange(
      appointment_date,
      public.calc_appointment_end(appointment_date, duration_minutes),
      '[)'
    ) WITH &&
  )
  WHERE (doctor_actor_id IS NOT NULL AND status NOT IN ('Cancelado', 'Realizado'));

CREATE OR REPLACE FUNCTION public.trg_fn_appointment_conflict_check()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_conflict record;
BEGIN
  IF NEW.status IN ('Cancelado', 'Realizado') THEN RETURN NEW; END IF;
  IF NEW.doctor_actor_id IS NULL THEN RETURN NEW; END IF;

  SELECT id, patient_name, appointment_date, duration_minutes INTO v_conflict
    FROM public.appointment
   WHERE doctor_actor_id = NEW.doctor_actor_id
     AND id <> COALESCE(OLD.id, '00000000-0000-0000-0000-000000000000'::uuid)
     AND status NOT IN ('Cancelado', 'Realizado')
     AND tstzrange(appointment_date, public.calc_appointment_end(appointment_date, duration_minutes), '[)')
      && tstzrange(NEW.appointment_date, public.calc_appointment_end(NEW.appointment_date, NEW.duration_minutes), '[)')
   LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION
      'Conflito de horario: o medico ja possui um agendamento com "%" as % (duracao: % min). Escolha outro horario ou medico.',
      v_conflict.patient_name,
      to_char(v_conflict.appointment_date at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI'),
      v_conflict.duration_minutes
      USING errcode = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_appointment_conflict_check
  BEFORE INSERT OR UPDATE OF doctor_actor_id, appointment_date, duration_minutes, status
  ON public.appointment
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_appointment_conflict_check();


-- -----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) & ACCESS CONTROL
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT exists (
    SELECT 1 FROM public.app_user
    WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
  );
$$;

ALTER TABLE public.clinic_module ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.clinic_module
FOR SELECT TO authenticated
USING (public.is_super_admin() OR clinic_id = (SELECT clinic_id FROM public.app_user WHERE id = auth.uid()));

CREATE POLICY "Enable insert for SUPER_ADMIN" ON public.clinic_module
FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());

CREATE POLICY "Enable update for SUPER_ADMIN" ON public.clinic_module
FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Enable delete for SUPER_ADMIN" ON public.clinic_module
FOR DELETE TO authenticated USING (public.is_super_admin());

COMMIT;
-- 002-iam-rls-enforcement.sql
-- Enables RLS on all medical/operational tables and enforces strict multi-tenant 
-- and IAM role-based access control based on the app_user.iam_bindings column.

-- 1. Helper Functions to read IAM Bindings securely (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.has_clinic_access(target_clinic_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT exists (
    SELECT 1 FROM public.app_user
    WHERE id = auth.uid() 
      AND (
        role = 'SUPER_ADMIN' 
        OR iam_bindings ? target_clinic_id::text
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.has_clinic_role(target_clinic_id uuid, target_role text)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT exists (
    SELECT 1 FROM public.app_user
    WHERE id = auth.uid() 
      AND (
        role = 'SUPER_ADMIN' 
        OR iam_bindings->target_clinic_id::text ? target_role
      )
  );
$$;

-- 2. ENABLE RLS ON ALL TABLES
ALTER TABLE public.patient ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedure_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedure_recipe ENABLE ROW LEVEL SECURITY;

-- 3. APPLY POLICIES (Strict Tenant Isolation)

-- PATIENT
CREATE POLICY "Acesso Multi-Tenant Pacientes" ON public.patient
FOR ALL TO authenticated
USING (public.has_clinic_access(clinic_id))
WITH CHECK (public.has_clinic_access(clinic_id));

-- APPOINTMENT
CREATE POLICY "Acesso Multi-Tenant Agendamentos" ON public.appointment
FOR ALL TO authenticated
USING (public.has_clinic_access(clinic_id))
WITH CHECK (public.has_clinic_access(clinic_id));

-- CLINICAL_RECORD (Strict Horizontal/Vertical Boundaries)
-- Only doctors or clinic admins can view medical records.
CREATE POLICY "Acesso Restrito Prontuarios" ON public.clinical_record
FOR ALL TO authenticated
USING (
  public.has_clinic_access(clinic_id) AND (
    public.has_clinic_role(clinic_id, 'DOCTOR') OR 
    public.has_clinic_role(clinic_id, 'ADMIN')
  )
)
WITH CHECK (
  public.has_clinic_access(clinic_id) AND (
    public.has_clinic_role(clinic_id, 'DOCTOR') OR 
    public.has_clinic_role(clinic_id, 'ADMIN')
  )
);

-- INVENTORY (PRODUCT & TRANSACTIONS)
CREATE POLICY "Acesso Estoque Produtos" ON public.product
FOR ALL TO authenticated
USING (public.has_clinic_access(clinic_id))
WITH CHECK (public.has_clinic_access(clinic_id));

CREATE POLICY "Acesso Transacoes Estoque" ON public.stock_transaction
FOR ALL TO authenticated
USING (public.has_clinic_access(clinic_id))
WITH CHECK (public.has_clinic_access(clinic_id));

-- PROCEDURES
CREATE POLICY "Acesso Tipos Procedimento" ON public.procedure_type
FOR ALL TO authenticated
USING (public.has_clinic_access(clinic_id))
WITH CHECK (public.has_clinic_access(clinic_id));

CREATE POLICY "Acesso Receitas Procedimento" ON public.procedure_recipe
FOR ALL TO authenticated
USING (
  public.has_clinic_access((SELECT clinic_id FROM public.procedure_type WHERE id = procedure_type_id))
)
WITH CHECK (
  public.has_clinic_access((SELECT clinic_id FROM public.procedure_type WHERE id = procedure_type_id))
);

COMMIT;
ALTER TABLE public.patient ADD COLUMN phone text;
