# IntraClinica Supabase — Arquitetura Atual

> Documento gerado em: 2026-03-21  
> Branch: `main` — commit `595723b`  
> Stack: Angular 21 (standalone) + Supabase (Postgres + PostgREST + Auth) + NgRx 18

---

## 1. Visão Geral

IntraClinica é um SaaS multi-tenant para gestão de clínicas médicas. Cada **tenant** é uma `clinic`. Um usuário (`app_user`) pertence a uma clínica e tem um role IAM. O `SUPER_ADMIN` opera em visão global (`context = 'all'`) e pode alternar para qualquer clínica.

### Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Angular 21, standalone components, Angular Signals |
| State management | NgRx 18 (parcial) + Angular Signals (parcial) — coexistência |
| Backend | Supabase (Postgres 15 + PostgREST + GoTrue Auth) |
| ORM / Query | `@supabase/supabase-js` (client direto, sem ORM) |
| AI | Google Gemini (`@google/genai`) |
| CSS | Tailwind CSS |
| Testes E2E | Playwright 1.58 |
| Testes unitários | Vitest |

---

## 2. Estrutura de Diretórios

```
intraclinica-supabase/
├── frontend/
│   ├── src/
│   │   ├── main.ts                         # Bootstrap + NgRx provideStore
│   │   ├── types/
│   │   │   └── supabase.ts                 # Tipos gerados: supabase gen types typescript
│   │   └── app/
│   │       ├── app.component.ts            # Root shell (<router-outlet>)
│   │       ├── app.routes.ts               # Todas as rotas (lazy-loaded)
│   │       ├── core/
│   │       │   ├── config/
│   │       │   │   └── iam-roles.ts        # Roles + permissões (hardcoded TypeScript)
│   │       │   ├── guards/
│   │       │   │   └── auth.guard.ts       # Functional guard (getSession async)
│   │       │   ├── models/
│   │       │   │   ├── types.ts            # Domain types: Product, Patient, Appointment…
│   │       │   │   └── inventory.types.ts  # InventoryItem, ProcedureType, InventoryMovement
│   │       │   ├── services/
│   │       │   │   ├── database.service.ts     # GOD SERVICE — 759L (ver seção 5)
│   │       │   │   ├── inventory.service.ts    # Inventory domain (direct Supabase)
│   │       │   │   ├── patient.service.ts      # Patient/Appointment/ClinicalRecord (Observable)
│   │       │   │   ├── supabase.service.ts     # Raw Supabase client wrapper
│   │       │   │   ├── gemini.service.ts       # Google Gemini AI
│   │       │   │   ├── auth.service.ts
│   │       │   │   ├── csv-import.service.ts
│   │       │   │   ├── local-ai.service.ts
│   │       │   │   └── print.service.ts
│   │       │   └── store/
│   │       │       ├── auth/               # NgRx auth slice
│   │       │       │   ├── auth.actions.ts
│   │       │       │   ├── auth.effects.ts
│   │       │       │   ├── auth.reducer.ts
│   │       │       │   └── auth.selectors.ts
│   │       │       ├── patient/            # NgRx patient slice
│   │       │       │   ├── patient.actions.ts
│   │       │       │   ├── patient.effects.ts
│   │       │       │   ├── patient.reducer.ts
│   │       │       │   └── patient.selectors.ts
│   │       │       ├── inventory.store.ts  # Facade NgRx inventory
│   │       │       └── patient.store.ts    # Facade NgRx patient
│   │       ├── features/
│   │       │   ├── admin-panel/            # Admin + SaaS governance
│   │       │   ├── appointments/           # Appointment list (sem link no sidebar!)
│   │       │   ├── clinical/               # Prontuário IA + clinical execution
│   │       │   ├── inventory/              # Estoque + etiquetas
│   │       │   │   ├── components/         # ImportConflictModal
│   │       │   │   ├── data/
│   │       │   │   │   └── inventory.service.ts  # DUPLICADO do core/services/inventory.service.ts
│   │       │   │   └── store/              # NgRx inventory slice
│   │       │   │       ├── inventory.actions.ts
│   │       │   │       ├── inventory.effects.ts
│   │       │   │       ├── inventory.reducer.ts
│   │       │   │       └── inventory.selectors.ts
│   │       │   ├── login/
│   │       │   ├── patients/               # Lista de pacientes (sem link no sidebar!)
│   │       │   ├── procedures/             # Tipos de procedimento + receitas (sem link no sidebar!)
│   │       │   ├── reception/              # Fila + triagem
│   │       │   ├── reports/                # KPIs + análise IA
│   │       │   └── social/                 # Marketing IA
│   │       ├── layout/
│   │       │   └── main-layout.component.ts  # Sidebar + header (100% hardcoded)
│   │       └── shared/
│   │           └── directives/
│   │               └── barcode.directive.ts
│   ├── e2e/                                # Playwright E2E suite
│   │   ├── fixtures/auth.fixture.ts
│   │   ├── pages/                          # Page Object Models
│   │   └── tests/                          # auth, inventory, reception, clinical, admin specs
│   └── playwright.config.ts
├── database/
│   └── migrations/                         # Fonte da verdade das migrations
├── supabase/
│   └── migrations/                         # Cópia para supabase CLI
├── docs/
│   ├── screenshots/                        # 17 screenshots de exploração Playwright
│   ├── ISSUES_FOUND.md                     # 12 bugs catalogados
│   ├── ARCHITECTURE.md                     # Este documento
│   └── REFACTORING_PLAN.md                 # Plano de refatoração Fases 1-4
└── archive/
    └── docs-legacy/                        # 19 docs antigos arquivados
```

