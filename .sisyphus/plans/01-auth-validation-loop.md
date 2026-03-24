# Plan: Auth/Login Playwright Validation & Implementation

**Goal**: Deliver a fully working Auth/Login module validated via Playwright, preserving multi-tenant context (`iam_bindings`), and keeping the Git history clean.
**Status**: DRAFT
**Context**: Modern Angular 18+ (Signals, Standalone) + Supabase (PostgreSQL).

## Scope
**IN SCOPE**:
- Local Supabase spin-up (`npx supabase init` & `supabase start`).
- Creation of `auth.spec.ts` in `/e2e-tests/tests/` to validate login, failure states, and clinic selection (multi-tenant IAM).
- Implementation of `frontend/src/app/core/store/auth.store.ts` (Signal-based facade) to replace or wrap `AuthService` state.
- Verification of `iam_bindings` extraction and context population.

**OUT OF SCOPE**:
- Modifying other features (Reception, Inventory, etc.).
- Modifying legacy archive code.

## Guardrails (From Metis)
- **Signals Reactivity**: Use `computed()` for derived state and `effect()` for side effects. `AuthStore` must expose read-only signals.
- **Multi-Tenant Isolation**: The app must parse `iam_bindings` upon login. If no bindings exist for the requested clinic, redirect or show empty state.
- **Atomic Flow**: Ensure `clinicId` is available for all subsequent operations after login.
- **No Stubs**: Real UI, real Supabase backend.
- **Legacy Cleanup**: Ensure no `firebase` or `localStorage.getItem('user')` leaks exist in the modern frontend.

## Final Verification Wave
- [ ] Playwright tests (`auth.spec.ts`) pass against the local Supabase instance.
- [ ] `tsc --noEmit -p tsconfig.app.json` inside `/frontend` returns 0 errors.
- [ ] Multi-tenant context (`iam_bindings`) is correctly parsed and stored in signals.

## Execution Tasks

- **Task 1: Environment Setup**
  - Run `npx supabase init` and `npx supabase start` in the root directory.
  - If Docker fails, document the required migrations in `wiki-site/docs/runbooks/local-setup.md` and halt.
  - Apply migrations via `npx supabase db reset`.
  
- **Task 2: Playwright Validation (Test-First)**
  - Create `e2e-tests/tests/auth.spec.ts`.
  - Write tests for:
    - Successful login.
    - Invalid credentials (error state).
    - Multi-tenant clinic context population.
  - Run tests (they should fail initially if implementation is incomplete).

- **Task 3: Auth Store Implementation**
  - Create `frontend/src/app/core/store/auth.store.ts`.
  - Implement a Signal-based facade over `AuthService` and `SupabaseService`.
  - Ensure `iam_bindings` are extracted from the `app_user` table upon successful authentication and passed to `ClinicContextService`.

- **Task 4: Login Component Refinement**
  - Refine `frontend/src/app/features/auth/login.component.ts`.
  - Use `lucide-angular` and Tailwind for styling.
  - Connect the UI to the new `AuthStore`.
  
- **Task 5: Verification & Commit**
  - Run `npm run test` (if unit tests exist) and `npx playwright test e2e-tests/tests/auth.spec.ts`.
  - Ensure `tsc --noEmit` is clean.
  - Use standard Conventional Commits and prepare for PR.