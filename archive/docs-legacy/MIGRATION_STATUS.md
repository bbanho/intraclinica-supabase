# Status da Migração de Arquitetura - Intraclinica

**Data:** 17/01/2026
**Objetivo:** Migrar de Monólito de Serviços para Arquitetura Modular (NgRx + Supabase Services Isolados).

## ✅ Módulos Migrados

### 1. Core / Auth
- **Estado:** `Core/Store/Auth` (NgRx Global)
- **Serviço:** `SupabaseService` (Singleton) e `AuthService` (Facade para NgRx)
- **Componentes:** `LoginComponent` refatorado para usar `Store.dispatch` e `Store.selectSignal`.
- **Status:** Completo e Testável.

### 2. Inventory (Estoque)
- **Estado:** `Features/Inventory/Store` (NgRx Feature State - Lazy Loaded)
- **Serviço:** `InventoryService` (Isolado, chama Supabase direto)
- **Componentes:** `InventoryComponent` refatorado.
- **Status:** Completo.

## 🚧 Em Progresso / Pendente

### 3. Patients & Clinical
- **Estado Atual:** Usa `DatabaseService` (Legado).
- **Ação Necessária:** Criar `PatientService`, `PatientStore` e migrar `ClinicalComponent`.

### 4. Reception & Appointments
- **Estado Atual:** Usa `DatabaseService` (Legado).
- **Ação Necessária:** Criar `AppointmentService` e migrar `ReceptionComponent`.

### 5. Admin Panel & Reports
- **Estado Atual:** Usa `DatabaseService` com erros de tipagem conhecidos.
- **Ação Necessária:** Refatorar para Stores específicos de Administração.

## 🐛 Erros Conhecidos (Tech Debt)
1. `src/app/features/reports/reports.component.ts`: Erro de assinatura em chamada de função (linha 222).
2. `src/app/layout/main-layout.component.ts`: Erro de assinatura em chamada de função (linha 298).

## 📦 Arquitetura de Pastas (Target)
```text
src/app/
├── core/
│   ├── store/             # Estado Global (Auth)
│   ├── services/          # Serviços Singleton (Supabase, Print)
├── features/
│   ├── inventory/
│   │   ├── data/          # InventoryService
│   │   ├── store/         # NgRx (Actions, Reducer, Effects)
│   │   └── inventory.component.ts
```
