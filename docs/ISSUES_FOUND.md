# Issues Found — IntraClinica Supabase

> Sessão de exploração: 2026-03-21  
> Metodologia: Playwright E2E exploration + code review + network trace  
> Legendas: **BUG** = defeito funcional | **WARN** = risco latente | **UX** = problema de experiência do usuário

---

## Bugs Corrigidos Nesta Sessão ✅

### BUG-001 — SUPER_ADMIN não defaultava para contexto `'all'`
- **Camada**: Service (database.service.ts)
- **Sintoma**: Login como `bmbanho@gmail.com` (SUPER_ADMIN) carregava a clínica do ator em vez de mostrar visão global SaaS
- **Root cause**: `loadUserProfile` verificava `if (profile.clinicId)` antes de verificar o role; SUPER_ADMIN tem `actor.clinic_id` preenchido no banco, então o primeiro branch vencia
- **Fix**: Reordenar: verificar `profile.role === 'SUPER_ADMIN'` primeiro → setar `'all'` incondicionalmente
- **Arquivo**: `frontend/src/app/core/services/database.service.ts`
- **Status**: ✅ Corrigido

### BUG-002 — Effect passava sentinel `'all'` como UUID para `syncDataForClinic`
- **Camada**: Service (database.service.ts)
- **Sintoma**: HTTP 400/422 em todas as queries ao logar como SUPER_ADMIN (`invalid input syntax for type uuid: "all"`)
- **Root cause**: `effect(() => { if (clinicId) this.syncDataForClinic(clinicId); })` — `'all'` é truthy
- **Fix**: Guard `if (clinicId && clinicId !== 'all')`; branch `else if (clinicId === 'all')` carrega apenas `clinic` table
- **Arquivo**: `frontend/src/app/core/services/database.service.ts`
- **Status**: ✅ Corrigido

### BUG-003 — `inventory.service.ts` expunha `'all'` como clinicId
- **Camada**: Service (inventory.service.ts)
- **Sintoma**: Queries de estoque falhavam com UUID inválido quando SUPER_ADMIN
- **Fix**: Getter `clinicId` retorna `null` quando contexto é `'all'`
- **Arquivo**: `frontend/src/app/core/services/inventory.service.ts`
- **Status**: ✅ Corrigido

### BUG-004 — `inventory.component.ts` disparava `loadItems()` com context `'all'`
- **Camada**: Component (inventory.component.ts)
- **Fix**: Guard `if (clinicId && clinicId !== 'all')` no effect
- **Arquivo**: `frontend/src/app/features/inventory/inventory.component.ts`
- **Status**: ✅ Corrigido

### BUG-005 — `clinical-execution.component.ts` getter `clinicId` retornava `'all'`
- **Camada**: Component (clinical-execution.component.ts)
- **Fix**: `return ctx === 'all' ? null : ctx`
- **Arquivo**: `frontend/src/app/features/clinical/clinical-execution.component.ts`
- **Status**: ✅ Corrigido

### BUG-006 — `reception.component.ts` effect e submit usavam `'all'`
- **Camada**: Component (reception.component.ts)
- **Fix**: Guards `!== 'all'` em effect e em `createAppointment`
- **Arquivo**: `frontend/src/app/features/reception/reception.component.ts`
- **Status**: ✅ Corrigido

### BUG-007 — `reports.component.ts` effect passava `'all'` para stores
- **Camada**: Component (reports.component.ts)
- **Fix**: Guard `!== 'all'` no effect
- **Arquivo**: `frontend/src/app/features/reports/reports.component.ts`
- **Status**: ✅ Corrigido

### BUG-008 — `patients-list.component.ts` effect e `savePatient()` usavam `'all'`
- **Camada**: Component (patients-list.component.ts)
- **Fix**: Guards `!== 'all'` em ambos
- **Arquivo**: `frontend/src/app/features/patients/patients-list.component.ts`
- **Status**: ✅ Corrigido

### BUG-009 — Feature `inventory` reducer não registrado no NgRx Store
- **Camada**: Bootstrap (main.ts)
- **Sintoma**: `TypeError: Cannot read properties of undefined (reading 'products')` no Reports component
- **Root cause**: `provideStore({ auth, patient })` — `inventory: inventoryReducer` ausente
- **Fix**: Adicionar `inventory: inventoryReducer` e `InventoryEffects` em `main.ts`
- **Arquivo**: `frontend/src/main.ts`
- **Status**: ✅ Corrigido

### BUG-010 — PGRST201: JOIN ambíguo na query de pacientes
- **Camada**: Service (patient.service.ts)
- **Sintoma**: `"Failed to load patients {code: PGRST201... Could not embed because more than one relationship was found for 'patient' and 'actor'"`
- **Root cause**: A query usava `actor:id (name, clinic_id, created_at)` — tabela `patient` tem duas FKs: `patient_id_fkey` (→ actor) e `patient_clinic_id_fkey` (→ clinic), criando ambiguidade para PostgREST
- **Fix**: Usar hint explícito de FK: `actor:actor!patient_id_fkey (name, clinic_id, created_at)`
- **Arquivo**: `frontend/src/app/core/services/patient.service.ts:48`
- **Status**: ✅ Corrigido

