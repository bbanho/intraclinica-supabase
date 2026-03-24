# Test Coverage Inventory — IntraClinica Frontend

> Generated for PR #94 — Testing Pyramid Setup  
> Date: 2026-03-23  
> Scope: `frontend/src/app/`

---

## 1. Services (`core/services/`)

| File | Class | Public Methods | Supabase Calls | Signals Created |
|------|-------|---------------|----------------|-----------------|
| `supabase.service.ts` | `SupabaseService` | `clientInstance` (getter) | None (raw client factory) | None |
| `auth.service.ts` | `AuthService` | `signInWithEmail()`, `signOut()`, `supabaseClient` (getter) | `supabase.auth.signInWithPassword()`, `supabase.auth.signOut()`, `supabase.auth.getSession()`, `supabase.auth.onAuthStateChange()` | `currentUser`, `currentSession` |
| `clinic-context.service.ts` | `ClinicContextService` | `setContext()` | None | `selectedClinicId` |
| `iam.service.ts` | `IAMService` | `can()`, `getAllRoles()`, `getAllPermissions()` | `from('iam_roles').select()`, `from('iam_permissions').select()`, `from('app_user').select('iam_bindings')` | `_roles`, `_permissions`, `_userBindings`, `isInitialized` |
| `patient.service.ts` | `PatientService` | `getPatients()`, `getPatientById()`, `createPatient()`, `updatePatient()`, `deletePatient()` | `from('patient').select()`, `from('patient').insert()`, `from('patient').update()`, `from('patient').delete()` | None |
| `appointment.service.ts` | `AppointmentService` | `getWaitlistForToday()`, `getDoctors()`, `getRecentAppointments()`, `createAppointment()`, `updateAppointmentStatus()` | `from('appointment').select()` (3 variants), `from('appointment').insert()`, `from('appointment').update()`, `from('app_user').select()` (doctor lookup) | None |
| `inventory.service.ts` | `InventoryService` | `getProducts()`, `createProduct()` | `from('product').select()`, `rpc('create_product_with_stock')` | None |
| `clinical.service.ts` | `ClinicalService` | `createRecord()`, `getRecordsByPatient()` | `rpc('create_medical_record')`, `from('clinical_record').select()` | None |
| `notification.service.ts` | `NotificationService` | `approveRequest()`, `denyRequest()` | None | `_pendingRequests` |

---

### 1.1 Pure Functions (No Mocking Required)

| Service | Method | Reason |
|---------|--------|--------|
| `IAMService` | `can(permissionKey)` | Pure synchronous logic — reads from in-memory signal cache. No I/O. |
| `IAMService` | `evaluateContextPermissions(context, permissionKey)` | Private pure helper. No I/O. |
| `IAMService` | `getAllRoles()` | Pure array conversion from Map. No I/O. |
| `IAMService` | `getAllPermissions()` | Pure array conversion from Map. No I/O. |
| `NotificationService` | `approveRequest(id)` | Signal update — pure state mutation. |
| `NotificationService` | `denyRequest(id)` | Signal update — pure state mutation. |
| `ClinicContextService` | `setContext()` | Signal setter. No I/O. |

### 1.2 Async Methods (Require Supabase Mocking)

