# Feature Gap Matrix: Modern Frontend vs Legacy Archive

**Generated:** 2026-03-23  
**Modern Frontend:** `frontend/src/app/features/`  
**Legacy Archive:** `archive/frontend-legacy/frontend-old/src/app/features/`

---

## TIER 1: Core Revenue Features

### 1. Auth / Login

| Attribute | Details |
|-----------|---------|
| **Status** | ✅ COMPLETE |
| **Modern Frontend** | `features/auth/login.component.ts` — Standalone, Supabase Auth, reactive forms, signals |
| **Legacy Reference** | `archive/frontend-legacy/frontend-old/src/app/features/login/login.component.ts` — Firebase Auth |
| **What EXISTS** | Modern: Supabase SSO, IAM bindings, clinic context, redirect to `/reception` |
| **What MISSING** | Nothing significant |
| **Playwright Coverage** | PARTIAL (legacy has full suite in `e2e/tests/auth.spec.ts`; modern has only structural stub in `e2e/sidebar-iam.spec.ts`) |
| **Effort** | 1/5 |

---

### 2. Clinical / Prontuário

| Attribute | Details |
|-----------|---------|
| **Status** | ⚠️ FUNCTIONAL but INCOMPLETE |
| **Modern Frontend** | `features/clinical/clinical.component.ts` — Patient search, record types (Evolucao/Receita/Exame/Triagem), dark theme focus mode |
| **Legacy Reference** | `archive/frontend-legacy/frontend-old/src/app/features/clinical/clinical.component.ts` |
| **What EXISTS** | Patient selection, medical record form (chief complaint, observations, diagnosis, prescriptions), record history, multi-tenant context guard |
| **What MISSING** | **WebLLM AI assist** — button is placeholder (`TODO: Implement WebLLM integration with dynamic import`). The AI assist function shows an alert saying "IA Local em desenvolvimento" |
| **Playwright Coverage** | NO (modern has zero tests; legacy has `clinical.spec.ts` and `clinical-flow.spec.ts`) |
| **Effort** | 3/5 (AI integration is non-trivial due to WebGPU dynamic loading requirements) |

---

### 3. Reception / Agenda

| Attribute | Details |
|-----------|---------|
| **Status** | ✅ COMPLETE |
| **Modern Frontend** | `features/reception/reception.component.ts`, `agenda-calendar.component.ts`, `appointment-modal/` |
| **Legacy Reference** | `archive/frontend-legacy/frontend-old/src/app/features/reception/reception.component.ts`, `agenda-calendar.component.ts` |
| **What EXISTS** | Waiting queue (Fila), weekly agenda calendar, doctor status/rooms grid, appointment modal with patient search, multi-doctor support via `doctors()` signal |
| **What MISSING** | Nothing significant |
| **Playwright Coverage** | PARTIAL (legacy has `reception.spec.ts`; modern has no dedicated tests) |
| **Effort** | 1/5 |

---

### 4. Inventory / Procedures

| Attribute | Details |
|-----------|---------|
| **Status** | ⚠️ PARTIAL — Products exist, Procedures & Recipes do NOT |
| **Modern Frontend** | `features/inventory/inventory.component.ts`, `product-modal/` |
| **Legacy Reference** | `archive/frontend-legacy/frontend-old/src/app/features/inventory/inventory.component.ts` |
| **What EXISTS** | Product CRUD, stock levels, CSV import, product modal with supplier/category |
| **What MISSING** | **Procedures & Recipes module** — legacy has `procedures/procedure-recipe.component.ts` which links procedures to inventory items for automatic consumption tracking. This feature has NO equivalent in modern frontend |
| **Playwright Coverage** | NO (modern has no tests; legacy has `inventory.spec.ts`) |
| **Effort** | 4/5 (complex feature linking procedures to inventory items with quantity tracking) |

---

### 5. Patients

| Attribute | Details |
|-----------|---------|
| **Status** | ✅ COMPLETE |
| **Modern Frontend** | `features/patients/patients.component.ts`, `patient-modal/` |
| **Legacy Reference** | No equivalent standalone patient feature in legacy (patients were managed within clinical/reception) |
| **What EXISTS** | Patient list with search, patient modal (name, CPF, birth_date, phone, email, address), multi-tenant filtering via clinic context |
| **What MISSING** | Nothing significant |
| **Playwright Coverage** | NO |
| **Effort** | 1/5 |

---

### 6. Reports / Admin

| Attribute | Details |
|-----------|---------|
| **Status** | ✅ PRESENT |
| **Modern Frontend** | `features/reports/reports.component.ts`, `features/admin-panel/admin-panel.component.ts` |
| **Legacy Reference** | `archive/frontend-legacy/frontend-old/src/app/features/reports/reports.component.ts`, `admin-panel/admin-panel.component.ts` |
| **What EXISTS** | Reports component (general), Admin Panel with SaaS multi-tenant dashboard (clinics count, users count, pending requests), IAM-based quick actions |
| **What MISSING** | Nothing significant |
| **Playwright Coverage** | NO (modern); PARTIAL (legacy has `admin.spec.ts`) |
| **Effort** | 1/5 |

