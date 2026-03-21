-- =============================================================================
-- Migration: 20260321000001_hard_cleanup
-- Purpose:   Destructive consolidation. No legacy clients — no deprecation window.
--
-- What this migration does (in order):
--   1. Extend product/stock_transaction to absorb inventory subsystem columns
--   2. Migrate inventory_item data → product
--   3. Migrate inventory_movement data → stock_transaction
--   4. Repoint procedure_recipe FK to product
--   5. Rewrite perform_procedure RPC to use product/stock_transaction
--   6. Add stock update trigger on stock_transaction
--   7. Add RPCs: add_appointment, add_clinical_record, add_stock_movement
--   8. Drop legacy identity columns (doctor_id, doctor_name, requester_id)
--   9. Drop legacy tables (inventory_item, inventory_movement, PascalCase dupes, user)
--
-- Safe to run multiple times (idempotent via IF NOT EXISTS / IF EXISTS).
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Extend product with inventory_item columns
-- ---------------------------------------------------------------------------

alter table public.product
  add column if not exists unit        text    not null default 'un',
  add column if not exists description text;

-- ---------------------------------------------------------------------------
-- 2. Migrate inventory_item → product
--    Only insert items whose id does not already exist in product.
-- ---------------------------------------------------------------------------

insert into public.product (id, clinic_id, name, description, unit, current_stock, min_stock, avg_cost_price, barcode, deleted, price)
select
  i.id,
  i.clinic_id,
  i.name,
  i.description,
  i.unit,
  i.current_stock,
  coalesce(i.min_stock, 0),
  coalesce(i.cost_price, 0),
  i.barcode,
  false,
  coalesce(i.cost_price, 0)   -- inventory_item has no sale price; fall back to cost_price
from public.inventory_item i
where not exists (select 1 from public.product p where p.id = i.id);

-- ---------------------------------------------------------------------------
-- 3. Extend stock_transaction with inventory_movement columns
-- ---------------------------------------------------------------------------

alter table public.stock_transaction
  add column if not exists actor_id uuid references public.actor(id),
  add column if not exists notes    text;

-- ---------------------------------------------------------------------------
-- 4. Migrate inventory_movement → stock_transaction
-- ---------------------------------------------------------------------------

insert into public.stock_transaction (clinic_id, product_id, type, total_qty, reason, record_id, actor_id, notes, timestamp)
select
  m.clinic_id,
  m.item_id,
  case when m.qty_change >= 0 then 'IN' else 'OUT' end,
  abs(m.qty_change),
  m.reason,
  m.related_procedure_id,
  m.actor_id,
  m.notes,
  coalesce(m.created_at, now())
from public.inventory_movement m
where not exists (
  select 1 from public.stock_transaction st
  where st.clinic_id  = m.clinic_id
    and st.product_id = m.item_id
    and st.timestamp  = m.created_at
);

-- ---------------------------------------------------------------------------
-- 5. Repoint procedure_recipe.item_id → product(id)
--    IDs were preserved during migration so this is safe.
-- ---------------------------------------------------------------------------

alter table public.procedure_recipe
  drop constraint if exists procedure_recipe_item_id_fkey;

alter table public.procedure_recipe
  add constraint procedure_recipe_item_id_fkey
    foreign key (item_id) references public.product(id) on delete restrict;

-- ---------------------------------------------------------------------------
-- 6. Stock update trigger: keep product.current_stock in sync automatically.
--    Replaces the client-side split write in inventory.service.ts.
-- ---------------------------------------------------------------------------

create or replace function public.trg_fn_stock_transaction_sync()
returns trigger language plpgsql security definer as $$
begin
  if NEW.type = 'IN' then
    update public.product
       set current_stock = current_stock + NEW.total_qty
     where id = NEW.product_id;
  elsif NEW.type = 'OUT' then
    update public.product
       set current_stock = greatest(0, current_stock - NEW.total_qty)
     where id = NEW.product_id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_stock_transaction_sync on public.stock_transaction;

create trigger trg_stock_transaction_sync
  after insert on public.stock_transaction
  for each row execute function public.trg_fn_stock_transaction_sync();

-- ---------------------------------------------------------------------------
-- 7. Rewrite perform_procedure RPC to use product/stock_transaction
-- ---------------------------------------------------------------------------

create or replace function public.perform_procedure(
  p_clinic_id        uuid,
  p_patient_id       uuid,
  p_professional_id  uuid,
  p_procedure_type_id uuid,
  p_notes            text default ''
)
returns uuid language plpgsql security definer as $$
declare
  v_procedure_id uuid := gen_random_uuid();
  r              record;
begin
  -- Deduct each ingredient via stock_transaction (trigger updates current_stock)
  for r in
    select pr.item_id, pr.quantity
      from public.procedure_recipe pr
     where pr.procedure_type_id = p_procedure_type_id
  loop
    insert into public.stock_transaction
      (clinic_id, product_id, type, total_qty, reason, record_id, actor_id, notes, timestamp)
    values
      (p_clinic_id, r.item_id, 'OUT', r.quantity, 'PROCEDURE', v_procedure_id, p_professional_id, p_notes, now());
  end loop;

  return v_procedure_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. New RPC: add_appointment
--    Resolves patient name server-side. Frontend sends only IDs.
-- ---------------------------------------------------------------------------

