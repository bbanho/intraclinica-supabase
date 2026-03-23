---
title: "Deep Dive Exaustivo (Relatório Cru)"
description: "Análise linha a linha das rotas, ações, fluxos de UI e RLS do sistema legado e novo."
---

# Exhaustive Deep Dive Report: IntraClinica SaaS

This document is the result of an exhaustive and meticulous analysis of the IntraClinica repository, covering the current frontend (`/frontend/`), the legacy frontend (`/archive/frontend-legacy/`), and the Supabase database migrations (`/supabase/migrations/`).

## Table of Contents
1. [Database Schema & Backend Logic (Supabase)](#database-schema--backend-logic-supabase)
2. [Current Frontend Architecture & UI Flows](#current-frontend-architecture--ui-flows)
3. [Legacy Frontend Architecture & UI Flows](#legacy-frontend-architecture--ui-flows)
4. [Artificial Intelligence Integrations](#artificial-intelligence-integrations)
5. [Business Rules, Validations, and IAM Enforcement](#business-rules-validations-and-iam-enforcement)
6. [API Surface & RPC Calls](#api-surface--rpc-calls)
7. [Frontend IAM Service (IamService)](#7-frontend-iam-service-iamservice)
8. [MainLayoutComponent — IAM-Driven Sidebar](#8-mainlayoutcomponent--iam-driven-sidebar)

---

## Database Schema & Backend Logic (Supabase)

### Architecture Shift: Flat Actor Model & JSONB IAM
The most significant architectural decision in the backend is the migration from a polymorphic `actor` table to a flat `app_user` and `patient` model.
- **`app_user`**: Contains authentication and authorization data. Replaced all legacy `actor_id` references (Supabase Migration `20260323000001`). Includes a crucial JSONB column `iam_bindings` that dictates multi-tenant access.
- **`patient`**: Flat structure containing personal data (name, phone, birth date) tied directly to a `clinic_id`.

### The IAM Core System (Cloud Console Pattern)
Authorization relies on a "1. Role -> 2. Grant -> 3. Block" hierarchical evaluation per clinic context, mirroring enterprise cloud consoles (like GCP/AWS).
- **`iam_permissions`**: A dictionary of atomic actions (e.g., `inventory.view_cost`, `appointments.call`).
- **`iam_roles`**: Base packages of permissions with a hierarchical `level` (0 = Super Admin, 10 = Clinic Admin, 20 = Doctor, 30 = Stock Manager, 40 = Reception).
- **`has_permission()` RPC**: A highly optimized Security Definer function that evaluates:
  1. Does the user have a specific **block** for this permission in this clinic? (If yes, return FALSE).
  2. Does the user have a specific **grant**? (If yes, return TRUE).
  3. Do the user's assigned **roles** contain this permission? (If yes, return TRUE).
  This evaluation happens both locally (per `clinic_id`) and globally (across the SaaS).

### Row Level Security (RLS) & Security Definer Functions
Data isolation between tenants is strictly enforced at the database level.
- `has_clinic_access(target_clinic_id)`: Checks if the user is a `SUPER_ADMIN` or if `target_clinic_id` exists in their `iam_bindings` JSON.
- `has_clinic_role(target_clinic_id, target_role)`: Checks if the specific role is present in the `iam_bindings->clinic_id` array.
- `is_super_admin()`: Simple check on the static `role` column.

### Triggers & Constraints
- **Appointment Conflict Prevention**: An EXCLUDE constraint using GiST indexes and `tstzrange` combined with a PL/pgSQL trigger (`trg_appointment_conflict_check`). It strictly prevents a `doctor_id` from having overlapping appointments, failing the transaction with a custom error message (`P0001`).

### Remote Procedure Calls (RPCs)
To ensure atomicity, complex operations are wrapped in RPCs:
- **`create_product_with_stock`**: Atomically inserts a `product` (forcing `current_stock` to 0 to respect triggers) and subsequently inserts an "IN" `stock_transaction` if initial stock > 0.
- **`create_medical_record`**: Atomically inserts a `clinical_record` (type: EVOLUCAO, EXAME, RECEITA, TRIAGEM), verifying clinic access and ensuring the JSONB content is not null.

---

## Current Frontend Architecture & UI Flows

The current frontend (`/frontend/`) is a modern Angular 18+ application built on a Strict Standalone Architecture, using Signals exclusively for reactivity and state management.

### Core Architecture
- **Control Flow**: Uses strictly `@if`, `@for`, `@switch` instead of legacy structural directives.
- **Reactivity**: 100% Signal-based (`signal()`, `computed()`, `effect()`). Dependency injection uses the `inject()` function.
- **Context Injection**: Almost all features use `ClinicContextService` which exposes a `selectedClinicId` signal. Services proactively validate this context.
- **Styling**: Tailwind CSS exclusively. Uses `lucide-angular` for iconography.

### UI Screens & Usage Flows

#### 1. Reception (`/reception`)
- **Purpose**: Manage the daily waiting list and coordinate patient flows.
- **Flow**: Displays today's appointments and supports status transitions. Creation uses `AppointmentModalComponent` via CDK dialog.

#### 2. Clinical (`/clinical`)
- **Purpose**: The electronic medical record (EMR) interface for doctors.
- **Flow**: Selecting a patient loads history. Medical Record Form supports types: `EVOLUCAO`, `RECEITA`, `EXAME`, `TRIAGEM`.

#### 3. Inventory (`/inventory`)
- **Purpose**: Manage products, stock levels, and costs.
- **Flow**: Displays products with low stock alerts. Creation uses `ProductModalComponent` via the `create_product_with_stock` RPC.

#### 4. Patients (`/patients`)
- **Purpose**: Master registry of patients.
- **Flow**: Table with search (name/CPF) and inline delete confirmation.

#### 5. Admin Panel (`/admin`)
- **Purpose**: High-level clinic configuration and testing the "Fail-Loud" architecture.

---

## Legacy Frontend Architecture & UI Flows

Located in `/archive/frontend-legacy/frontend-old/`, this version uses Angular 21 (experimental) and NgRx.

### Additional Modules
- **Procedures (`/procedures`)**: Handles executing clinical procedures that automatically deduct inventory stock.
- **Reports (`/reports`)**: Maps to the `finance.read` IAM permission.
- **Social (`/social`)**: Hooks into the Gemini AI service to generate social media marketing content.

---

## Artificial Intelligence Integrations

The repository has a strong emphasis on AI, divided into Cloud (Gemini) and Local/On-Device (WebLLM) processing.

### 1. Cloud AI (`GeminiService`)
Implemented using the `@google/genai` SDK (`gemini-2.5-flash`).
- **Capabilities**: Live Connect, Inventory Risk Analysis, Strategic Insights, Social Media Content, Clinical Audio Processing.

### 2. On-Device AI (`LocalAiService`)
Implemented using `@mlc-ai/web-llm` and `@tensorflow/tfjs` for HIPAA/LGPD compliance.
- **Usage**: Formats raw text inputs into professional clinical evolutions purely on the user's device.

---

## Business Rules, Validations, and IAM Enforcement

1. **Strict Context Isolation**: The frontend passes the `clinic_id` in almost every request.
2. **"Fail-Loud" Principle**: If the frontend sends an unauthorized request, the backend rejects it, and the UI shows a "Acesso Restrito" error signal.
3. **Wiki Access Policy**: Access to internal documentation (`/wiki`) is gated by the `clinics.manage` OR `ai.use` permission (`wiki.component.ts`).
4. **Doctor Scheduling Constraints**: Double-booking a doctor is blocked by the database EXCLUDE constraint.
5. **No Static Roles**: A user is only a "Doctor" if their `iam_bindings` JSON object explicitly grants them the `roles/doctor` package.

---

## API Surface & RPC Calls

### Frontend Services -> Supabase Endpoints

| Feature | Service | Action | Supabase Target / RPC | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `AuthService` | Login / Logout | `auth.signInWithPassword` | Native Supabase Auth |
| **IAM** | `IamService` | Permission Check | `iam.can(permissionKey)` | Local Signal-based resolution |
| **Context**| `ClinicContextService` | Fetch Clinics | `from('app_user')` | Reads `iam_bindings` keys |
| **Patients**| `PatientService` | CRUD | `from('patient')` | Filtered by RLS |
| **Appointments**| `AppointmentService` | Fetch Agenda | `from('appointment')` | Joined with `patient` |
| **Appointments**| `AppointmentService` | Fetch Doctors | `from('app_user')` | `.contains('iam_bindings', ...)` |
| **Inventory** | `InventoryService` | Create Product | `rpc('create_product_with_stock')` | Atomic stock init |
| **Clinical**| `ClinicalService` | Add Record | `rpc('create_medical_record')` | Atomic medical insert |

---

## 7. Frontend IAM Service (`IamService`)

The `IamService` (`frontend/src/app/core/services/iam.service.ts`) is the central brain for client-side authorization. It avoids repeated network calls by caching the entire IAM matrix in high-performance Signals.

### Signal-based Caching Architecture
- `_roles = signal<Map<string, IamRole>>(new Map())`: O(1) lookup for role definitions.
- `_userBindings = signal<UserIamBindings | null>(null)`: Reactive store for the user's permission JSONB.
- `isInitialized = signal<boolean>(false)`: Synchronization guard for navigation.

### The `can(permissionKey)` Method
This method is the primary API for authorization. It returns `false` if the service is not yet initialized or if the user lacks the permission.

```typescript
public can(permissionKey: string): boolean {
  if (!this.isInitialized()) return false;
  // 1. Evaluate Local Clinic Context
  // 2. Fallback to Global SaaS Context
  // 3. Evaluation Order: Block -> Grant -> Role
}
```

### Hierarchy Evaluation (The Funnel)
The private `evaluateContextPermissions` helper implements the "Fail-Loud" logic:
1. **Cherry-picked Block**: If the `permissionKey` is in the `blocks` array, it returns `false` immediately (Absolute Deny).
2. **Cherry-picked Grant**: If in the `grants` array, it returns `true`.
3. **Role Resolve**: If not explicitly granted/blocked, it checks if any assigned `roles` contain the permission in their `default_grants`.

### Initialization Workflow
The service uses an `effect()` in the constructor to react to `AuthService` state changes. When a user logs in, `initializeIamCache()` is called to fetch `iam_roles`, `iam_permissions`, and the user's `iam_bindings` in a single `Promise.all` batch.

### Permission Catalog (19 Atomic Actions)

| Module | Permission Key | Name | Description |
| :--- | :--- | :--- | :--- |
| **Reception** | `appointments.read` | Ver Agenda | Visualizar horários e consultas |
| **Reception** | `appointments.write` | Gerenciar Agenda | Criar, editar e cancelar consultas |
| **Reception** | `appointments.call` | Chamar Paciente | Alterar status para Chamado e definir sala |
| **Patients** | `patients.read_demographics` | Ver Cadastro | Ver nome, CPF e contatos |
| **Patients** | `patients.write` | Gerenciar Pacientes | Cadastrar e editar dados demográficos |
| **Clinical** | `clinical.read_records` | Ver Prontuário | Ler histórico clínico e exames |
| **Clinical** | `clinical.write` | Atendimento Clínico | Criar evoluções e receitas |
| **Clinical** | `clinical.perform_procedure` | Realizar Procedimento | Executar procedimento com débito de estoque |
| **AI** | `ai.use` | Utilizar IA | Acesso aos recursos WebLLM e Gemini |
| **Inventory** | `inventory.read` | Ver Estoque Base | Ver lista de produtos e quantidades |
| **Inventory** | `inventory.write` | Operar Estoque | Dar baixa e adicionar itens |
| **Inventory** | `inventory.view_cost` | Ver Custos | Visualizar preço de custo e fornecedores |
| **Finance** | `finance.read` | Ver Dashboards | Acesso a métricas e DRE |
| **Marketing** | `marketing.write` | Gerar Marketing | Criar posts e campanhas via AI |
| **Admin** | `users.manage` | Gerenciar Equipe | Adicionar usuários e gerenciar permissões |
| **Admin** | `clinics.manage` | Configurações | Editar dados do tenant e módulos |

---

## 8. MainLayoutComponent — IAM-Driven Sidebar

The `MainLayoutComponent` (`frontend/src/app/layout/main-layout.component.ts`) uses the `IamService` to dynamically adapt the UI to the user's capabilities.

### Reactive Context Switching (RxJS Pattern)
The clinic selection list is reactive. It uses `toObservable(iam.userBindings)` to watch for authorization changes and `switchMap` to query the authorized clinics from Supabase:

```typescript
myClinics = toSignal(
  toObservable(this.iam.userBindings).pipe(
    switchMap(bindings => {
      const allowedClinicIds = Object.keys(bindings).filter(k => k !== 'global');
      return from(this.db.from('clinic').select('id, name').in('id', allowedClinicIds));
    })
  )
);
```

### Dynamic Module Visibility
The sidebar template uses `@if (iam.can('module.read'))` blocks to ensure users only see menu items they are authorized to access.
- **Auto-Selection Logic**: If the user has no global bindings, the layout automatically selects the first available clinic context.
- **Context Switcher**: The clinic dropdown is disabled if the user lacks `clinics.manage` or `users.manage` permissions, locking them into their assigned context.
