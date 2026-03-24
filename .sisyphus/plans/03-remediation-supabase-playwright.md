# Plan: Remediation — Supabase Local + Playwright GREEN

**Goal**: Fix the remaining gaps identified by Oracle and achieve GREEN Playwright tests.
**Status**: ACTIVE

## Oracle Findings Summary
| Item | Status |
|---|---|
| Branch exists | ✅ |
| `tsc --noEmit` 0 errors | ✅ |
| `auth.store.ts` valid Signals | ✅ |
| `auth.spec.ts` written | ⚠️ Never GREEN |
| `operational-map.md` | ❌ Not on branch |
| Supabase local | ❌ Not running |
| PR created | ❌ Missing |

## Execution Tasks

- **Task 1: Fix Supabase Migration Drift**
  - Inspect `20260321000000_identity_bridge.sql` and identify missing table dependencies.
  - Reorder migrations or add `IF NOT EXISTS` guards to resolve the drift.
  - Alternative: Run `npx supabase db push` to sync remote schema directly.

- **Task 2: Self-Contained Playwright Config**
  - Add `webServer:` block to `e2e-tests/playwright.config.ts` to auto-start Angular.
  - Set proper base URL, timeout, and retries.

- **Task 3: Commit `operational-map.md`**
  - Ensure `wiki-site/docs/architecture/operational-map.md` is committed on `feat/auth-validation-loop`.

- **Task 4: AuthStore Signal Hygiene**
  - Make `isLoading` and `error` private backing signals with `readonly` public accessors.

- **Task 5: Run Playwright Tests GREEN**
  - Start local Supabase.
  - Start Angular (`npm run dev`).
  - Run `npx playwright test e2e-tests/tests/auth.spec.ts`.
  - Fix any failing assertions until 100% GREEN.

- **Task 6: Open PR**
  - Create PR via `gh pr create` per AGENTS.md workflow.