---

## 3. Schema do Banco de Dados

### Tabelas principais

```sql
-- Identidade
actor (id uuid PK, clinic_id uuid FK→clinic, name text, type text, created_at)
app_user (id uuid PK FK→auth.users, actor_id uuid FK→actor, clinic_id uuid FK→clinic,
          role text, iam jsonb, status text)

-- Tenant
clinic (id uuid PK, name text, plan text, status text, created_at)

-- Clínica
patient (id uuid PK FK→actor, clinic_id uuid FK→clinic, cpf text, birth_date date, gender text)
appointment (id uuid PK, clinic_id uuid FK→clinic, patient_id uuid FK→patient,
             doctor_actor_id uuid FK→actor, appointment_date timestamptz,
             status text, type text, room_number text, timestamp timestamptz)
clinical_record (id uuid PK, clinic_id uuid FK→clinic, patient_id uuid FK→patient,
                 doctor_actor_id uuid FK→actor, content text, type text, timestamp timestamptz)

-- Estoque
product (id uuid PK, clinic_id uuid FK→clinic, name text, unit text,
         current_stock numeric, min_stock numeric, avg_cost_price numeric,
         barcode text, expiry_date date, created_at)
stock_transaction (id uuid PK, clinic_id uuid FK→clinic, product_id uuid FK→product,
                   actor_id uuid FK→actor, type text, quantity numeric, reason text,
                   cost_price numeric, timestamp timestamptz)

-- Procedimentos
procedure_type (id uuid PK, clinic_id uuid FK→clinic, name text, created_at)
procedure_recipe (id uuid PK, procedure_type_id uuid FK→procedure_type,
                  item_id uuid FK→product, quantity numeric, created_at)

-- Social / Admin
social_post (id uuid PK, clinic_id uuid FK→clinic, content text, tone text,
             platform text, created_at, actor_id uuid FK→actor)
access_request (id uuid PK, email text, name text, clinic_id uuid FK→clinic,
                role text, status text, created_at)
```

### RPCs (Supabase Functions)

| RPC | Chamado por | Propósito |
|-----|------------|-----------|
| `add_stock_movement` | `DatabaseService`, `InventoryService` | Registrar movimentação de estoque |
| `add_appointment` | `DatabaseService`, `PatientService` | Criar agendamento |
| `create_patient_with_actor` | `DatabaseService`, `PatientService` | Criar paciente + actor |
| `add_clinical_record` | `DatabaseService`, `PatientService` | Criar prontuário |
| `update_user_with_actor` | `DatabaseService` | Atualizar usuário + actor |
| `create_user_with_actor` | `DatabaseService` | Criar usuário + actor |
| `perform_procedure` | `InventoryService` | Executar procedimento (baixa estoque) |

