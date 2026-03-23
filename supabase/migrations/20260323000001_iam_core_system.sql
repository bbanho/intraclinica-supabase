-- Migration: IAM Core System (Cloud Console Pattern)
-- Description: Creates the foundation for the 1. Role -> 2. Grant -> 3. Block IAM architecture.

-- 1. Tabela de Permissões (Catálogo de Ações Atômicas)
CREATE TABLE IF NOT EXISTS public.iam_permissions (
    id VARCHAR(100) PRIMARY KEY, -- ex: 'inventory.view_cost'
    module VARCHAR(50) NOT NULL, -- ex: 'inventory', 'clinical'
    name VARCHAR(100) NOT NULL,
    description TEXT
);

-- 2. Tabela de Papéis (Pacotes Base com Nível Hierárquico)
CREATE TABLE IF NOT EXISTS public.iam_roles (
    id VARCHAR(50) PRIMARY KEY, -- ex: 'roles/doctor'
    name VARCHAR(100) NOT NULL,
    level INTEGER NOT NULL, -- Hierarquia: 0 (Super), 10 (Admin), 20 (Doctor), 30 (Reception)
    default_grants VARCHAR(100)[] DEFAULT '{}', -- Array de IDs de iam_permissions
    description TEXT
);

-- Habilitar RLS para leitura pública autenticada (são tabelas de dicionário estático)
ALTER TABLE public.iam_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iam_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dicionários IAM são públicos para leitura" 
ON public.iam_permissions FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Dicionários Roles são públicos para leitura" 
ON public.iam_roles FOR SELECT USING (auth.role() = 'authenticated');

-- 3. Inserir Permissões Descobertas no Estudo de Campo
INSERT INTO public.iam_permissions (id, module, name, description) VALUES
-- Reception / Patients
('appointments.read', 'reception', 'Ver Agenda', 'Visualizar horários e consultas.'),
('appointments.write', 'reception', 'Gerenciar Agenda', 'Criar, editar e cancelar consultas.'),
('appointments.call', 'reception', 'Chamar Paciente', 'Alterar status para Chamado e definir sala.'),
('patients.read_demographics', 'patients', 'Ver Cadastro do Paciente', 'Ver nome, CPF e contatos.'),
('patients.write', 'patients', 'Gerenciar Pacientes', 'Cadastrar e editar dados demográficos.'),
-- Clinical
('clinical.read_records', 'clinical', 'Ver Prontuário', 'Ler histórico clínico, evoluções e exames.'),
('clinical.write', 'clinical', 'Atendimento Clínico', 'Criar evoluções, receitas e atestados.'),
('clinical.perform_procedure', 'clinical', 'Realizar Procedimento', 'Executar procedimento que debita estoque.'),
-- AI
('ai.use', 'ai', 'Utilizar Inteligência Artificial', 'Acesso aos recursos de formatação e transcrição via LLM.'),
-- Inventory
('inventory.read', 'inventory', 'Ver Estoque Base', 'Ver lista de produtos e quantidades.'),
('inventory.write', 'inventory', 'Operar Estoque', 'Dar baixa, adicionar itens e editar cadastro básico.'),
('inventory.view_cost', 'inventory', 'Ver Custos do Estoque', 'Visualizar preço de custo e fornecedores.'),
-- Finance & Reports
('finance.read', 'finance', 'Ver Dashboards Financeiros', 'Acesso a métricas e DRE.'),
('marketing.write', 'marketing', 'Gerar Marketing', 'Criar posts e campanhas.'),
-- Admin
('users.manage', 'admin', 'Gerenciar Equipe', 'Adicionar usuários e gerenciar permissões (respeitando a hierarquia).'),
('clinics.manage', 'admin', 'Configurações da Clínica', 'Editar dados do tenant.')
ON CONFLICT (id) DO NOTHING;

-- 4. Inserir Papéis Base (Roles) e seus Níveis de Delegação
INSERT INTO public.iam_roles (id, name, level, default_grants, description) VALUES
('roles/super_admin', 'Super Admin SaaS', 0, 
  ARRAY['users.manage', 'clinics.manage', 'finance.read'], 
  'Acesso global de infraestrutura SaaS. Não vê dados clínicos por padrão.'),

('roles/clinic_admin', 'Administrador da Clínica', 10, 
  ARRAY['appointments.read', 'appointments.write', 'patients.read_demographics', 'patients.write', 'inventory.read', 'inventory.write', 'inventory.view_cost', 'finance.read', 'marketing.write', 'users.manage', 'clinics.manage'], 
  'Dono/Gestor da clínica. Acesso total administrativo.'),

