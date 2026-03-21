# Schema Consolidation Status

## Session Scope

This document records the current state of the Supabase-backed data model after local runtime recovery, remote schema inspection, and seed preparation.

## Advances Completed

- Linked the local repository to the target Supabase project.
- Confirmed the remote project and generated types from the live `public` schema via Supabase CLI.
- Verified that the remote database is structurally present but effectively empty from an application-data perspective.
- Prepared a draft seed scaffold and then explicitly downgraded it to non-executable status after live execution exposed additional type drift:
  - [database/seeds/demo_front_seed_draft.sql](../database/seeds/demo_front_seed_draft.sql)
- Confirmed the current frontend auth flow:
  - email/password login through `signInWithPassword`
  - session hydration through `onAuthStateChange`
  - Google login still disabled at the UI layer

## Confirmed Remote Canonical Surface In Use

The live remote schema currently exposes and/or is expected by the frontend to use these snake_case relations:

- `clinic`
- `actor`
- `app_user`
- `patient`
- `product`
- `stock_transaction`
- `appointment`
- `clinical_record`
- `access_request`
- `inventory_item`
- `inventory_movement`
- `procedure_type`
- `procedure_recipe`

## Structural Problems Confirmed

The database currently carries overlapping models and naming styles:

- snake_case and PascalCase duplicates coexist:
  - `access_request` and `AccessRequest`
  - `batch` and `Batch`
  - `stock_transaction` and `StockTransaction`
- there is also a parallel `public."user"` table in addition to `public.app_user`
- ids for conceptually related entities are not consistently typed across the whole model
- local migrations and snippets do not all describe the same reality as the remote schema

This creates three concrete problems:

1. seed and migration scripts become brittle
2. runtime code needs defensive casting and table-specific assumptions
3. social auth and onboarding are harder than necessary because identity mapping is ambiguous

## Operational Evidence

### Remote inspection

The following commands were used successfully against the linked Supabase project:

```bash
supabase projects list
supabase link --project-ref <PROJECT_REF>
supabase gen types typescript --linked --schema public
supabase inspect db table-stats --linked
```

### Observed table population

`table-stats` reported estimated row count `0` for the application tables relevant to the current frontend, including:

- `public.clinic`
- `public.actor`
- `public.app_user`
- `public.user`
- `public.patient`
- `public.product`
- `public.stock_transaction`
- `public.appointment`
- `public.clinical_record`
- `public.access_request`

This means schema exists, but the app still lacks a coherent baseline dataset.

## Recommended Canonical Model

Unless a contrary business requirement appears, the repository should converge on:

- `clinic`
- `actor`
- `app_user`
- `patient`
- `product`
- `stock_transaction`
- `appointment`
- `clinical_record`
- `access_request`

And treat these as legacy or deprecation targets:

- `public."user"`
- PascalCase duplicates such as `AccessRequest`, `Batch`, `StockTransaction`

The detailed target model and transition rules now live in:

- [CANONICAL_SCHEMA_TARGET.md](CANONICAL_SCHEMA_TARGET.md)

## Immediate Cleanup Order

1. Freeze the canonical model in writing.
2. Inspect exact physical column types for all canonical tables from the live database.
3. Write a consolidation migration to normalize key types and eliminate duplicate paths.
4. Update the frontend to compile against generated remote types.
5. Rebuild executable seeds only after the canonical contract is stable.
6. Implement Google login on top of the consolidated identity model.

## Notes On Auth

Current operator user was confirmed in `auth.users` during investigation.

However, the existence of an `auth.users` row alone is not enough. The application still requires a clean mapping into the canonical application identity tables.

## Next Task

The next engineering task should be a schema consolidation pass, not feature work.
