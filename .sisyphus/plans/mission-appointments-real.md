# MISSION_APPOINTMENTS_REAL: Gestão Real de Agendamentos

## TL;DR
> Verificação e validação da implementação de agendamentos (`addAppointment`, `updateAppointmentStatus`, `updateAppointmentRoom`), garantindo persistência real e integridade dos dados.

**Deliverables:**
- Validação de que `addAppointment` está persistindo corretamente em `appointments`.
- Validação de `updateAppointmentStatus` e `updateAppointmentRoom`.
- Implementação de lógica de transição de status (Aguardando → Chamado → Em Atendimento).
- Build Verde.

**Estimated Effort:** Low (45 min)
**Critical Path:** Verify Current Implementation → Add Status Transition Logic → Build

---

## Context

### Estado Atual
Ao analisar o `database.service.ts`, vejo que:
- `addAppointment` já está implementado (linhas 335-353).
- `updateAppointmentStatus` já existe (linhas 387-394).
- `updateAppointmentRoom` já existe (linhas 396-403).

Estes métodos parecem **já estar funcionais** e não são stubs.

### Problema Potencial
Preciso verificar se:
1. A tabela é `appointment` (singular) ou `appointments` (plural)?
2. Há lógica de validação de transição de status?

---

## Work Objectives

### Core Objective
Garantir que os agendamentos funcionem corretamente e implementar regras de negócio para transição de status.

### Concrete Deliverables
1. **Verificação**: Confirmar nome correto da tabela (`appointment` vs `appointments`).
2. **Validação**: Testar se os métodos existentes funcionam.
3. **Feature**: Implementar método `transitionAppointmentStatus` com validação de fluxo (Agendado → Aguardando → Chamado → Em Atendimento → Realizado).

---

## Execution Strategy

### Wave 1: Investigação ✅
- [x] 1. Verificar schema.sql para nome da tabela de appointments. **RESULTADO: `appointments` (plural)**
- [x] 2. Verificar se `database.service.ts` usa o nome correto. **PROBLEMA ENCONTRADO: Usa `appointment` (singular) - INCORRETO**

### Wave 2: Implementação ✅
- [x] 3. Corrigir nome da tabela de `appointment` para `appointments` em 4 localizações.
- [x] 4. Implementar método `transitionAppointmentStatus` com validação de estados válidos.

### Wave 3: Validação
- [ ] 5. `ng build` para garantir integridade.

---

## TODO Detalhado

### Task 1: Fix Table Name (4 locations)

**File:** `frontend/src/app/core/services/database.service.ts`

**Changes:**
1. **Line 126** (inside `syncDataForClinic`):
   ```typescript
   // FROM:
   .from('appointment')
   // TO:
   .from('appointments')
   ```

2. **Line 337** (inside `addAppointment`):
   ```typescript
   // FROM:
   .from('appointment')
   // TO:
   .from('appointments')
   ```

3. **Line 389** (inside `updateAppointmentStatus`):
   ```typescript
   // FROM:
   .from('appointment')
   // TO:
   .from('appointments')
   ```

4. **Line 398** (inside `updateAppointmentRoom`):
   ```typescript
   // FROM:
   .from('appointment')
   // TO:
   .from('appointments')
   ```

---

### Task 2: Implement transitionAppointmentStatus

**File:** `frontend/src/app/core/services/database.service.ts`

**Location:** After `updateAppointmentRoom` method (around line 403)

**Code to Add:**
```typescript
  async transitionAppointmentStatus(id: string, newStatus: string): Promise<void> {
    // 1. Fetch current status
    const { data: current, error: fetchError } = await this.supabase
      .from('appointments')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      throw new Error(`Appointment not found: ${id}`);
    }

    const currentStatus = current.status;

    // 2. Validate transition
    if (currentStatus === newStatus) return; // No change needed

    let isValid = false;

    // Rule: Any (except Realizado) -> Cancelado
    if (newStatus === 'Cancelado') {
      if (currentStatus !== 'Realizado') {
        isValid = true;
      }
    } else {
      // Rule: Strict progression
      switch (currentStatus) {
        case 'Agendado':
          if (newStatus === 'Aguardando') isValid = true;
          break;
        case 'Aguardando':
          if (newStatus === 'Chamado') isValid = true;
          break;
        case 'Chamado':
          if (newStatus === 'Em Atendimento') isValid = true;
          break;
        case 'Em Atendimento':
          if (newStatus === 'Realizado') isValid = true;
          break;
      }
    }

    if (!isValid) {
      throw new Error(`Invalid status transition from '${currentStatus}' to '${newStatus}'`);
    }

    // 3. Update status
    const { error: updateError } = await this.supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', id);

    if (updateError) throw updateError;
  }
```

**Business Rules Enforced:**
- `Agendado` → `Aguardando` ✅
- `Aguardando` → `Chamado` ✅
- `Chamado` → `Em Atendimento` ✅
- `Em Atendimento` → `Realizado` ✅
- Any (except `Realizado`) → `Cancelado` ✅
- Direct jump (e.g., `Agendado` → `Realizado`) ❌ (throws error)

---

## Status Flow (Business Rule)

```
Agendado → Aguardando → Chamado → Em Atendimento → Realizado
                              ↓
                          Cancelado
```

**Regras:**
- Só pode ir para "Aguardando" se estiver "Agendado".
- Só pode ir para "Chamado" se estiver "Aguardando".
- Só pode ir para "Em Atendimento" se estiver "Chamado".
- Pode ser "Cancelado" de qualquer estado (exceto "Realizado").