('roles/doctor', 'Médico / Especialista', 20, 
  ARRAY['appointments.read', 'appointments.call', 'patients.read_demographics', 'clinical.read_records', 'clinical.write', 'clinical.perform_procedure', 'ai.use', 'inventory.read'], 
  'Corpo clínico. Focado no atendimento e prontuário.'),

('roles/stock_manager', 'Gestor de Estoque', 30, 
  ARRAY['inventory.read', 'inventory.write', 'inventory.view_cost'], 
  'Focado em suprimentos e compras. Não vê pacientes.'),

('roles/reception', 'Recepção / Secretariado', 40, 
  ARRAY['appointments.read', 'appointments.write', 'patients.read_demographics', 'patients.write', 'inventory.read'], 
  'Focado em agenda e acolhimento.')
ON CONFLICT (id) DO UPDATE SET default_grants = EXCLUDED.default_grants, level = EXCLUDED.level;

-- 5. Função de Resolução IAM Core (Ultra-rápida para uso no RLS)
CREATE OR REPLACE FUNCTION public.has_permission(
  p_user_uuid UUID, 
  p_clinic_id UUID, 
  p_permission VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
  v_bindings JSONB;
  v_roles VARCHAR[];
  v_has_grant BOOLEAN;
  v_has_block BOOLEAN;
  v_role_grant_count INT;
BEGIN
  -- Busca o JSONB de bindings do usuario
  SELECT iam_bindings INTO v_bindings 
  FROM public.app_user 
  WHERE id = p_user_uuid;

  IF v_bindings IS NULL THEN
    RETURN FALSE;
  END IF;

  ---------------------------------------------------------
  -- AVALIAÇÃO DO CONTEXTO LOCAL (CLÍNICA)
  ---------------------------------------------------------
  IF p_clinic_id IS NOT NULL AND v_bindings ? p_clinic_id::TEXT THEN
    
    -- 1. Verifica BLOCKS locais explícitos (Cherry-picked Block)
    SELECT EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(v_bindings->p_clinic_id::TEXT->'blocks') AS b WHERE b = p_permission
    ) INTO v_has_block;
    
    IF v_has_block THEN RETURN FALSE; END IF; -- Block tem precedência absoluta

    -- 2. Verifica GRANTS locais explícitos (Cherry-picked Grant)
    SELECT EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(v_bindings->p_clinic_id::TEXT->'grants') AS g WHERE g = p_permission
    ) INTO v_has_grant;

    IF v_has_grant THEN RETURN TRUE; END IF;

    -- 3. Verifica se alguma das ROLES locais do usuário possui a permissão no Dicionário
    SELECT ARRAY(SELECT jsonb_array_elements_text(v_bindings->p_clinic_id::TEXT->'roles')) INTO v_roles;
    
    IF array_length(v_roles, 1) > 0 THEN
      SELECT count(*) INTO v_role_grant_count
      FROM public.iam_roles
      WHERE id = ANY(v_roles) AND p_permission = ANY(default_grants);
      
      IF v_role_grant_count > 0 THEN RETURN TRUE; END IF;
    END IF;

  END IF;

  ---------------------------------------------------------
  -- AVALIAÇÃO DO CONTEXTO GLOBAL (SaaS)
  ---------------------------------------------------------
  IF v_bindings ? 'global' THEN
    
    -- 1. Verifica BLOCKS globais
    SELECT EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(v_bindings->'global'->'blocks') AS b WHERE b = p_permission
    ) INTO v_has_block;
    
    IF v_has_block THEN RETURN FALSE; END IF;

    -- 2. Verifica GRANTS globais
    SELECT EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(v_bindings->'global'->'grants') AS g WHERE g = p_permission
    ) INTO v_has_grant;

    IF v_has_grant THEN RETURN TRUE; END IF;

    -- 3. Verifica ROLES globais
    SELECT ARRAY(SELECT jsonb_array_elements_text(v_bindings->'global'->'roles')) INTO v_roles;
    
    IF array_length(v_roles, 1) > 0 THEN
      SELECT count(*) INTO v_role_grant_count
      FROM public.iam_roles
      WHERE id = ANY(v_roles) AND p_permission = ANY(default_grants);
      
      IF v_role_grant_count > 0 THEN RETURN TRUE; END IF;
    END IF;

  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
