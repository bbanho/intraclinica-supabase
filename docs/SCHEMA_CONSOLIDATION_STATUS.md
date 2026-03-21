# Schema Consolidation Status

_Last updated: 2026-03-21_

## Current State: Hard Cleanup Applied ✅

All migrations have been applied to the remote database (`prolahgqlwfriwfpzjdm`).
Legacy tables, legacy columns, and legacy PascalCase duplicates have been removed.
The frontend service layer has been realigned to the canonical schema.

---

## Remote Schema — Canonical Tables (post hard_cleanup)

| Table | Notes |
|---|---|
| `clinic` | Multi-tenant root |
| `actor` | Domain identity root (users + patients) |
| `app_user` | Auth-linked user, references `auth.users(id)` |
| `patient` | References `actor(id)` |
| `appointment` | Uses `doctor_actor_id uuid` (legacy `doctor_id`/`doctor_name` removed) |
| `clinical_record` | Uses `doctor_actor_id uuid` (legacy `doctor_id` removed) |
| `access_request` | Uses `requester_user_id uuid` (legacy `requester_id`/`requester_name` removed) |
| `product` | Canonical inventory (absorbed `inventory_item`) |
| `stock_transaction` | Stock movements (absorbed `inventory_movement`); trigger syncs `product.current_stock` |
| `social_post` | Content/marketing |
| `procedure_type` | Procedure catalogue |
| `procedure_recipe` | Procedure → consumable mapping |

## Removed (hard_cleanup migration)

| Object | Type | Reason |
|---|---|---|
| `public."user"` | Table | Text-id identity — superseded by `app_user` + `actor` |
| `inventory_item` | Table | Absorbed into `product` |
| `inventory_movement` | Table | Absorbed into `stock_transaction` |
| `financial_transaction` | Table | No frontend consumer; no migration path defined |
| `batch` | Table | Orphan, no consumer |
| `AccessRequest`, `AccessBinding`, `ApiKey`, `Batch`, `Contact`, `FinancialCategory`, `FinancialTransaction`, `ProductHistory`, `StockTransaction` | Tables (PascalCase) | Legacy duplicates |
| `appointment.doctor_id`, `appointment.doctor_name` | Columns | Superseded by `doctor_actor_id` |
| `clinical_record.doctor_id` | Column | Superseded by `doctor_actor_id` |
| `access_request.requester_id`, `access_request.requester_name` | Columns | Superseded by `requester_user_id` |

---

## Migration History

| Migration | Status | Notes |
|---|---|---|
| `20260117121134` | Applied | Initial remote baseline |
| `20260321000000_identity_bridge` | Applied ✅ | Added bridge columns (`doctor_actor_id`, `requester_user_id`), indexes, FKs |
| `20260321000001_hard_cleanup` | Applied ✅ | Removed all legacy tables, PascalCase duplicates, and legacy columns |

---

## Available RPCs

| RPC | Status |
|---|---|
| `create_user_with_actor` | Active — used by frontend `saveUser` |
| `update_user_with_actor` | Active — used by frontend `saveUser` |
| `create_patient_with_actor` | Active — used by frontend `addPatient` |
| `add_appointment` | Active — used by `database.service.ts` |
| `add_clinical_record` | Active — used by `database.service.ts` |
| `add_stock_movement` | Active — used by `inventory.service.ts` |
| `perform_procedure` | Active — procedural subsystem |
| `has_permission` | Active — IAM check |
| `is_super_admin` | Active — IAM check |

---

## Frontend Service Layer (post hard_cleanup)

- `database.service.ts` — uses RPCs `add_appointment`, `add_clinical_record`; no legacy column writes
- `inventory.service.ts` — fully rewritten against `product`/`stock_transaction`; uses `add_stock_movement` RPC
- `patient.service.ts` — removed all fallbacks to legacy plural table names
- `inventory.types.ts` — `InventoryItem` maps to `product` columns (`avg_cost_price`, `price`, `barcode`)
- `supabase.ts` — regenerated from live schema (no legacy tables present)
- `tsc --noEmit` passes with zero errors ✅