| Service | Method | What to Mock |
|---------|--------|-------------|
| `AuthService` | `signInWithEmail(email, password)` | `supabase.auth.signInWithPassword()` |
| `AuthService` | `signOut()` | `supabase.auth.signOut()` |
| `IAMService` | `initializeIamCache(userId)` | `from('iam_roles').select()`, `from('iam_permissions').select()`, `from('app_user').select('iam_bindings')` |
| `PatientService` | `getPatients()` | `from('patient').select()` with `.eq('clinic_id', clinicId)` |
| `PatientService` | `getPatientById(id)` | `from('patient').select().eq('id', id)` |
| `PatientService` | `createPatient(payload)` | `from('patient').insert()` |
| `PatientService` | `updatePatient(id, payload)` | `from('patient').update()` |
| `PatientService` | `deletePatient(id)` | `from('patient').delete()` |
| `AppointmentService` | `getWaitlistForToday()` | `from('appointment').select()` with date range filters |
| `AppointmentService` | `getDoctors()` | `from('app_user').select().contains('iam_bindings', ...)` |
| `AppointmentService` | `getRecentAppointments()` | `from('appointment').select()` |
| `AppointmentService` | `createAppointment(payload)` | `from('appointment').insert()` |
| `AppointmentService` | `updateAppointmentStatus(id, status)` | `from('appointment').update()` |
| `InventoryService` | `getProducts()` | `from('product').select()` |
| `InventoryService` | `createProduct(dto)` | `rpc('create_product_with_stock')` |
| `ClinicalService` | `createRecord(patientId, content, type)` | `rpc('create_medical_record')` |
| `ClinicalService` | `getRecordsByPatient(patientId)` | `from('clinical_record').select()` |

### 1.3 IAM Engine — `can()` Logic Test Matrix

The `can()` method is the core authorization gate. Test these scenarios:

| Scenario | Input | Expected |
|----------|-------|----------|
| Not initialized | `can('any')` while `isInitialized() = false` | `false` |
| Block at clinic level | User has `blocks: ['clinical.write']` at clinic context | `false` |
| Grant at clinic level | User has `grants: ['inventory.view_cost']` at clinic context | `true` |
| Role package grant | User has `roles: ['roles/doctor']` which includes `'clinical.write'` in `default_grants` | `true` |
| Fallback to global | No clinic-level result, global has grant | `true` |
| No binding at all | User has empty `{}` bindings | `false` |
| `selectedClinicId = 'all'` | Super admin context | Should fall through to global |

---

## 2. Store (`core/store/`)

| File | Class | Signals | Async Methods |
|------|-------|---------|---------------|
| `auth.store.ts` | `AuthStore` | `user` (readonly from auth), `session` (readonly), `isAuthenticated` (computed), `_isLoading`, `_error` | `login(email, pass)`, `logout()` |

### 2.1 AuthStore — `login()` Test Cases

| Case | Given | When | Expect |
|------|-------|------|--------|
| Success with global binding | Valid credentials, user has `bindings.global` | login | `clinicContext.setContext('all')` called |
| Success with clinic binding | Valid credentials, user has bindings for one clinic | login | `clinicContext.setContext(clinicIds[0])` called |
| Success with no bindings | Valid credentials, no iam_bindings | login | `clinicContext.setContext(null)` called |
| Invalid credentials | Supabase throws error | login | `_error` signal set, error thrown |
| IAM query fails | `select('iam_bindings')` returns error | login | Falls through to `setContext(null)` |

---

## 3. Feature Components

### 3.1 `ReceptionComponent` — `frontend/src/app/features/reception/reception.component.ts`

**What it does:** Manages the reception/waiting room — displays today's waitlist, allows status transitions (Agendado → Aguardando → Em Consulta → Finalizado), and shows a weekly agenda calendar.

| Signal | Type | Purpose |
|--------|------|---------|
| `activeTab` | `'fila' \| 'agenda'` | Toggles between waiting list and weekly calendar |
| `isLoading` | `boolean` | Loading state for appointments |
| `appointments` | `Appointment[]` | Today's waitlist |
| `doctors` | `{id, name}[]` | Available doctors |

**Computed signals:**
- `isValidContext` — `selectedClinicId !== null && selectedClinicId !== 'all'`
- `waitingCount` — count of appointments where `status === 'Aguardando'`

**Pure functions:**
- `waitingCount()` — array filter + length (unit testable without mock)

**Async methods (need mocking):**
- `loadAppointments()` → calls `appointmentService.getWaitlistForToday()`
- `loadDoctors()` → calls `appointmentService.getDoctors()`
- `updateStatus(appt, newStatus)` → calls `appointmentService.updateAppointmentStatus()`

**Effects:**
- Constructor effect on `selectedClinicId` changes → reloads appointments + doctors