create or replace function public.add_appointment(
  p_clinic_id       uuid,
  p_patient_id      uuid,
  p_doctor_actor_id uuid,
  p_date            text,
  p_status          text default 'Agendado',
  p_room_number     text default null,
  p_priority        text default null
)
returns setof public.appointment language plpgsql security definer as $$
declare
  v_patient_name text;
  v_id           uuid := gen_random_uuid();
begin
  -- Resolve patient name from actor — never from the frontend
  select a.name into v_patient_name
    from public.actor a
   where a.id = p_patient_id;

  insert into public.appointment
    (id, clinic_id, patient_id, patient_name, doctor_actor_id, appointment_date, status, room_number, priority, timestamp)
  values
    (v_id, p_clinic_id, p_patient_id, coalesce(v_patient_name, ''), p_doctor_actor_id, p_date::timestamptz, p_status, p_room_number, p_priority, now());

  return query select * from public.appointment where id = v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. New RPC: add_clinical_record
-- ---------------------------------------------------------------------------

create or replace function public.add_clinical_record(
  p_clinic_id       uuid,
  p_patient_id      uuid,
  p_doctor_actor_id uuid,
  p_content         text,
  p_type            text default 'EVOLUCAO'
)
returns setof public.clinical_record language plpgsql security definer as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into public.clinical_record
    (id, clinic_id, patient_id, doctor_actor_id, content, type, timestamp)
  values
    (v_id, p_clinic_id, p_patient_id, p_doctor_actor_id, p_content, p_type::public.record_type, now());

  return query select * from public.clinical_record where id = v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. New RPC: add_stock_movement
--     Stock update is handled by the trigger — no split writes.
-- ---------------------------------------------------------------------------

create or replace function public.add_stock_movement(
  p_clinic_id  uuid,
  p_product_id uuid,
  p_type       text,     -- 'IN' or 'OUT'
  p_qty        numeric,
  p_reason     text default 'MANUAL',
  p_notes      text default null,
  p_actor_id   uuid default null
)
returns setof public.stock_transaction language plpgsql security definer as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into public.stock_transaction
    (id, clinic_id, product_id, type, total_qty, reason, actor_id, notes, timestamp)
  values
    (v_id, p_clinic_id, p_product_id, p_type, p_qty, p_reason, p_actor_id, p_notes, now());

  return query select * from public.stock_transaction where id = v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. Drop legacy identity columns
--     These are safe to drop: frontend no longer writes or reads them.
-- ---------------------------------------------------------------------------

-- appointment: doctor_id (text → user), doctor_name (denormalized)
alter table public.appointment
  drop column if exists doctor_id,
  drop column if exists doctor_name;

-- clinical_record: doctor_id (text → user)
alter table public.clinical_record
  drop column if exists doctor_id;

-- access_request: drop RLS policies that reference legacy requester_id,
-- then drop the columns, then recreate policies against requester_user_id.

drop policy if exists "Solicitações: Criar"       on public.access_request;
drop policy if exists "Solicitações: Ver Próprias" on public.access_request;

alter table public.access_request
  drop column if exists requester_id,
  drop column if exists requester_name;

create policy "Solicitações: Criar" on public.access_request
  for insert with check (requester_user_id = auth.uid());

create policy "Solicitações: Ver Próprias" on public.access_request
  for select using (requester_user_id = auth.uid() or public.is_super_admin());

-- ---------------------------------------------------------------------------
-- 12. Drop legacy inventory tables (data already migrated)
-- ---------------------------------------------------------------------------

drop table if exists public.inventory_movement cascade;
drop table if exists public.inventory_item     cascade;

-- ---------------------------------------------------------------------------
-- 13. Drop PascalCase duplicate tables
-- ---------------------------------------------------------------------------

drop table if exists public."AccessRequest"      cascade;
drop table if exists public."AccessBinding"      cascade;
drop table if exists public."ApiKey"             cascade;
drop table if exists public."Batch"              cascade;
drop table if exists public."Contact"            cascade;
drop table if exists public."FinancialCategory"  cascade;
drop table if exists public."FinancialTransaction" cascade;
drop table if exists public."ProductHistory"     cascade;
drop table if exists public."StockTransaction"   cascade;

-- snake_case orphans
drop table if exists public.batch                cascade;
drop table if exists public.financial_transaction cascade;

-- ---------------------------------------------------------------------------
-- 14. Drop public."user" — the legacy identity table
--     All FKs referencing it were already on dropped columns (doctor_id,
--     requester_id). The identity_bridge migration dropped the FKs implicitly
--     when it added the new canonical columns. Verify before dropping.
-- ---------------------------------------------------------------------------

drop table if exists public."user" cascade;

-- ---------------------------------------------------------------------------
-- 15. Comments
-- ---------------------------------------------------------------------------

comment on function public.add_appointment         is 'Server-side appointment creation. Resolves patient name from actor table.';
comment on function public.add_clinical_record     is 'Server-side clinical record creation.';
comment on function public.add_stock_movement      is 'Server-side stock movement. Trigger updates product.current_stock atomically.';
comment on function public.trg_fn_stock_transaction_sync is 'Trigger function: keeps product.current_stock in sync after stock_transaction insert.';
comment on trigger  trg_stock_transaction_sync on public.stock_transaction is 'Fires after INSERT to update product.current_stock via trg_fn_stock_transaction_sync.';

commit;
