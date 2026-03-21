# Cleanup & Consolidation Plan — Hard Cut

_Authored: 2026-03-21_
_Context: Projeto novo, sem clientes legados. Limpeza destrutiva autorizada._

---

## Princípios desta fase

1. **Nenhuma lógica de negócio no frontend** — o frontend apenas chama RPCs e lê views.
2. **Um modelo de inventário** — `product` absorve `inventory_item`. `stock_transaction` absorve `inventory_movement`.
3. **Zero tabelas PascalCase** — todas as duplicatas são removidas.
4. **Zero referência a `public."user"`** — identidade converge em `actor` + `app_user`.
5. **Tipos gerados, não manuais** — `src/types/supabase.ts` gerado pelo CLI, importado por todos os services.

---

## Migration destrutiva: `20260321000001_hard_cleanup`

### 1. Remover tabelas legacy PascalCase + snake_case órfãs

```sql
drop table if exists public."AccessRequest"   cascade;
drop table if exists public."AccessBinding"   cascade;
drop table if exists public."ApiKey"          cascade;
drop table if exists public."Batch"           cascade;
drop table if exists public."Contact"         cascade;
drop table if exists public."FinancialCategory" cascade;
drop table if exists public."FinancialTransaction" cascade;
drop table if exists public."ProductHistory"  cascade;
drop table if exists public."StockTransaction" cascade;
drop table if exists public.batch             cascade;
drop table if exists public.financial_transaction cascade;
```

### 2. Migrar `inventory_item` → `product`

`inventory_item` tem colunas que `product` não tem: `unit`, `description`, `cost_price` (vs `avg_cost_price`).
`product` tem colunas que `inventory_item` não tem: `barcode`, `price`, `deleted`.

**Estratégia**: adicionar `unit` e `description` em `product`, depois copiar dados, depois dropar `inventory_item`.

```sql
-- Adicionar colunas faltantes em product
alter table product add column if not exists unit text default 'un';
alter table product add column if not exists description text;

-- Migrar dados de inventory_item para product
insert into product (id, clinic_id, name, description, unit, current_stock, min_stock, avg_cost_price, deleted, barcode)
select id, clinic_id, name, description, unit, current_stock, min_stock, cost_price, false, barcode
from inventory_item
on conflict (id) do nothing;
```

### 3. Migrar `inventory_movement` → `stock_transaction`

`inventory_movement` tem: `item_id`, `qty_change`, `reason` (enum), `related_procedure_id`, `actor_id`, `notes`.
`stock_transaction` tem: `product_id`, `total_qty`, `type`, `reason` (text), `record_id`.

**Mapeamento**:
- `item_id` → `product_id`
- `qty_change` → `total_qty` (positivo=IN, negativo=OUT)
- `reason` → `type` (PURCHASE→IN, LOSS/PROCEDURE→OUT) + `reason` (text)
- `related_procedure_id` → `record_id`
- `actor_id` → nova coluna `actor_id` em `stock_transaction`

```sql
-- Adicionar colunas faltantes em stock_transaction
alter table stock_transaction add column if not exists actor_id uuid references actor(id);
alter table stock_transaction add column if not exists notes text;

-- Migrar movimentos
insert into stock_transaction (clinic_id, product_id, type, total_qty, reason, record_id, actor_id, notes, timestamp)
select
  clinic_id,
  item_id,
  case when qty_change > 0 then 'IN' else 'OUT' end,
  abs(qty_change),
  reason,
  related_procedure_id,
  actor_id,
  notes,
  created_at
from inventory_movement
on conflict do nothing;
```

### 4. Atualizar `procedure_recipe` para referenciar `product`

```sql
-- procedure_recipe.item_id já é uuid e aponta para inventory_item(id)
-- Como migramos inventory_item → product com mesmo id, o FK pode ser repontado
alter table procedure_recipe
  drop constraint if exists procedure_recipe_item_id_fkey,
  add constraint procedure_recipe_item_id_fkey
    foreign key (item_id) references product(id) on delete restrict;
```

### 5. Remover tabelas de inventário legado

```sql
drop table if exists inventory_movement cascade;
drop table if exists inventory_item     cascade;
```

### 6. Remover colunas legadas de identidade

