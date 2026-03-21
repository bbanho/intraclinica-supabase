# Schema Consolidation Status

_Last updated: 2026-03-21_

## Current State: Identity Bridge Applied ✅

The `identity_bridge` migration (`20260321000000`) has been applied to the remote database.
All legacy fallback paths have been removed from the frontend service layer.
The legacy `intraclinica-angular/` directory has been archived.

---

## Remote Schema Inventory (post identity_bridge)

### Canonical tables (keep, build on)
| Table | Notes |
|---|---|
| `clinic` | Multi-tenant root |
| `actor` | Domain identity root (users + patients) |
| `app_user` | Auth-linked user, references `auth.users(id)` |
| `patient` | References `actor(id)` |
| `appointment` | Now has `doctor_actor_id uuid` ✅ |
| `clinical_record` | Now has `doctor_actor_id uuid` ✅ |
| `access_request` | Now has `requester_user_id uuid` ✅ |
| `product` | Operational inventory |
| `stock_transaction` | Stock movements |
| `social_post` | Content/marketing |
| `financial_transaction` | Financial records |

### Procedural subsystem (keep, isolate, do not expand)
| Table | Notes |
|---|---|
| `inventory_item` | Procedure-linked consumables |
| `inventory_movement` | Procedure consumption events |
| `procedure_type` | Procedure catalogue |
| `procedure_recipe` | Procedure → consumable mapping |

### Legacy tables (target for deletion — no legacy clients)
| Table | Reason |
|---|---|
| `public."user"` | Text-id identity, superseded by `app_user` + `actor` |
| `AccessRequest` (PascalCase) | Duplicate of `access_request` |
| `Batch` (PascalCase) | Duplicate/unused |
| `StockTransaction` (PascalCase) | Duplicate of `stock_transaction` |
| `FinancialTransaction` (PascalCase) | Duplicate of `financial_transaction` |
| `ProductHistory` (PascalCase) | Orphan view/table |
| `ApiKey` (PascalCase) | Unclear ownership, no frontend consumer |
| `AccessBinding` (PascalCase) | Superseded by `iam_bindings` jsonb on `app_user` |
| `Contact` (PascalCase) | No frontend consumer identified |
| `FinancialCategory` (PascalCase) | No frontend consumer identified |
| `batch` (snake_case) | No frontend consumer identified |

### Legacy columns (target for deletion)
| Table | Column | Reason |
|---|---|---|
| `appointment` | `doctor_id text` | References `public."user"`, superseded by `doctor_actor_id` |
| `appointment` | `doctor_name text` | Denormalized, derivable from actor JOIN |
| `clinical_record` | `doctor_id text` | References `public."user"`, superseded by `doctor_actor_id` |
| `access_request` | `requester_id text` | References `public."user"`, superseded by `requester_user_id` |

### Legacy RPCs (review and consolidate)
| RPC | Status |
|---|---|
| `create_user_with_actor` | Keep — used by frontend `saveUser` |
| `update_user_with_actor` | Keep — used by frontend `saveUser` |
| `create_patient_with_actor` | Keep — used by frontend `addPatient` |
| `perform_procedure` | Keep — procedural subsystem |
| `has_permission` | Keep — IAM check |
| `is_super_admin` | Keep — IAM check |

---

## Frontend Service Layer (post-cleanup)

`database.service.ts` has been cleaned:
- All fallback queries to plural/legacy table names removed (`appointments`, `clinical_records`)
- `mapClinicalRecordRow()` no longer reads non-existent `doctor_name` or `notes` columns
- `insertAppointment`, `insertClinicalRecord`, `selectAppointmentStatus`, `updateAppointmentFields` simplified to single-path canonical queries
- `requestAccess` fallback removed
- TypeScript compiles clean (`tsc --noEmit` passes)

---

## Migration History

| Migration | Status | Notes |
|---|---|---|
| `20260117121134` | Applied (remote only) | Initial remote baseline, placeholder locally |
| `20260321000000_identity_bridge` | Applied ✅ | Added `doctor_actor_id`, `requester_user_id`, indexes, FKs |

---

## Next Engineering Phase: Hard Cleanup

Since **this project has no legacy clients**, the transitional bridge columns and legacy tables can be removed in the next migration without a deprecation window.

See `REPO_CONSOLIDATION_PLAN.md` for the full cleanup roadmap.
