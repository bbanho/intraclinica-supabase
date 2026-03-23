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

---

## Database Schema & Backend Logic (Supabase)

### Architecture Shift: Flat Actor Model & JSONB IAM
The most significant architectural decision in the backend is the migration from a polymorphic `actor` table to a flat `app_user` and `patient` model.
- **`app_user`**: Contains authentication and authorization data. Replaced `actor_id` references. Includes a crucial JSONB column `iam_bindings` that dictates multi-tenant access.
- **`patient`**: Flat structure containing personal data (name, phone, etc.) tied to a `clinic_id`.

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
- **`create_product_with_stock`**: Atomically inserts a `product` (forcing `current_stock` to 0 to respect triggers) and subsequently inserts an "IN" `stock_transaction` if initial stock > 0. It handles mapping the DB column `avg_cost_price` to the frontend expected `cost` property.
- **`create_medical_record`**: Atomically inserts a `clinical_record` (type: EVOLUCAO, EXAME, RECEITA, TRIAGEM), verifying clinic access and ensuring the JSONB content is not null.

---

## Current Frontend Architecture & UI Flows

The current frontend (`/frontend/`) is a modern Angular 17+ application built on a Strict Standalone Architecture, using Signals exclusively for reactivity and state management, and `@angular/cdk/dialog` for floating UIs.

### Core Architecture
- **Control Flow**: Uses strictly `@if`, `@for`, `@switch` instead of legacy structural directives.
- **Reactivity**: 100% Signal-based (`signal()`, `computed()`, `effect()`). Dependency injection uses the `inject()` function.
- **Context Injection**: Almost all features use `ClinicContextService` which exposes a `selectedClinicId` signal. Services proactively validate this context (often returning empty or failing early if `clinicId` is null or 'all').
- **Styling**: Tailwind CSS exclusively. Uses `lucide-angular` for iconography.

### UI Screens & Usage Flows

#### 1. Reception (`/reception`)
- **Purpose**: Manage the daily waiting list and coordinate patient flows.
- **Flow**:
  - Displays a dashboard of today's appointments.
  - Supports status transitions: "Agendado" -> "Aguardando" -> "Em Consulta" -> "Finalizado".
  - **`AppointmentModalComponent`**: Accessible via a floating CDK dialog. It allows creating new appointments by capturing:
    - `patientId` (Dropdown populated via `PatientService.getPatients()`)
    - `date` and `time` (Input merged to ISO timestamp)
    - `doctorId` (Dropdown populated via `AppointmentService.getDoctors()`, which queries `app_user` for actors with `DOCTOR` IAM role)
    - Saves via `appointmentService.createAppointment()`.

#### 2. Clinical (`/clinical`)
- **Purpose**: The electronic medical record (EMR) interface for doctors.
- **Flow**:
  - Features a sidebar to select patients.
  - Selecting a patient loads their history (`ClinicalService.getRecordsByPatient()`).
  - **Medical Record Form**: Allows adding records of types: `EVOLUCAO`, `RECEITA`, `EXAME`, `TRIAGEM`.
  - **WebLLM AI Button**: A placeholder UI action (`assistWithAI()`) for on-device medical text inference/summarization.
  - Submitting a record uses the RPC `create_medical_record` to guarantee atomicity.

#### 3. Inventory (`/inventory`)
- **Purpose**: Manage products, stock levels, and costs.
- **Flow**:
  - Displays a grid of products with low stock alerts and total value summaries.
  - **`ProductModalComponent`**: Accessible via a CDK dialog. Allows creating new products with fields:
    - `name`, `category`, `barcode`
    - `cost` and `price` (financials)
    - `current_stock` (initial stock to seed) and `min_stock`.
    - Saving invokes the RPC `create_product_with_stock` to atomically create the product and its initial `IN` stock transaction.

#### 4. Patients (`/patients`)
- **Purpose**: Master registry of patients.
- **Flow**:
  - Presents a table with search capabilities (by name or CPF).
  - Contains inline delete confirmation overlays.
  - **`PatientModalComponent`**: Accessible via a CDK dialog. Allows creating or editing a patient.
    - Captures `name`, `cpf`, `phone`, `birth_date`, `gender`.
    - Handles branching logic to call either `PatientService.createPatient()` or `PatientService.updatePatient()`.

#### 5. Admin Panel (`/admin`)
- **Purpose**: High-level clinic configuration and testing the "Fail-Loud" architecture.
- **Flow**:
  - Toggles SaaS multi-tenant modules (interacting with a `clinic_module` configuration table).
  - Explicitly contains functions to inject intentional errors to prove that RLS and IAM blocks are strictly enforced by the Supabase backend.

---

## Legacy Frontend Architecture & UI Flows

Located in `/archive/frontend-legacy/frontend-old/`, this version uses Angular 21 (experimental/pre-release features) and NgRx for state management. It provides a broader scope of features compared to the current frontend.

