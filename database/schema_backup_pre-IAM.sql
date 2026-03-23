-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

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
CREATE TABLE public.app_user (
  id uuid NOT NULL,
  email text,
  role text,
  iam_bindings jsonb,
  assigned_room text,
  name text NOT NULL,
  CONSTRAINT app_user_pkey PRIMARY KEY (id),
  CONSTRAINT app_user_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
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
  doctor_id uuid,
  duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes > 0 AND duration_minutes <= 480),
  CONSTRAINT appointment_pkey PRIMARY KEY (id),
  CONSTRAINT appointment_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinic(id),
  CONSTRAINT appointment_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient(id),
  CONSTRAINT appointment_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.app_user(id)
);
CREATE TABLE public.clinic (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  plan text DEFAULT 'Starter'::text,
  status text DEFAULT 'active'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT clinic_pkey PRIMARY KEY (id)
);
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
CREATE TABLE public.clinical_record (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  content text NOT NULL,
  type USER-DEFINED DEFAULT 'EVOLUCAO'::record_type,
  timestamp timestamp with time zone DEFAULT now(),
  doctor_id uuid,
  CONSTRAINT clinical_record_pkey PRIMARY KEY (id),
  CONSTRAINT clinical_record_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinic(id),
  CONSTRAINT clinical_record_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient(id),
  CONSTRAINT clinical_record_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.app_user(id)
);
CREATE TABLE public.patient (
  id uuid NOT NULL,
  clinic_id uuid NOT NULL,
  cpf text,
  birth_date date,
  gender text,
  updated_at timestamp with time zone DEFAULT now(),
  name text NOT NULL,
  CONSTRAINT patient_pkey PRIMARY KEY (id),
  CONSTRAINT patient_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinic(id)
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
CREATE TABLE public.stock_transaction (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  product_id uuid NOT NULL,
  record_id uuid,
  type text CHECK (type = ANY (ARRAY['IN'::text, 'OUT'::text])),
  total_qty integer NOT NULL,
  reason text,
  timestamp timestamp with time zone DEFAULT now(),
  user_id uuid,
  notes text,
  CONSTRAINT stock_transaction_pkey PRIMARY KEY (id),
  CONSTRAINT stock_transaction_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinic(id),
  CONSTRAINT stock_transaction_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(id),
  CONSTRAINT stock_transaction_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_user(id)
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
