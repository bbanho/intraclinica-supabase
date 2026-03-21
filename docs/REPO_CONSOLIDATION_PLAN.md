# Repo Consolidation Plan

## Goal

Reduce repository ambiguity by converging on one canonical frontend, one canonical schema path, and one clear archive strategy for legacy artifacts.

## Current Problem

The repository currently mixes:

- one active Angular application under `frontend`
- another largely duplicated Angular application under `intraclinica-angular`
- live Supabase schema drift versus local migrations
- generated/runtime artifacts stored beside source material
- legacy planning material mixed with current engineering references

This slows delivery and makes every change higher risk than necessary.

## Canonical Decision

### Frontend

`frontend/` is the canonical application directory.

Reason:

- current handover and docs already reference `frontend`
- recent runtime recovery and Supabase inspection were done against `frontend`
- `frontend` contains additional modules and services not present in `intraclinica-angular`
- `frontend` includes the current NgRx and Supabase-oriented evolution path

### Legacy Frontend

`intraclinica-angular/` should be treated as legacy pending archival.

It should not receive new features.

## Evidence Of Duplication

Shared duplicated paths include:

- `app.component.ts`
- `app.routes.ts`
- `core/services/auth.service.ts`
- `core/services/database.service.ts`
- `features/login/login.component.ts`
- `features/reception/reception.component.ts`
- `features/reports/reports.component.ts`
- `layout/main-layout.component.ts`

At the same time, `frontend/` already diverges with additional files and modules such as:

- `core/services/supabase.service.ts`
- `core/services/patient.service.ts`
- `core/services/inventory.service.ts`
- `core/models/inventory.types.ts`
- `core/store/`
- `features/patients/`
- `features/procedures/`
- `features/appointments/`

This means the second app is not a clean mirror. It is a stale branch of the product inside the same repository.

## Consolidation Sequence

1. Freeze `frontend/` as canonical in docs.
2. Mark `intraclinica-angular/` as legacy and block new feature work there.
3. Compare remaining unique files under `intraclinica-angular/`.
4. Port any still-needed deltas into `frontend/`.
5. Move `intraclinica-angular/` to an explicit archive location.
6. Remove stale references from docs and onboarding material.

## Database Track

Repository consolidation is coupled to schema consolidation.

The live database currently still contains overlapping identity and domain models:

- `app_user` and `user`
- snake_case and PascalCase duplicates for several entities

Before feature delivery resumes, the schema track should:

1. define the canonical snake_case application model
2. remove or deprecate duplicated tables
3. normalize key types across domain relationships
4. regenerate types for the frontend from the remote schema

## Archive Policy

When moving legacy material, prefer:

- `archive/frontend-legacy/intraclinica-angular/`
- `archive/docs/`
- `archive/plans/`

Archived material should remain readable but clearly excluded from active implementation paths.

## Immediate Safe Actions

- ignore build/runtime artifacts for both Angular apps
- document canonical versus legacy status
- stop editing `intraclinica-angular/`
- continue implementation only in `frontend/`
