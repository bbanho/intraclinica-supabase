-- Migration: Flatten Actor Model & Optimize RLS

-- 1. Add 'name' column to app_user and patient
ALTER TABLE public.app_user ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.patient ADD COLUMN IF NOT EXISTS name text;

-- 2. Migrate data from actor to app_user and patient
UPDATE public.app_user u
SET name = a.name
FROM public.actor a
WHERE u.actor_id = a.id;

UPDATE public.patient p
SET name = a.name
FROM public.actor a
WHERE p.id = a.id;

-- Provide fallback names for any nulls to satisfy NOT NULL constraints
UPDATE public.app_user SET name = 'Unknown User' WHERE name IS NULL;
UPDATE public.patient SET name = 'Unknown Patient' WHERE name IS NULL;

ALTER TABLE public.app_user ALTER COLUMN name SET NOT NULL;
ALTER TABLE public.patient ALTER COLUMN name SET NOT NULL;

-- 3. Drop foreign keys referencing actor
ALTER TABLE public.app_user DROP CONSTRAINT IF EXISTS app_user_actor_id_fkey;
ALTER TABLE public.patient DROP CONSTRAINT IF EXISTS patient_id_fkey;
ALTER TABLE public.appointment DROP CONSTRAINT IF EXISTS appointment_doctor_actor_id_fkey;
ALTER TABLE public.clinical_record DROP CONSTRAINT IF EXISTS clinical_record_doctor_actor_id_fkey;
ALTER TABLE public.stock_transaction DROP CONSTRAINT IF EXISTS stock_transaction_actor_id_fkey;

-- 4. Re-wire appointment, clinical_record, and stock_transaction to point to app_user instead of actor

-- 4.1 First, DROP the trigger on appointment so it doesn't fire and crash during the UPDATE
DROP TRIGGER IF EXISTS trg_appointment_conflict_check ON public.appointment;

-- 4.2 Rename columns
ALTER TABLE public.appointment RENAME COLUMN doctor_actor_id TO doctor_id;
ALTER TABLE public.clinical_record RENAME COLUMN doctor_actor_id TO doctor_id;
ALTER TABLE public.stock_transaction RENAME COLUMN actor_id TO user_id;

-- 4.3 SAFETY MEASURE: Clean orphaned references (mock data where an actor was created without an app_user)
-- Since the trigger is dropped, this UPDATE will run safely
UPDATE public.appointment SET doctor_id = NULL WHERE doctor_id NOT IN (SELECT id FROM public.app_user);
UPDATE public.clinical_record SET doctor_id = NULL WHERE doctor_id NOT IN (SELECT id FROM public.app_user);
UPDATE public.stock_transaction SET user_id = NULL WHERE user_id NOT IN (SELECT id FROM public.app_user);

-- 4.4 Apply new Foreign Keys
ALTER TABLE public.appointment ADD CONSTRAINT appointment_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.app_user(id) ON DELETE RESTRICT;
ALTER TABLE public.clinical_record ADD CONSTRAINT clinical_record_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.app_user(id) ON DELETE RESTRICT;
ALTER TABLE public.stock_transaction ADD CONSTRAINT stock_transaction_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_user(id) ON DELETE RESTRICT;

-- 4.5 Fix the EXCLUDE constraint in appointment that referenced doctor_actor_id
ALTER TABLE public.appointment DROP CONSTRAINT IF EXISTS appointment_no_doctor_overlap;
ALTER TABLE public.appointment
  ADD CONSTRAINT appointment_no_doctor_overlap
  EXCLUDE USING gist (
    doctor_id WITH =,
    tstzrange(
      appointment_date,
      public.calc_appointment_end(appointment_date, duration_minutes),
      '[)'
    ) WITH &&
  )
  WHERE (doctor_id IS NOT NULL AND status <> ALL (ARRAY['Cancelado'::text, 'Realizado'::text]));

-- 4.6 Recreate the conflict trigger function using the new column name "doctor_id"
CREATE OR REPLACE FUNCTION public.trg_fn_appointment_conflict_check()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
declare
  v_conflict record;
