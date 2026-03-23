# ADR 002: Enforcement of IAM and Row Level Security (RLS)

## Status
Accepted

## Context
IntraClinica is a multi-tenant SaaS application handling sensitive medical data (patients, appointments, clinical records). During an architectural security audit, it was discovered that while the foundational IAM role logic existed in the `app_user.iam_bindings` JSONB column, **PostgreSQL Row Level Security (RLS) was disabled** for all core medical domain tables.

This posed a critical vulnerability where any authenticated user could theoretically execute queries bypassing the application layer and access data belonging to other clinics (horizontal data leakage) or access administrative modules beyond their clearance (vertical privilege escalation).

## Decision
We will enforce an absolute "Default Deny" policy at the database engine level. 

1. **Enable RLS on all domain tables:** `patient`, `appointment`, `clinical_record`, `product`, `stock_transaction`, `procedure_type`, `procedure_recipe`.
2. **Implement Security Definer Functions:** Created `public.has_clinic_access(uuid)` and `public.has_clinic_role(uuid, text)` to securely parse the `iam_bindings` JSONB column.
3. **Strict Policy Application:**
   - **Tenant Isolation:** No read/write operations are permitted unless `has_clinic_access` returns true for the row's `clinic_id`.
   - **Role-Based Restrictions:** Highly sensitive tables (e.g., `clinical_record`) require explicit role validation (e.g., `DOCTOR` or `ADMIN`) via `has_clinic_role`. `RECEPTIONIST` roles are mathematically barred from querying clinical records at the database level.

## Consequences
- **Positive:** Complete elimination of cross-tenant data leaks and unauthorized vertical access, regardless of frontend bugs or compromised client-side code. The database is now mathematically sealed.
- **Negative/Trade-offs:** All frontend data fetching must rigorously pass the correct `clinic_id` in every single Supabase query. Queries omitting the `clinic_id` will silently return 0 rows rather than throwing an error, which might complicate debugging if developers aren't aware of the RLS rules.
