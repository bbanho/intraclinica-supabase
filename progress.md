# Progress Log

## Session: Sun Mar 22 2026

- **17:00** - Read the initial requirements, constraints (Multi-tenant, Signals, Standalone Components, PostgreSQL 16).
- **17:15** - Analyzed `docs/DATABASE_SCHEMA.md` and `docs/CANONICAL_SCHEMA_TARGET.md`. Confirmed the current state of the database after the `hard_cleanup` migration.
- **17:30** - Searched Context7 for `btree_gist` and `EXCLUDE USING gist` for time scheduling constraints.
- **17:40** - Created migration `20260322000000_appointment_conflict_guard.sql`.
- **17:45** - Encountered `42P17 IMMUTABLE` errors on the PostgreSQL index expression because timestamp + interval depends on the local timezone setting.
- **17:50** - Solved the error by wrapping the interval addition inside an explicit `IMMUTABLE` PL/pgSQL function `calc_appointment_end()`.
- **17:55** - Updated `frontend/src/types/supabase.ts`, `patient.service.ts`, and `reception.component.ts` to support the new `duration_minutes` parameter and display the error message.
- **18:00** - Validated the codebase with `tsc --noEmit` (0 errors).
- **18:10** - Pushed the branch `feat/appointment-conflict-guard` and opened a PR on GitHub.
- **18:15** - Passed the final SQL script to the user for manual execution via `wl-copy`.
- **18:30** - User hit overlapping data error (`23P01`). Wrote deduplication logic to shift existing appointments.
- **18:40** - Constraint applied successfully by user.
- **18:45** - User approved documenting the architectural decision (DB Reset vs Patching) for future technical debt.
- **18:50** - Updated `AGENT_HANDOFF.md` and `docs/DATABASE_SCHEMA.md` to reflect Phase 1 completion.
- **Status:** Moving to Phase 2 (E2E Test) while waiting for next instructions.
