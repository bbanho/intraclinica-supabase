# TIER 1 Master Plan: Testing Pyramid Integration

**Generated:** 2026-03-23  
**Status:** REVISED — Unit Testing Added

---

## Testing Pyramid Strategy

```
        /\
       /E2E\         ← Playwright (+100 pts/feature validated)
      /------\
     /Integr. \      ← Future phase
    /----------\
   / Unit Tests \    ← Vitest (+2 pts/test)
  /--------------\
```

**Principle:** E2E tests without unit tests are fragile. Unit tests catch bugs early, E2E validates flows.

### Why Unit Tests First?
- E2E tests are slow, expensive, and break often
- Logic bugs caught by unit tests = fast feedback loop
- Unit tests = executable documentation
- E2E only validates what users actually do

---

## Coverage Targets

| Layer | Target | Purpose |
|-------|--------|---------|
| **Services** (`core/services/`) | 80% | Business logic, Supabase calls, RPC invocations |
| **Stores** (`core/store/`) | 90% | Signal state, computed derivations, mutation actions |
| **Components** (`features/*`) | 70% | User interaction, signal inputs/outputs, template logic |

---

## Vitest Setup (Missing)

**Status:** NOT CONFIGURED — Project uses Karma/Jasmine, but AGENTS.md mandates Vitest

### Required Setup Tasks

| Task | Status | File |
|------|--------|------|
| Add Vitest dependencies | PENDING | `package.json` |
| Create `vitest.config.ts` | PENDING | `frontend/vitest.config.ts` |
| Create test setup file | PENDING | `frontend/src/test-setup.ts` |
| Update `tsconfig.spec.json` | PENDING | For Vitest types |
| Add npm script | PENDING | `package.json` scripts |
| Migrate `app.component.spec.ts` | PENDING | From Karma to Vitest |

### Vitest Config Location
- Primary: `frontend/vitest.config.ts`
- Alternative: `frontend/vitest.config.mts`

### Package Dependencies
```json
{
  "vitest": "^2.x",
  "@vitest/coverage-v8": "^2.x",
  "jsdom": "^25.x"
}
```

---

## Test Organization

| Type | Location | Naming | Command |
|------|----------|--------|---------|
| **Unit Tests** | `frontend/src/app/**/*.spec.ts` | `.spec.ts` | `npm run test` |
| **E2E Tests** | `frontend/e2e/tests/**/*.spec.ts` | `.spec.ts` | `npm run e2e` |

### Legacy Spec File (1 total)
- `frontend/src/app/app.component.spec.ts` — Uses Karma, needs migration to Vitest

---

## Revised Wave Structure

Each wave now has TWO parallel tracks: **E2E + Unit Tests**

### Wave 1: Reception + Unit Tests
| Item | Type | Points | Coverage Target |
|------|------|--------|-----------------|
| Reception E2E | Playwright | +100 | Agenda, appointment modal, waiting queue |
| ReceptionService unit tests | Vitest | +2/test | `core/services/reception.service.spec.ts` |
| ReceptionStore unit tests | Vitest | +2/test | `core/store/reception.store.spec.ts` |
| ReceptionCalendar unit tests | Vitest | +2/test | `agenda-calendar.component.spec.ts` |

### Wave 2: Patients + Unit Tests
| Item | Type | Points | Coverage Target |
|------|------|--------|-----------------|
| Patients E2E | Playwright | +100 | Patient CRUD, search, modal |
| PatientService unit tests | Vitest | +2/test | `core/services/patient.service.spec.ts` |
| PatientStore unit tests | Vitest | +2/test | `core/store/patient.store.spec.ts` |

### Wave 3: Clinical + Unit Tests
| Item | Type | Points | Coverage Target |
|------|------|--------|-----------------|
| Clinical E2E | Playwright | +100 | Patient records, form submission |
| ClinicalService unit tests | Vitest | +2/test | `core/services/clinical.service.spec.ts` |
| ClinicalStore unit tests | Vitest | +2/test | `core/store/clinical.store.spec.ts` |
| ClinicalComponent unit tests | Vitest | +2/test | `clinical.component.spec.ts` |

