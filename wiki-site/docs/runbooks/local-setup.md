# Local Setup Runbook

## Supabase Initialization Issues
When running `npx supabase start`, the migration `20260321000000_identity_bridge.sql` fails with:

```sql
ERROR: relation "public.appointment" does not exist (SQLSTATE 42P01)
At statement: 4
update public.appointment a ...
```

**Resolution:**
The migration relies on tables (e.g., `appointment`, `clinical_record`, `access_request`) that are not present in the initial remote migration. These tables must be created before `20260321000000_identity_bridge.sql` or the migration needs to be conditionally executed based on table existence.