begin
  if NEW.status in ('Cancelado', 'Realizado') then return NEW; end if;
  if NEW.doctor_id is null then return NEW; end if;

  select id, patient_name, appointment_date, duration_minutes
    into v_conflict
    from public.appointment
   where doctor_id = NEW.doctor_id
     and id <> coalesce(OLD.id, '00000000-0000-0000-0000-000000000000'::uuid)
     and status not in ('Cancelado', 'Realizado')
     and tstzrange(appointment_date, public.calc_appointment_end(appointment_date, duration_minutes), '[)')
      && tstzrange(NEW.appointment_date, public.calc_appointment_end(NEW.appointment_date, NEW.duration_minutes), '[)')
   limit 1;

  if found then
    raise exception
      'Conflito de horario: o medico ja possui um agendamento com "%" as % (duracao: % min). Escolha outro horario ou medico.',
      v_conflict.patient_name,
      to_char(v_conflict.appointment_date at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI'),
      v_conflict.duration_minutes
      using errcode = 'P0001';
  end if;

  return NEW;
end;
$$;

-- 4.7 Recreate the trigger itself
CREATE TRIGGER trg_appointment_conflict_check
  BEFORE INSERT OR UPDATE OF doctor_id, appointment_date, duration_minutes, status
  ON public.appointment
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_appointment_conflict_check();

-- 5. Drop the actor table and its enum type
DROP TABLE IF EXISTS public.actor CASCADE;
DROP TYPE IF EXISTS public.actor_type CASCADE;

-- Clean up obsolete columns
ALTER TABLE public.app_user DROP COLUMN IF EXISTS actor_id;

-- 6. Optimize RLS Security Definer Functions (Caching auth.uid)
CREATE OR REPLACE FUNCTION public.has_clinic_access(target_clinic_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT exists (
    SELECT 1 FROM public.app_user
    WHERE id = (select auth.uid()) 
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
    WHERE id = (select auth.uid())
      AND (
        role = 'SUPER_ADMIN' 
        OR iam_bindings->target_clinic_id::text ? target_role
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT exists (
    SELECT 1 FROM public.app_user
    WHERE id = (select auth.uid()) AND role = 'SUPER_ADMIN'
  );
$$;

-- 7. Add GIN index for JSONB performance
CREATE INDEX IF NOT EXISTS idx_app_user_iam_bindings_gin ON public.app_user USING GIN (iam_bindings);

-- 8. Drop Obsolete RPCs
DROP FUNCTION IF EXISTS public.create_patient_with_actor(uuid, text, text, date, text);
DROP FUNCTION IF EXISTS public.create_user_with_actor(uuid, text, text, text, text, jsonb, text);
DROP FUNCTION IF EXISTS public.update_user_with_actor(uuid, text, text, jsonb, text);
DROP FUNCTION IF EXISTS public.add_appointment(uuid, uuid, uuid, text, text, text, text);
DROP FUNCTION IF EXISTS public.add_appointment(uuid, uuid, uuid, text, text, text, text, integer);
DROP FUNCTION IF EXISTS public.add_clinical_record(uuid, uuid, uuid, text, text);

-- 9. New RPC for Atomic Inventory Creation
CREATE OR REPLACE FUNCTION public.create_product_with_stock(
  p_clinic_id uuid,
  p_name text,
  p_category text,
  p_price numeric,
  p_cost numeric,
  p_min_stock integer,
  p_current_stock integer,
  p_barcode text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_product_id uuid;
  v_product_result jsonb;
BEGIN
  -- Check permission
  IF NOT public.has_clinic_access(p_clinic_id) THEN
    RAISE EXCEPTION 'Access denied to clinic %', p_clinic_id;
  END IF;

  -- 1. Insert product (current_stock forced to 0 temporarily to allow trigger math)
  INSERT INTO public.product (
    clinic_id, name, category, price, avg_cost_price, 
    min_stock, current_stock, barcode
  )
  VALUES (
    p_clinic_id, p_name, p_category, p_price, p_cost, 
    p_min_stock, 0, p_barcode
  )
  RETURNING id INTO v_product_id;

  -- 2. Insert initial stock transaction if > 0
  IF p_current_stock > 0 THEN
    INSERT INTO public.stock_transaction (
      clinic_id, product_id, type, total_qty, reason, notes, user_id
    )
    VALUES (
      p_clinic_id, v_product_id, 'IN', p_current_stock, 'INITIAL_STOCK', 'Estoque inicial', (select auth.uid())
    );
  END IF;

  -- 3. Return product
  SELECT to_jsonb(p) INTO v_product_result FROM public.product p WHERE id = v_product_id;
  RETURN v_product_result;
END;
$$;

