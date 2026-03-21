-- 🏥 INTRACLINICA: INVENTORY GUARDIAN (Auditavel)
-- Data: 2026-02-16
-- Objetivo: Criar controle de estoque atrelado a procedimentos médicos.

-- 1. Tabela de Insumos (O que temos no estoque?)
create table public.inventory_item (
  id uuid default gen_random_uuid() primary key,
  clinic_id uuid references public.clinic(id) not null,
  name text not null,
  description text,
  barcode text, -- EAN-13, SKU ou interno
  unit text not null default 'un', -- un, ml, mg, cx
  current_stock numeric(10,2) not null default 0,
  min_stock numeric(10,2) default 0, -- Ponto de recompra
  cost_price numeric(10,2) default 0, -- Custo médio
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Tabela de Movimentação (O Rastro Inauditável)
create table public.inventory_movement (
  id uuid default gen_random_uuid() primary key,
  clinic_id uuid references public.clinic(id) not null,
  item_id uuid references public.inventory_item(id) not null,
  qty_change numeric(10,2) not null, -- Positivo (entrada) ou Negativo (saída)
  reason text not null check (reason in ('PURCHASE', 'PROCEDURE', 'CORRECTION', 'LOSS', 'RETURN')),
  related_procedure_id uuid, -- Link para o procedimento clínico (se houver)
  actor_id uuid references public.actor(id), -- Quem fez a movimentação?
  notes text,
  created_at timestamptz default now()
);

-- 3. Tabela de Tipos de Procedimento (O Cardápio de Serviços)
create table public.procedure_type (
  id uuid default gen_random_uuid() primary key,
  clinic_id uuid references public.clinic(id) not null,
  name text not null,
  code text, -- TUSS/AMB/Interno
  price numeric(10,2) not null default 0,
  active boolean default true,
  created_at timestamptz default now()
);

-- 4. Tabela de Receita do Procedimento (O Segredo da Auditoria)
-- "Para fazer 1 Sutura (procedure_type), gasto 1 Fio (inventory_item) e 2 Gazes"
create table public.procedure_recipe (
  id uuid default gen_random_uuid() primary key,
  procedure_type_id uuid references public.procedure_type(id) not null,
  item_id uuid references public.inventory_item(id) not null,
  quantity numeric(10,2) not null default 1, -- Quanto consome por procedimento?
  created_at timestamptz default now(),
  unique(procedure_type_id, item_id)
);

-- RLS (Row Level Security) - Soberania por Clínica
alter table public.inventory_item enable row level security;
alter table public.inventory_movement enable row level security;
alter table public.procedure_type enable row level security;
alter table public.procedure_recipe enable row level security;

-- Policies (Exemplo Básico - Refinar depois com auth.uid())
-- create policy "Clinics can only see their own items" on inventory_item
--   for all using (clinic_id = (select clinic_id from app_user where id = auth.uid()));

-- Função RPC: Realizar Procedimento e Baixar Estoque
create or replace function public.perform_procedure(
  p_clinic_id uuid,
  p_patient_id uuid,
  p_professional_id uuid, -- Actor ID do médico
  p_procedure_type_id uuid,
  p_notes text
) returns uuid language plpgsql security definer as $$
declare
  v_procedure_id uuid;
  v_recipe record;
begin
  -- 1. Criar registro do procedimento (Faturamento/Prontuário)
  -- (Assumindo existência de clinical_procedure ou similar - criar se não existir)
  -- insert into clinical_procedure (...) returning id into v_procedure_id;
  
  -- (Stub para demonstração - Ajustar com tabela real de procedimentos executados)
  v_procedure_id := gen_random_uuid(); 

  -- 2. Iterar sobre a receita do procedimento
  for v_recipe in select * from procedure_recipe where procedure_type_id = p_procedure_type_id loop
    
    -- 2.1 Baixar estoque
    update inventory_item
    set current_stock = current_stock - v_recipe.quantity,
        updated_at = now()
    where id = v_recipe.item_id;

    -- 2.2 Registrar movimento (Auditoria)
    insert into inventory_movement (clinic_id, item_id, qty_change, reason, related_procedure_id, actor_id, notes)
    values (
      p_clinic_id,
      v_recipe.item_id,
      -v_recipe.quantity, -- Negativo pois é saída
      'PROCEDURE',
      v_procedure_id,
      p_professional_id,
      'Auto-deduction via procedure: ' || p_procedure_type_id
    );
    
  end loop;

  return v_procedure_id;
end;
$$;
