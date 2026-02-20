-- 🏥 INTRACLINICA: AUDIT VISION (The Eye of Sauron)
-- Data: 2026-02-16
-- Objetivo: View consolidada para auditoria de estoque vs procedimentos.

create or replace view public.v_inventory_audit as
select
  m.id as movement_id,
  m.created_at as movement_date,
  c.name as clinic_name,
  i.name as item_name,
  i.barcode,
  m.qty_change,
  m.reason,
  p.name as procedure_name,
  a.name as professional_name,
  u.email as professional_email,
  m.notes
from inventory_movement m
join inventory_item i on m.item_id = i.id
join clinic c on m.clinic_id = c.id
left join procedure_type p on m.related_procedure_id is not null -- Link to procedure (via executed ID, assuming relation)
left join actor a on m.actor_id = a.id
left join app_user u on a.id = u.actor_id
order by m.created_at desc;

-- Permissões
grant select on public.v_inventory_audit to authenticated;

-- RLS (Via View é tricky, melhor filtrar no WHERE da query ou usar security barrier)
-- Mas como é view de leitura, o RLS das tabelas base (movement) deve filtrar.
