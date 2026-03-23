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