---

## TIER 2: Clinical Operations Features

### 7. Procedures & Recipes

| Attribute | Details |
|-----------|---------|
| **Status** | ❌ MISSING from Modern Frontend |
| **Modern Frontend** | Does NOT exist |
| **Legacy Reference** | `archive/frontend-legacy/frontend-old/src/app/features/procedures/procedure-recipe.component.ts` |
| **What EXISTS (Legacy)** | Full procedure CRUD (name, code TUSS, price, active status), recipe items linking procedures to inventory items with quantities, add/remove recipe items, procedure form modal |
| **What MISSING (Modern)** | The entire Procedures & Recipes feature — no way to configure which inventory items are consumed by which procedures |
| **Playwright Coverage** | NO (does not exist in modern) |
| **Effort** | 4/5 |

---

### 8. Social AI Marketing

| Attribute | Details |
|-----------|---------|
| **Status** | ❌ MISSING from Modern Frontend |
| **Modern Frontend** | Does NOT exist |
| **Legacy Reference** | `archive/frontend-legacy/frontend-old/src/app/features/social/social.component.ts` |
| **What EXISTS (Legacy)** | AI-powered Instagram content generation via Gemini, tone selection (friendly/professional/empathetic), topic input, caption + hashtag output, copy-to-clipboard, post history filtered by clinic, IAM permission check (`MARKETING_READ`) |
| **What MISSING (Modern)** | Entire Social/Marketing module — no AI content generation, no social media integration |
| **Playwright Coverage** | NO (does not exist in modern) |
| **Effort** | 4/5 (requires Gemini API integration + IAM permissions + UI) |

---

### 9. Multi-Doctor Support

| Attribute | Details |
|-----------|---------|
| **Status** | ⚠️ PARTIAL |
| **Modern Frontend** | `features/reception/reception.component.ts` — shows doctor status grid with online indicators, `appointment-modal/` — allows selecting doctor for appointment |
| **Legacy Reference** | Implicit in reception and clinical components |
| **What EXISTS** | Doctor status indicators (online/offline), appointment-doctor assignment, patient records tied to single doctor context |
| **What MISSING** | Explicit multi-doctor consultation view, doctor switching during clinical sessions, per-doctor statistics/queue, doctor-specific scheduling views |
| **Playwright Coverage** | NO |
| **Effort** | 3/5 |

---

## Summary Table

| Feature | Modern Status | Legacy Status | Playwright (Modern) | Effort |
|---------|---------------|---------------|---------------------|--------|
| Auth/Login | ✅ Complete | ✅ Complete | PARTIAL | 1 |
| Clinical/Prontuario | ⚠️ Functional | ✅ Complete | NO | 3 |
| Reception/Agenda | ✅ Complete | ✅ Complete | PARTIAL | 1 |
| Inventory | ⚠️ Products only | ✅ Complete | NO | 4 |
| Patients | ✅ Complete | N/A | NO | 1 |
| Reports/Admin | ✅ Complete | ✅ Complete | NO | 1 |
| Procedures & Recipes | ❌ Missing | ✅ Complete | NO | 4 |
| Social AI Marketing | ❌ Missing | ✅ Complete | NO | 4 |
| Multi-Doctor Support | ⚠️ Partial | ⚠️ Partial | NO | 3 |

---

## Key Observations

1. **Test Coverage Gap is CRITICAL** — The modern frontend has only a stub Playwright test (`sidebar-iam.spec.ts`) and one unit spec (`app.component.spec.ts`). The legacy has a full suite covering auth, reception, inventory, clinical, and admin.

2. **Missing Features with Clear Business Value** — Procedures & Recipes (inventory consumption tracking) and Social AI Marketing are fully implemented in legacy but have zero implementation in modern.

3. **Clinical AI is Placeholder** — The `assistWithAI()` method in clinical is stub code showing `alert('🤖 IA Local em desenvolvimento...')`. This was a key selling point of the modern frontend.

4. **Multi-Doctor is Inconsistent** — Reception shows doctor status but Clinical has no doctor attribution on records.

---

## Recommended Priority Order

1. **Auth** — Already complete, needs test coverage (1)
2. **Reception/Agenda** — Already complete, needs test coverage (1)
3. **Patients** — Already complete, needs test coverage (1)
4. **Reports/Admin** — Already complete, needs test coverage (1)
5. **Clinical AI** — Complete WebLLM integration (3)
6. **Multi-Doctor** — Full doctor context in clinical (3)
7. **Inventory (Procedures)** — Procedures & Recipes module (4)
8. **Social AI** — Marketing content generation (4)