### Additional Modules
- **Procedures (`/procedures`)**: Contains a `procedure-recipe.component.ts`. Likely handles executing clinical procedures that automatically deduct inventory stock.
- **Reports (`/reports`)**: Contains `reports.component.ts`. Likely maps to the `finance.read` IAM permission, displaying metrics and DRE.
- **Social (`/social`)**: Contains `social.component.ts`. An interesting module that hooks into the Gemini AI service to generate social media marketing content.

---

## Artificial Intelligence Integrations

The repository has a strong emphasis on AI, divided into Cloud (Gemini) and Local/On-Device (WebLLM) processing.

### 1. Cloud AI (`GeminiService`)
Implemented using the `@google/genai` SDK.
- **Models**: `gemini-2.5-flash` and `gemini-2.0-flash`.
- **Capabilities**:
  - **Live Connect**: Exposes `ai.live.connect()` for real-time interactions.
  - **Inventory Risk Analysis**: Analyzes inventory JSON data to identify low stock, overstock, or expiration risks, returning Markdown.
  - **Strategic Insights**: Acts as a clinical management consultant, analyzing clinic data to suggest schedule optimizations, cost-saving opportunities, and stock audits.
  - **Social Media Content**: Generates JSON containing captions and hashtags for promotional clinic posts based on a topic and tone.
  - **Clinical Audio Processing**: Acts as a medical scribe, extracting Symptoms, Vitals, and an Action Plan from a raw audio/wav file.

### 2. On-Device AI (`LocalAiService`)
Implemented using `@mlc-ai/web-llm` and `@tensorflow/tfjs` for strict patient data privacy (HIPAA/LGPD compliance).
- **WebGPU Detection**: Dynamically imports TensorFlow.js to probe for WebGPU support to prevent breaking lazy-loading on unsupported devices.
- **Available Models**:
  - `Gemma-2b-it-q4f16_1-MLC`: Low requirement (mobile/basic).
  - `Phi-3-mini-4k-instruct-q4f16_1-MLC`: Medium requirement (balanced).
  - `Llama-3-8B-Instruct-q4f16_1-MLC`: High requirement (dedicated hardware).
- **Usage**: Formats raw text inputs into clear, professional clinical evolutions purely on the user's device.

---

## Business Rules, Validations, and IAM Enforcement

1. **Strict Context Isolation**: The frontend is responsible for passing the `clinic_id` in almost every request. If a user sets their context to "Todas as Clínicas" (`'all'`), local operations like adding inventory or scheduling appointments fail proactively.
2. **"Fail-Loud" Principle**: The architecture relies on the database to strictly block unauthorized actions. If the frontend sends an invalid request, Supabase RLS or the `has_permission()` RPC will reject it, and the frontend will show a generic error rather than silently failing or hiding data.
3. **Product Creation Atomicity**: Products cannot be created independently of their initial stock transaction if an initial quantity is provided. This is enforced by the database RPC.
4. **Doctor Scheduling Constraints**: It is physically impossible to double-book a doctor within the system. The database uses GiST indexes on timestamps to block overlapping appointments at the transaction level.
5. **No Static Roles**: A user is only a "Doctor" if their `iam_bindings` JSON object explicitly grants them the `roles/doctor` package for that specific `clinic_id`. This prevents a doctor from one clinic from accessing medical records in another clinic unless explicitly granted.

---

## API Surface & RPC Calls

### Frontend Services -> Supabase Endpoints

| Feature | Service | Action | Supabase Target / RPC | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `AuthService` | Login / Logout | `auth.signInWithPassword`, `auth.signOut` | Uses Supabase native auth |
| **Context**| `ClinicContextService` | Fetch Clinics | `from('app_user')` | Reads `iam_bindings` keys |
| **Patients**| `PatientService` | CRUD | `from('patient')` | Filtered automatically by RLS |
| **Appointments**| `AppointmentService` | Fetch Agenda | `from('appointment')` | Joined with `patient` and `app_user` |
| **Appointments**| `AppointmentService` | Fetch Doctors | `from('app_user')` | Uses JSONB query: `.contains('iam_bindings', { [clinicId]: ['DOCTOR'] })` |
| **Appointments**| `AppointmentService` | Create | `from('appointment').insert()` | Validated by `trg_appointment_conflict_check` |
| **Inventory** | `InventoryService` | Create Product | `rpc('create_product_with_stock')` | Guarantees atomic stock init |
| **Clinical**| `ClinicalService` | Add Record | `rpc('create_medical_record')` | Guarantees access validation and JSONB integrity |
| **Clinical**| `ClinicalService` | Fetch Records | `from('clinical_record')` | Joined with `app_user` for doctor name |
| **Admin** | `AdminPanelComponent` | Test Errors | Multiple | Purposefully violates constraints to test RLS |
