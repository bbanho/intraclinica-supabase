# Plan: Supabase Local Dump & Playwright Verification

**Goal**: Establish the local Supabase environment by dumping the remote cloud schema/data, then run and pass the Auth Playwright tests created in the previous phase.
**Status**: DRAFT

## Context
During the initial Auth implementation, `supabase start` failed due to missing base tables in the local migrations. The user explicitly authorized doing a cloud dump to bypass this and start local development.
**User Directive**: "vc pode fazer o dump do supabase em nuvem para usar localmente"

## Execution Tasks

- **Task 1: Supabase Remote Dump**
  - Ensure you are logged into the Supabase CLI (if necessary) or that the project is linked (`npx supabase link`). 
  - If a project reference is not set, find it in the repository configuration or environment files.
  - Run `npx supabase db pull` to fetch the remote schema and consolidate the migrations.
  
- **Task 2: Start Local Supabase**
  - Run `npx supabase start`.
  - Ensure all containers (PostgreSQL, GoTrue/Auth, REST, Realtime) are healthy.

- **Task 3: Seed Test Data (Optional but Recommended)**
  - If the dump does not include data, use `database/seeds/demo_front_seed_draft.sql` to create a test user, test clinic, and IAM bindings for the E2E tests.

- **Task 4: Playwright Execution**
  - Start the Angular development server (`cd frontend && npm run dev &`).
  - Run `npx playwright test e2e-tests/tests/auth.spec.ts`.
  - Fix any implementation bugs in `login.component.ts` or `auth.store.ts` until the test is GREEN.

## Final Verification Wave
- [ ] Local Supabase is running without migration errors.
- [ ] The `auth.spec.ts` Playwright test passes 100%.
- [ ] `tsc --noEmit` inside `/frontend` returns 0 errors.