### BUG-011 — auth.guard.ts race condition no carregamento da sessão
- **Camada**: Guard (auth.guard.ts)
- **Sintoma**: Redirect para `/login` em F5 mesmo com sessão ativa (Supabase ainda não tinha hidratado o estado)
- **Fix**: Usar `async getSession()` em vez de `session()` signal síncrono
- **Arquivo**: `frontend/src/app/core/guards/auth.guard.ts`
- **Status**: ✅ Corrigido (commit b9f64ae)

### BUG-012 — Auto-Login Hack ativo em `login.component.ts`
- **Camada**: Component (login.component.ts)
- **Sintoma**: Login automático com credenciais hardcoded ao abrir a aplicação
- **Fix**: Remover bloco `ngOnInit()` com auto-login
- **Arquivo**: `frontend/src/app/features/login/login.component.ts`
- **Status**: ✅ Corrigido (commit b9f64ae)

---

## Issues Pendentes ⚠️

### WARN-001 — Inventory product count: 0 em clínica secundária
- **Camada**: DB / Data
- **Sintoma**: Ao selecionar a segunda clínica (`3b2e08d7-...`) no context selector, a lista de produtos aparece vazia
- **Hipótese**: Os produtos de estoque existem apenas na clínica demo (`cdf8cf49-...`)
- **Ação sugerida**: Criar seed data para a segunda clínica, ou verificar se é comportamento esperado
- **Status**: ⚠️ Pendente (não é bug — pode ser ausência de dados)

### WARN-002 — `getProcedureAuditLog` e `getProcedureTypes` falham silenciosamente quando `clinicId = null`
- **Camada**: Service (inventory.service.ts)
- **Sintoma**: Quando SUPER_ADMIN (context = `'all'`), funções que precisam de clinicId jogam `Error('Clinic context is required')` silenciosamente
- **Ação sugerida**: Mostrar mensagem de UX: "Selecione uma clínica para visualizar procedimentos"
- **Status**: ⚠️ Pendente

### WARN-003 — `selectedContextClinic` não persiste entre reloads
- **Camada**: Service (database.service.ts)
- **Sintoma**: A clínica selecionada no context selector é perdida ao dar F5; o SUPER_ADMIN volta para `'all'`
- **Ação sugerida**: Persistir em `localStorage` ou em query param
- **Status**: ⚠️ Pendente

### UX-001 — Texto do botão de logout não padronizado
- **Camada**: Template (main-layout.component.html)
- **Sintoma**: Botão de logout tem texto `'Encerrar Sessão'` (não `'Sair'` ou `'Logout'`)
- **Impacto**: Testes E2E precisam usar o texto correto; UX pode confundir usuários acostumados com o padrão
- **Status**: ⚠️ Informativo (não é bug)

### UX-002 — Admin Panel sem feedback visual para SUPER_ADMIN sem clínica selecionada
- **Camada**: Component / Template
- **Sintoma**: Quando context é `'all'`, abas de clínica/equipe mostram dados globais mas sem indicação clara ao usuário
- **Ação sugerida**: Adicionar banner/badge "Visão Global SaaS" no topo quando context = `'all'`
- **Status**: ⚠️ Pendente

---

## Arquitetura — Notas Importantes

### Sentinel `'all'` em `selectedContextClinic`

O signal `selectedContextClinic: signal<string | null>` em `DatabaseService` usa dois sentinels:
- `null` = não inicializado (estado de loading/logout)
- `'all'` = SUPER_ADMIN em visão global SaaS — **não é um UUID válido**
- `string (UUID)` = clínica específica selecionada

**Regra**: Qualquer código que passa `selectedContextClinic()` como argumento para uma query Supabase DEVE guardar contra `'all'`:
```typescript
const ctx = this.dbService.selectedContextClinic();
const clinicId = ctx === 'all' ? null : ctx;
if (!clinicId) return; // ou mostrar mensagem contextual
```

### FK Hints no PostgREST

A tabela `patient` tem duas FKs para diferentes tabelas:
- `patient_id_fkey`: `patient.id → actor.id`
- `patient_clinic_id_fkey`: `patient.clinic_id → clinic.id`

Para evitar PGRST201 em queries com `actor` embed, sempre usar o hint explícito:
```typescript
.select('actor:actor!patient_id_fkey (name, clinic_id)')
```

---

## Migrations Aplicadas Nesta Sessão

| Migration | Descrição |
|---|---|
| `20260321000000_identity_bridge.sql` | Bridge de identidade auth → actor |
| `20260321000001_hard_cleanup.sql` | Limpeza de objetos legados |
| `20260321000002_fix_add_appointment_cast.sql` | Fix de cast no RPC `add_appointment` |