### Wave 4: Auth + Unit Tests
| Item | Type | Points | Coverage Target |
|------|------|--------|-----------------|
| Auth E2E | Playwright | +100 | Login, redirect, IAM bindings |
| AuthService unit tests | Vitest | +2/test | `core/services/auth.service.spec.ts` |

### Wave 5: Inventory + Unit Tests
| Item | Type | Points | Coverage Target |
|------|------|--------|-----------------|
| Inventory E2E | Playwright | +100 | Product CRUD, stock |
| InventoryService unit tests | Vitest | +2/test | `core/services/inventory.service.spec.ts` |
| InventoryStore unit tests | Vitest | +2/test | `core/store/inventory.store.spec.ts` |

### Wave 6: Admin/Reports + Unit Tests
| Item | Type | Points | Coverage Target |
|------|------|--------|-----------------|
| Admin E2E | Playwright | +100 | SaaS dashboard, IAM actions |
| ReportsComponent unit tests | Vitest | +2/test | `reports.component.spec.ts` |
| AdminPanel unit tests | Vitest | +2/test | `admin-panel.component.spec.ts` |

---

## Score Calculation

| Activity | Points | Requirement |
|----------|--------|-------------|
| Unit test (passing) | +2 | All layers |
| E2E feature validated | +100 | Per feature |
| **Full feature score** | +106+ | E2E + all unit tests |

### Minimum for "Feature Complete"
- E2E passing = +100
- Unit tests at coverage target = variable (typically +20-40 tests × 2 = +40-80)
- **Total per feature: +140-180**

### Incomplete (E2E only, no unit tests)
- E2E passing = +100
- No unit tests = 0
- **Score: +100** (inverted pyramid — fragile)

---

## Files Needing Unit Tests (Priority Order)

### Core Services (`core/services/`)
1. `auth.service.ts` — Supabase Auth, IAM bindings
2. `context.service.ts` — Clinic selection, multi-tenant
3. `patient.service.ts` — Patient CRUD
4. `clinical.service.ts` — Medical records
5. `inventory.service.ts` — Products, stock
6. `reception.service.ts` — Appointments, queue

### Core Stores (`core/store/`)
1. `patient.store.ts` — Patient list, selected patient
2. `clinical.store.ts` — Current record, history
3. `inventory.store.ts` — Products, stock levels
4. `reception.store.ts` — Appointments, waiting queue

### Feature Components (`features/`)
1. `login.component.ts` — Auth flow
2. `reception.component.ts` — Reception UI
3. `agenda-calendar.component.ts` — Calendar grid
4. `patients.component.ts` — Patient list
5. `clinical.component.ts` — Medical records UI
6. `inventory.component.ts` — Product grid

---

## Current Test Coverage (0%)

| Category | Existing | Needed |
|----------|----------|--------|
| Unit tests | 1 spec (karma) | ~50+ specs |
| E2E tests | 0 modern | 6 feature suites |

---

## Execution Order

1. **Setup Vitest** (blocker for unit tests)
2. **Wave 1: Reception** (parallel E2E + unit tests)
3. **Wave 2: Patients** (parallel E2E + unit tests)
4. **Wave 3: Clinical** (parallel E2E + unit tests)
5. **Wave 4: Auth** (parallel E2E + unit tests)
6. **Wave 5: Inventory** (parallel E2E + unit tests)
7. **Wave 6: Admin** (parallel E2E + unit tests)

---

## Key Principles

1. **No E2E without unit tests** — E2E-only is an inverted pyramid
2. **Unit tests run fast** — Target <30s for full suite
3. **Coverage gates** — Services 80%, Stores 90%, Components 70%
4. **Vitest over Karma** — Per AGENTS.md mandate
5. **Spec files co-located** — `*.spec.ts` next to `*.ts`