**Edge cases to test:**
- Empty waitlist shows empty state UI
- No clinic selected shows contextual empty state
- Status transition buttons appear/disappear based on current status
- `openNewAppointmentModal()` returns early if `!isValidContext()`

---

### 3.2 `PatientsComponent` — `frontend/src/app/features/patients/patients.component.ts`

**What it does:** Patient registry — list, search, create, edit, delete patients with confirmation overlay.

| Signal | Type | Purpose |
|--------|------|---------|
| `patients` | `Patient[]` | Full patient list |
| `loading` | `boolean` | Loading state |
| `error` | `string \| null` | Error message |
| `searchTerm` | `string` | Search input |
| `deleteTarget` | `Patient \| null` | Confirmation overlay target |
| `deleting` | `boolean` | Deletion in progress |

**Computed signals:**
- `filteredPatients` — filters by name or CPF against `searchTerm()`

**Pure functions:**
- `filteredPatients()` — array filter + string includes (unit testable)
- `formatDate(dateStr)` — date string reformatting from `YYYY-MM-DD` to `DD/MM/YYYY`
- `formatGender(gender)` — maps `M/F/O` to Portuguese labels via `GENDER_MAP`

**Async methods:**
- `loadPatients()` → calls `patientService.getPatients()`
- `confirmDelete()` → calls `patientService.deletePatient(id)`

**Edge cases to test:**
- Empty search shows all patients
- No matching search shows "no results" empty state
- No clinic context shows empty state (not error)
- Delete confirmation overlay appears and dismisses
- `formatGender` returns `-` for null/unknown gender codes

---

### 3.3 `InventoryComponent` — `frontend/src/app/features/inventory/inventory.component.ts`

**What it does:** Product inventory management — displays products in a card grid, shows stock levels, allows creating new products via modal.

| Signal | Type | Purpose |
|--------|------|---------|
| `products` | `Product[]` | Full product list |
| `loading` | `boolean` | Loading state |
| `error` | `string \| null` | Error message |
| `selectedCategory` | `string` | Category filter |
| `canViewCost` | `computed<boolean>` | IAM permission check |

**Computed signals:**
- `totalValue` — sum of `price * current_stock` for filtered products
- `lowStockCount` — count where `current_stock < min_stock`
- `categories` — unique category list derived from products
- `filteredProducts` — filters by `selectedCategory`

**Pure functions:**
- `totalValue()` — reduce sum (unit testable with mock products)
- `lowStockCount()` — filter + length (unit testable)
- `categories()` — `Set` construction + spread (unit testable)
- `filteredProducts()` — array filter (unit testable)

**Async methods:**
- `loadProducts()` → calls `inventoryService.getProducts()`
- `openNewProductModal()` → opens dialog, handles optimistic update on success

**Edge cases to test:**
- Products below `min_stock` show red alert styling
- `canViewCost` computed from IAM — tests `iam.can('inventory.view_cost')`
- Empty state when no products
- Category filter only shows when `categories.length > 2`

---

### 3.4 `ClinicalComponent` — `frontend/src/app/features/clinical/clinical.component.ts`

**What it does:** Medical record management — patient sidebar with search, record form (chief complaint, observations, diagnosis, prescriptions), AI assist placeholder, record history panel.

| Signal | Type | Purpose |
|--------|------|---------|
| `patients` | `Patient[]` | Loaded patients for sidebar |
| `selectedPatient` | `Patient \| null` | Currently selected patient |
| `searchTerm` | `string` | Patient search |
| `focusMode` | `boolean` | Focus mode toggle |
| `saving` | `boolean` | Save in progress |
| `aiLoading` | `boolean` | AI processing |
| `records` | `MedicalRecord[]` | Patient's record history |
| `saveError` | `string \| null` | Save error |
| `recordsOpen` | `boolean` | History panel visibility |
| `recordsError` | `string \| null` | Records load error |
| `canWrite` | `computed<boolean>` | IAM permission check |

**Computed signals:**
- `filteredPatients` — filters by name or CPF
- `selectedClinicId` — alias to `clinicContext.selectedClinicId`