### Foreign Keys críticas da tabela `patient`

A tabela `patient` tem **duas FKs** que causam ambiguidade no PostgREST:
- `patient_id_fkey`: `patient.id → actor.id` (patient IS an actor)
- `patient_clinic_id_fkey`: `patient.clinic_id → clinic.id`

Para evitar PGRST201, sempre usar hint explícito:
```typescript
.select('actor:actor!patient_id_fkey (name, clinic_id)')
```

---

## 4. Roteamento

```
/login                  → LoginComponent (lazy)
/                       → MainLayoutComponent (guarded: authGuard)
  /                     → redirect → /inventory
  /inventory            → InventoryComponent (lazy)
  /procedures           → ProcedureRecipeComponent (lazy) ⚠️ SEM LINK NO SIDEBAR
  /pacientes            → patients routes (lazy child) ⚠️ SEM LINK NO SIDEBAR
  /consultas            → appointments routes (lazy child) ⚠️ SEM LINK NO SIDEBAR
  /reception            → ReceptionComponent (lazy)
  /clinical             → ClinicalExecutionComponent (lazy)
  /clinical-execution   → ClinicalExecutionComponent (lazy) ⚠️ ROTA DUPLICADA
  /reports              → ReportsComponent (lazy)
  /social               → SocialComponent (lazy)
  /admin                → AdminPanelComponent (lazy)
/**                     → redirect → /
```

**Estratégia de localização**: `withHashLocation()` — todas as URLs usam `/#/path`.

**Sem role guards nas rotas**: autenticação apenas (`authGuard`). Controle de acesso por role é feito dentro dos componentes via `db.checkPermission()`.

---

## 5. Padrões de Carregamento de Dados (Problema Central)

Existem **três padrões coexistindo sem dono claro**:

### Padrão A — `DatabaseService` Signals (god service)

`DatabaseService` é um singleton de 759 linhas que:
1. Mantém a própria instância do Supabase client
2. Guarda estado de todas as entidades como `signal<T[]>()`
3. Dispara `syncDataForClinic()` via `effect()` em `Promise.all` de 9 queries quando o contexto muda
4. Expõe métodos de escrita para todas as entidades
5. Implementa permission checking (`checkPermission()`)
6. Gerencia a lógica da state machine de status de agendamento

```typescript
// DatabaseService — responsabilidades misturadas
class DatabaseService {
  // Estado (signals)
  products = signal<Product[]>([]);
  appointments = signal<Appointment[]>([]);
  patients = signal<Patient[]>([]);
  clinicalRecords = signal<ClinicalRecord[]>([]);
  socialPosts = signal<SocialPost[]>([]);
  clinics = signal<Clinic[]>([]);
  users = signal<AppUser[]>([]);
  accessRequests = signal<AccessRequest[]>([]);
  currentUser = signal<AppUser | null>(null);
  selectedContextClinic = signal<string | null>(null);

  // Lógica de sincronização
  async syncDataForClinic(clinicId: string) { /* 9 queries em Promise.all */ }

  // Writes (RPC calls)
  async addTransaction(...) { }
  async addAppointment(...) { }
  async addPatient(...) { }
  async addClinicalRecord(...) { }
  async saveUser(...) { }
  async transitionAppointmentStatus(...) { }

  // Auth
  async loadUserProfile() { }
  checkPermission(permission: string): boolean { }
}
```

**Features que usam este padrão**: `AdminPanelComponent`, `SocialComponent`, `MainLayoutComponent`, `ReportsComponent` (parcialmente)

### Padrão B — NgRx Store + Effects

Três slices registrados em `main.ts`:
- `auth` → `AuthEffects` → (implícito no login component)
- `patient` → `PatientEffects` → `PatientService` → Supabase
- `inventory` → `InventoryEffects` → `features/inventory/data/inventory.service.ts` → Supabase

**Features que usam este padrão**: `LoginComponent`, `ReceptionComponent`, `PatientsListComponent`, `ReportsComponent` (parcialmente)

### Padrão C — Direct Service Calls (async/await)