```sql
-- appointment
alter table appointment
  drop column if exists doctor_id,
  drop column if exists doctor_name;

-- clinical_record
alter table clinical_record
  drop column if exists doctor_id;

-- access_request
alter table access_request
  drop column if exists requester_id,
  drop column if exists requester_name;
```

### 7. Remover `public."user"`

```sql
drop table if exists public."user" cascade;
```

---

## RPCs novos (lógica sai do frontend)

### `add_appointment(p_clinic_id, p_patient_id, p_doctor_actor_id, p_date, p_status, p_room_number)`
- Busca `patient_name` via JOIN `actor` — não recebe do frontend
- Insere em `appointment`
- Retorna a row completa com JOIN já resolvido

### `add_clinical_record(p_clinic_id, p_patient_id, p_doctor_actor_id, p_content, p_type)`
- Insere em `clinical_record`
- Retorna a row

### `add_stock_movement(p_clinic_id, p_product_id, p_type, p_qty, p_reason, p_notes)`
- Insere em `stock_transaction`
- Atualiza `product.current_stock` atomicamente (trigger ou inline)
- Retorna a row

### Trigger `trg_stock_transaction_update_stock`
- `AFTER INSERT ON stock_transaction`
- Incrementa/decrementa `product.current_stock` baseado em `type` e `total_qty`
- Substitui o client-side split write que existe hoje em `inventory.service.ts`

---

## Frontend: estrutura de services após refatoração

```
core/services/
  supabase.service.ts        ← apenas o client (já existe)
  auth.service.ts            ← auth state (já existe)
  clinic.service.ts          ← seleção de clínica, lista de clínicas
  appointment.service.ts     ← chama add_appointment RPC, lê signal
  clinical-record.service.ts ← chama add_clinical_record RPC, lê signal
  patient.service.ts         ← chama create_patient_with_actor RPC (já existe, limpar)
  inventory.service.ts       ← chama add_stock_movement RPC, produto CRUD
  access.service.ts          ← access requests, aprovação
  social.service.ts          ← social posts
  user.service.ts            ← saveUser (já usa RPCs)

core/types/
  supabase.ts                ← GERADO pelo CLI (supabase gen types)
  app.types.ts               ← tipos de UI derivados dos tipos gerados
```

`database.service.ts` é dissolvido. Os signals globais (`appointments`, `clinicalRecords`, etc.)
migram para seus respectivos feature services.

---

## O que o frontend para de fazer (regra "sem lógica no front")

| Operação | Antes | Depois |
|---|---|---|
| Buscar nome do paciente | JOIN manual no service | RPC retorna já resolvido |
| Atualizar stock após movimento | 2 writes no cliente | Trigger no banco |
| Calcular tipo de movimento (IN/OUT) | `qty_change > 0` no cliente | RPC recebe `type` explícito |
| Montar `doctor_name` | `currentUser()?.name` no service | Removido (coluna dropped) |
| Fallback entre tabelas | try canonical, try legacy | Não existe mais |
| `timestamp: new Date().toISOString()` | Frontend | `DEFAULT now()` no banco |

---

## Ordem de execução

1. Backup remoto (`pg_dump` via pooler)
2. `git checkout -b feat/hard-cleanup`
3. Escrever migration `20260321000001_hard_cleanup.sql`
4. Escrever RPCs e trigger no mesmo arquivo de migration
5. `supabase db push --linked` (com confirmação)
6. `supabase gen types typescript --linked > frontend/src/types/supabase.ts`
7. Refatorar frontend: novos services, remover `database.service.ts`
8. `tsc --noEmit` → zero erros
9. `git add -A && git commit`
10. `gh pr create`
11. Atualizar docs

---

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| `procedure_recipe.item_id` quebra ao referenciar `product` | IDs migrados de `inventory_item` → `product` com mesmo UUID |
| `perform_procedure` RPC referencia `inventory_item` | Reescrever para usar `product`/`stock_transaction` |
| `stock_transaction.current_stock` diverge | Trigger recalcula; migration recalcula valor inicial via UPDATE |
| `actor_id` em `stock_transaction` — quem é o ator? | `app_user.actor_id` do usuário logado, passado via RPC |