**Pure functions:**
- `filteredPatients()` — array filter + string includes (unit testable)
- `calculateAge(birthDate)` — date arithmetic (unit testable)

**Async methods:**
- `loadPatients()` → calls `patientService.getPatients()`
- `saveRecord()` → calls `clinicalService.createRecord()` + `loadRecords()`
- `loadRecords(patientId)` → calls `clinicalService.getRecordsByPatient()`
- `assistWithAI()` — placeholder, uses `setTimeout` (mock-friendly)

**Edge cases to test:**
- `calculateAge` handles leap year edge cases
- `calculateAge` handles future dates (returns 0)
- `saveRecord` checks `canWrite()` before proceeding
- Empty `chief_complaint` disables save button
- Record type defaults to `'EVOLUCAO'`
- `toggleFocusMode` toggles boolean signal
- `toggleRecords` toggles history panel

---

### 3.5 `ReportsComponent` — `frontend/src/app/features/reports/reports.component.ts`

**What it does:** Operational dashboard — KPI cards (stock value, patients today, low stock count, movements), bar charts for weekly stock flow, appointment density chart, expiry audit table.

| Signal | Type | Purpose |
|--------|------|---------|
| `products` | `Product[]` | Loaded products |
| `appointmentsToday` | `Appointment[]` | Today's appointments |
| `recentAppointments` | `Appointment[]` | Recent appointments for density chart |
| `isLoading` | `boolean` | Loading state |
| `totalMovements` | `number` | Hardcoded to 42 (simulated) |
| `canViewFinance` | `computed<boolean>` | IAM permission check |

**Computed signals:**
- `totalStockValue` — `reduce` sum of `current_stock * cost`
- `lowStockCount` — filter where `current_stock <= min_stock`
- `todayAppointmentsCount` — appointments array length
- `expiryAlerts` — filter where `current_stock === 0 && min_stock > 0`, capped at 10
- `weeklyData` — generates 7 days of random in/out data
- `maxTransactionValue` — `Math.max` over weekly data
- `appointmentDensity` — builds hour distribution map from appointments
- `maxDensityValue` — `Math.max` over density

**Pure functions:**
- `totalStockValue()` — reduce sum with `toLocaleString` (unit testable)
- `lowStockCount()` — filter + length (unit testable)
- `todayAppointmentsCount()` — array length (unit testable)
- `expiryAlerts()` — filter + slice (unit testable)
- `weeklyData()` — pure computation with `Math.random` (note: random makes deterministic testing harder — consider seeding)
- `maxTransactionValue()` — `Math.max` (unit testable)
- `appointmentDensity()` — `reduce` into `Record<string, number>` (unit testable)
- `maxDensityValue()` — `Math.max` (unit testable)

**Async methods:**
- `loadData()` (via `ngOnInit`) → calls 3 services in parallel with `Promise.all` + `.catch(() => [])`

**Edge cases to test:**
- `canViewFinance` — if false, KPI card shows "Acesso Restrito" instead of value
- Empty `recentAppointments` shows fallback density array with 7 hours
- `appointmentDensity` sorts keys chronologically
- `expiryAlerts` capped at 10 items

---

## 4. Modal Components

### 4.1 `AppointmentModalComponent`

**Async methods:**
- `ngOnInit` — parallel load of patients + doctors
- `save()` — calls `appointmentService.createAppointment()`

**Pure functions:**
- `filteredPatients()` — search filter on patient array
- `isFieldInvalid(field)` — reactive form validation check

**IAM check:**
- `save()` checks `iam.can('appointments.write')` before proceeding

### 4.2 `PatientModalComponent`

**Async methods:**
- `save()` — calls `patientService.createPatient()` or `updatePatient()`

**IAM check:**
- `save()` checks `iam.can('patients.write')` before proceeding

### 4.3 `ProductModalComponent`

**Async methods:**
- `onSubmit()` — calls `inventoryService.createProduct()`

**IAM check:**
- `onSubmit()` checks `iam.can('inventory.write')` before proceeding

---

## 5. Calendar Component

### `AgendaCalendarComponent` — `frontend/src/app/features/reception/agenda-calendar.component.ts`