Features que chamam `InventoryService` diretamente com `await`:
- `InventoryComponent` → `inventoryService.getItems()` com state local (`signal<InventoryItem[]>()`)
- `ClinicalExecutionComponent` → `inventoryService.getProcedureTypes()`, `patientService.getPatients()`
- `ProcedureRecipeComponent` → `inventoryService.getProcedureTypes()`, `getItems()`, `getRecipes()`

### Mapa de consumo por feature

| Feature | Padrão A (DatabaseService) | Padrão B (NgRx) | Padrão C (Direct) |
|---------|---------------------------|-----------------|-------------------|
| Login | — | ✅ AuthEffects | — |
| Admin Panel | ✅ clinics, users, accessRequests | — | — |
| Social | ✅ socialPosts | — | — |
| Reception | ✅ selectedContextClinic | ✅ PatientStore | — |
| Patients | — | ✅ PatientStore | — |
| Inventory | — | — | ✅ InventoryService |
| Procedures | — | — | ✅ InventoryService |
| Clinical Exec | — | — | ✅ InventoryService + PatientService |
| Reports | ✅ selectedContextClinic | ✅ InventoryStore + PatientStore | — |
| Main Layout | ✅ currentUser, clinics | — | — |

---

## 6. O que é Hardcoded vs Data-Driven

### 100% Hardcoded em TypeScript/Templates

| O que | Onde |
|-------|------|
| Itens do sidebar (5 rotas) | `main-layout.component.ts` |
| Tabs do Admin Panel (8 tabs, 2 contextos) | `admin-panel.component.ts` |
| Status de agendamento | `reception.component.ts`, `database.service.ts` |
| Tipos de consulta (Consulta/Procedimento/Retorno) | `reception.component.ts` |
| Guichês/salas (Guichê 01, Guichê 02, Triagem 01) | `reception.component.ts` |
| Planos SaaS (Starter/Pro/Enterprise) | `admin-panel.component.ts` |
| Roles IAM e permissões (10 roles, 15 permissões) | `core/config/iam-roles.ts` |
| Opções de tone social (friendly/professional/urgent) | `social.component.ts` |
| Gráfico de barras admin (array fake estático) | `admin-panel.component.ts` |
| ARR e uptime globais (valores mockados) | `database.service.ts` |
| Perfil Instagram preview ("intraclinica.oficial") | `social.component.ts` |
| State machine de status de agendamento | `database.service.ts` |
| Regras de visibilidade do sidebar por role | `main-layout.component.ts` |

### Data-Driven (vem do banco)

| O que | Tabela/RPC | Via |
|-------|-----------|-----|
| Lista de clínicas (context selector) | `clinic` | DatabaseService signal |
| Lista de usuários/staff | `app_user` + `actor` | DatabaseService signal |
| Produtos/estoque | `product` | InventoryService / NgRx |
| Fila de agendamentos | `appointment` | NgRx PatientStore |
| Lista de pacientes | `patient` + `actor` | NgRx PatientStore |
| Posts sociais | `social_post` | DatabaseService signal |
| Solicitações de acesso | `access_request` | DatabaseService signal |
| Tipos de procedimento | `procedure_type` | InventoryService direto |
| Receitas de procedimento | `procedure_recipe` | InventoryService direto |
| Prontuários | `clinical_record` | PatientService |
| KPIs (Reports) | computado de NgRx slices | Signals computados |

---

## 7. Sistema IAM

### Roles disponíveis (hardcoded em `iam-roles.ts`)

| Role | Contexto | Descrição |
|------|---------|-----------|
| `SUPER_ADMIN` | Global | Acesso total ao SaaS |
| `SAAS_SUPPORT` | Global | Suporte ao cliente |
| `SAAS_ANALYST` | Global | Analista de dados SaaS |
| `CLINIC_ADMIN` | Clínica | Administrador da unidade |
| `DOCTOR` | Clínica | Médico/profissional de saúde |
| `RECEPTION` | Clínica | Recepcionista |
| `STOCK_MANAGER` | Clínica | Gestor de estoque |
| `CONSULTANT` | Clínica | Consultor externo |
| `IT` | Global | TI/DevOps |
| `AUDITOR` | Global | Auditoria |

