# Learnings: Admin Sovereignty - Clinics

## Database Schema Discrepancy
- The schema defines the table as `clinics` (plural).
- The `database.service.ts` was incorrectly querying `clinic` (singular).
- This was likely causing 404/Not Found errors or empty results when fetching clinics.

## Soft Delete Strategy
- Instead of physically deleting rows (which breaks history/FK constraints), we now use `update clinics set status = 'inactive'`.
- This preserves the `id` and `created_at` for audit trails.
- The frontend should filter out `inactive` clinics unless explicitly requested (e.g., in an archive view). Note: Current implementation fetches all accessible clinics; filtering might be needed in the component or the service query later if the list grows too large.

## Error Handling
- Added specific handling for PostgreSQL error code `23505` (unique_violation) in `addClinic`.
- This provides better feedback than a generic 500 error when trying to create a duplicate clinic.