| Signal | Type |
|--------|------|
| `currentDate` | `Date` |
| `selectedDoctor` | `string \| null` |
| `doctors` | `{id, name}[]` |
| `appointments` | `Appointment[]` |

**Computed signals:**
- `weekDays` — generates 7-day week array from `currentDate`
- `currentWeekLabel` — formats date range string

**Pure functions:**
- `weekDays()` — date arithmetic (Monday calculation, isToday check)
- `currentWeekLabel()` — date formatting with month names
- `getAppointmentsForSlot(date, hour)` — filters appointments by date + hour + doctor
- Navigation methods: `previousWeek()`, `nextWeek()`, `resetToToday()`

**Async methods:**
- `loadData()` — parallel load of doctors + recent appointments

**Edge cases to test:**
- Week starts on Monday (not Sunday)
- `getAppointmentsForSlot` with no doctor filter returns all matching appointments
- `getAppointmentsForSlot` with doctor filter only returns matching doctor
- `triggerNewAppointment` emits ISO date string with time

---

## 6. Login Component

### `LoginComponent` — `frontend/src/app/features/auth/login.component.ts`

**Pure functions:**
- Form validation via Reactive Forms (Validators)

**Async methods:**
- `onSubmit()` — calls `authStore.login()`

**Integration point:**
- Success navigates to `/reception`
- Error displays via `authStore.error` signal

---

## 7. Admin Panel

### `AdminPanelComponent`

**Async methods:**
- `loadSaaSData()` — multiple Supabase queries in sequence: user count, pending request count, recent users, clinics, ui_modules, clinic_modules
- `toggleModule(clinicId, moduleKey, newValue)` — upsert pattern (update if exists, insert if not)

**Pure functions:**
- `getClinicModules(clinicId)` — maps global modules to clinic-specific state

---

## 8. Summary — Test Inventory

### By Category

| Category | Count | Notes |
|----------|-------|-------|
| Services (async methods needing mock) | 17 | All Supabase calls |
| Services (pure sync methods) | 7 | IAM engine, signal updates |
| Store methods (async) | 2 | `login`, `logout` |
| Store signals/computed | 5 | State accessors |
| Component computed signals | 15+ | Derive UI state |
| Component pure methods | 12+ | Formatting, filtering |
| Component async methods | 15+ | Load data, save, delete |
| Component effects | 5 | Context-driven reloads |
| IAM `can()` scenarios | 7+ | Authorization matrix |

### Priority Recommendation

1. **Tier 1 — IAM Engine** (`IAMService.can()`, `evaluateContextPermissions()`): Core security logic, pure functions, no I/O. Highest ROI for unit tests.
2. **Tier 2 — Pure Computed Logic** (all `computed()` signals in components, `filteredPatients`, `totalValue`, `calculateAge`, etc.): Deterministic, easy to test with parametrised inputs.
3. **Tier 3 — Service Layer** (all async methods): Require Supabase mock setup but cover critical data paths.
4. **Tier 4 — Component Integration** (effects, dialog handlers): More brittle, consider Playwright E2E for these paths.

### Mocking Strategy

| Layer | Mock Target |
|-------|-------------|
| Services | `SupabaseService.clientInstance` — replace with `createMockClient()` |
| Auth | `supabase.auth` methods |
| IAM | `from('iam_roles').select()`, `from('app_user').select()` |
| Stores | Mock injected `AuthService`, `SupabaseService` |

### Files to Create Test First

```
frontend/src/app/core/services/iam.service.spec.ts   ← can(), evaluateContextPermissions()
frontend/src/app/core/services/patient.service.spec.ts
frontend/src/app/core/services/appointment.service.spec.ts
frontend/src/app/core/store/auth.store.spec.ts
frontend/src/app/features/patients/patients.component.spec.ts
frontend/src/app/features/reception/reception.component.spec.ts
frontend/src/app/features/clinical/clinical.component.spec.ts
frontend/src/app/features/inventory/inventory.component.spec.ts
frontend/src/app/features/reports/reports.component.spec.ts
```