### Permissões (15 strings hardcoded)

```typescript
IAM_PERMISSIONS = {
  VIEW_REPORTS, MANAGE_USERS, MANAGE_INVENTORY, VIEW_PATIENTS,
  MANAGE_PATIENTS, VIEW_APPOINTMENTS, MANAGE_APPOINTMENTS,
  VIEW_CLINICAL, MANAGE_CLINICAL, VIEW_SOCIAL, MANAGE_SOCIAL,
  VIEW_ADMIN, MANAGE_ADMIN, VIEW_STOCK, MANAGE_STOCK
}
```

### ⚠️ Problema de segurança

O IAM é **frontend-only**: `db.checkPermission()` roda no browser, lendo `user.iam` da sessão. Não há RLS correspondente validado no Postgres para todas as operações. Um usuário com acesso direto à API Supabase pode contornar as permissões da UI.

---

## 8. Problemas Identificados

### Críticos (funcionais)

| ID | Problema | Status |
|----|---------|--------|
| BUG-001..010 | Ver `ISSUES_FOUND.md` | ✅ Corrigidos |
| ARCH-001 | `DatabaseService` God Service (759L, 10+ responsabilidades) | ⚠️ Pendente |
| ARCH-002 | Dois `InventoryService` com responsabilidades sobrepostas | ⚠️ Pendente |
| ARCH-003 | Três padrões de state coexistindo sem dono claro | ⚠️ Pendente |
| ARCH-004 | `appointment` e `patient` carregados por dois sistemas independentes | ⚠️ Pendente |

### Rotas/Navegação

| ID | Problema | Status |
|----|---------|--------|
| NAV-001 | `/procedures`, `/pacientes`, `/consultas` sem link no sidebar | ⚠️ Pendente |
| NAV-002 | Rota `/clinical-execution` duplicata de `/clinical` | ⚠️ Pendente |
| NAV-003 | Sidebar completamente hardcoded — não-configurável por tenant | ⚠️ Pendente (Fase 4) |

### Segurança

| ID | Problema | Status |
|----|---------|--------|
| SEC-001 | IAM frontend-only (sem RLS correspondente verificado) | ⚠️ Pendente |
| SEC-002 | State machine de status de agendamento frontend-only | ⚠️ Pendente |

---

## 9. Sentinel `'all'` — Convenção de Contexto

O signal `selectedContextClinic: signal<string | null>` usa dois sentinels especiais:

| Valor | Significado |
|-------|------------|
| `null` | Não inicializado / loading / logout |
| `'all'` | SUPER_ADMIN em visão global SaaS — **NÃO é um UUID válido** |
| `string (UUID)` | Clínica específica selecionada |

**Regra obrigatória**: todo código que passa `selectedContextClinic()` para uma query Supabase **deve** guardar contra `'all'`:

```typescript
const ctx = this.dbService.selectedContextClinic();
const clinicId = ctx === 'all' ? null : ctx;
if (!clinicId) return; // ou exibir mensagem contextual
```

---

## 10. Dados de Teste

| Item | Valor |
|------|-------|
| URL local | `http://localhost:3000` |
| Supabase project ref | `prolahgqlwfriwfpzjdm` |
| SUPER_ADMIN email | `bmbanho@gmail.com` |
| SUPER_ADMIN password | `IntraTest2026!` |
| Clínica demo ID | `cdf8cf49-b559-4c44-8533-38977611e1b4` |
| Segunda clínica ID | `3b2e08d7-3055-467d-8981-370681d43eaf` |

---

## 11. Comandos Úteis

```bash
# Dev server
cd frontend && npm run dev           # http://localhost:3000

# TypeScript check
cd frontend && ./node_modules/.bin/tsc --noEmit

# E2E tests (requer dev server rodando)
cd frontend && npm run test:e2e

# Regenerar tipos Supabase
SUPABASE_ACCESS_TOKEN=sbp_... supabase gen types typescript --linked 2>/dev/null > frontend/src/types/supabase.ts

# Aplicar migrations
SUPABASE_ACCESS_TOKEN=sbp_... supabase db push --linked
```
