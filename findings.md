# Findings & Research

## Database Constraint
- **PostgreSQL EXCLUDE Constraint:** `btree_gist` extension enables building a GiST index combining scalar (UUID) and range types (`tstzrange`). This allows rejecting overlapping ranges for the same doctor.
- **IMMUTABLE Expressions:** Index expressions in PostgreSQL MUST be `IMMUTABLE`. The expression `interval '1 minute' * duration_minutes` with a `timestamptz` column fails because adding an interval to a timestamp depends on the timezone.
- **Solution:** Create a custom PL/SQL function explicitly marked as `IMMUTABLE` that returns the `start + interval`. Using `make_interval()` inside an immutable function bypasses the timezone context warning.

## Clinical Flow (Reception -> Clinical)
- **Reception Check-in:** In `reception.component.ts`, `updateStatus(id, 'Aguardando')` updates the Supabase table through `PatientService.transitionAppointmentStatus`.
- **Clinical Call:** In `clinical.component.ts`, `currentPatient` is a computed signal tracking the appointment array where `status === 'Em Atendimento'` and `doctorActorId === currentUser.actor_id`.
- **Observation:** Currently, there's no server-side transition state logic (e.g., an RPC validating the state machine). State transitions are handled directly on the frontend.
