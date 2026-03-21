# IntraClinica Supabase — Plano de Refatoração Consolidado

> Criado em: 2026-03-21  
> Decisões: Fases 1+2 (consolidação) → Fase 3 (Signals puros) → Fase 4 (config-driven Postgres)  
> Ver contexto completo: `docs/ARCHITECTURE.md`

---

## Resumo Executivo

O frontend tem três problemas estruturais principais que precisam ser resolvidos **em ordem**:

1. **Duplicações e mortalha de rotas** (Fase 1) — quick wins de baixo risco
2. **God Service** — `DatabaseService` de 759 linhas fazendo tudo (Fase 2)
3. **Três padrões de state coexistindo** — NgRx + Signals + direct calls (Fase 3)
4. **UI 100% hardcoded** — sidebar, tabs, módulos não configuráveis por tenant (Fase 4)

A Fase 4 (config-driven) só faz sentido depois das Fases 1-3. Construir configurabilidade sobre um god service com state duplicado é inviável a médio prazo.

---

## Fase 1 — Quick Wins (baixo risco)

**Objetivo**: Eliminar duplicações óbvias e tornar o app navegável sem esforço de refatoração profunda.

**Estimativa**: 1-2 dias de desenvolvimento

### 1.1 — Unificar os dois `InventoryService`

**Problema**: Existem dois serviços paralelos para o mesmo domínio:
- `core/services/inventory.service.ts` — usado por `InventoryComponent`, `ClinicalExecutionComponent`, `ProcedureRecipeComponent`
- `features/inventory/data/inventory.service.ts` — usado por `InventoryEffects` (NgRx)

Ambos lêem as tabelas `product` e `stock_transaction`. Retornam tipos incompatíveis (`InventoryItem` vs `Product`).

**Ação**:
1. Adaptar `features/inventory/store/inventory.effects.ts` para usar `core/services/inventory.service.ts`
2. Unificar os tipos `InventoryItem` e `Product` em `core/models/inventory.types.ts`
3. Deletar `features/inventory/data/inventory.service.ts`

**Arquivos afetados**:
```
DELETE  frontend/src/app/features/inventory/data/inventory.service.ts
MODIFY  frontend/src/app/features/inventory/store/inventory.effects.ts
MODIFY  frontend/src/app/core/models/inventory.types.ts
MODIFY  frontend/src/app/core/models/types.ts  (se Product estiver aqui)
```

### 1.2 — Remover rota duplicada `/clinical-execution`

**Problema**: `app.routes.ts` tem duas rotas apontando para o mesmo componente:
```typescript
{ path: 'clinical', loadComponent: () => ClinicalExecutionComponent }
{ path: 'clinical-execution', loadComponent: () => ClinicalExecutionComponent }  // duplicata
```

**Ação**: Remover a entrada `clinical-execution` de `app.routes.ts`.

### 1.3 — Adicionar links sidebar para features inacessíveis

**Problema**: `/procedures`, `/pacientes`, `/consultas` não têm link no sidebar. São inacessíveis pela UI.

**Ação**: Adicionar em `main-layout.component.ts`:
```typescript
{ path: '/procedures', label: 'Procedimentos', icon: 'Syringe', roles: ['CLINIC_ADMIN', 'DOCTOR', 'STOCK_MANAGER'] },
{ path: '/pacientes',  label: 'Pacientes',     icon: 'UserRound', roles: ['DOCTOR', 'RECEPTION', 'CLINIC_ADMIN'] },
```
`/consultas` pode ser suprimido — `ReceptionComponent` já serve como gestão de agendamentos.

### 1.4 — Extrair constantes de domínio hardcoded

**Problema**: Strings de domínio espalhadas em vários componentes, impossível alterar em um lugar só.

**Ação**: Criar `core/config/domain-constants.ts`:
```typescript
export const APPOINTMENT_STATUSES = [
  'Agendado', 'Aguardando', 'Chamado', 'Em Atendimento', 'Realizado', 'Cancelado'
] as const;

export const APPOINTMENT_TYPES = ['Consulta', 'Procedimento', 'Retorno'] as const;

export const WORKSTATIONS = ['Guichê 01', 'Guichê 02', 'Triagem 01'] as const;

export const SAAS_PLANS = ['Starter', 'Pro', 'Enterprise'] as const;

export const SOCIAL_TONES = [
  { value: 'friendly',      label: 'Amigável' },
  { value: 'professional',  label: 'Profissional' },
  { value: 'urgent',        label: 'Urgente' },
] as const;
```

Substituir os valores hardcoded nos templates pelos imports destas constantes.

**Arquivos afetados**:
```
CREATE  frontend/src/app/core/config/domain-constants.ts
MODIFY  frontend/src/app/features/reception/reception.component.ts
MODIFY  frontend/src/app/features/admin-panel/admin-panel.component.ts
MODIFY  frontend/src/app/features/social/social.component.ts
```

---

## Fase 2 — Decomposição do God Service

**Objetivo**: Decompor `DatabaseService` (759L) em serviços focados, sem quebrar consumers existentes. Usar o padrão de **facade backward-compatible**: os novos serviços assumem responsabilidade real; `DatabaseService` passa a delegar para eles.

**Estimativa**: 3-5 dias de desenvolvimento

**Estratégia**: Extrair incrementalmente. Cada extração é um PR independente, `tsc --noEmit` e smoke test antes de continuar.

### 2.1 — Extrair `AuthStateService`

**Responsabilidade**: sessão Supabase, user profile, role, permissões.

```typescript
// core/services/auth-state.service.ts
@Injectable({ providedIn: 'root' })
export class AuthStateService {
  readonly currentUser   = signal<AppUser | null>(null);
  readonly isLoading     = signal<boolean>(true);

  async loadUserProfile(): Promise<void> { /* extraído de DatabaseService */ }
  checkPermission(permission: string): boolean { /* extraído */ }

  // Delega para SupabaseService
  async getSession() { }
  async signOut() { }
}
```

**`DatabaseService` após extração**:
```typescript
// DatabaseService passa a delegar
get currentUser() { return this.authState.currentUser; }
checkPermission(p: string) { return this.authState.checkPermission(p); }
```

**Arquivos afetados**:
```
CREATE  frontend/src/app/core/services/auth-state.service.ts
MODIFY  frontend/src/app/core/services/database.service.ts
MODIFY  frontend/src/app/core/store/auth/auth.effects.ts  (se usar DatabaseService para auth)
```

### 2.2 — Extrair `ClinicContextService`

**Responsabilidade**: contexto de clínica selecionado, lista de clínicas acessíveis, lógica de switching.

```typescript
// core/services/clinic-context.service.ts
@Injectable({ providedIn: 'root' })
export class ClinicContextService {
  readonly selectedClinic    = signal<string | null>(null);  // null | 'all' | UUID
  readonly accessibleClinics = signal<Clinic[]>([]);

  // Sentinel helpers
  get isGlobalContext(): boolean { return this.selectedClinic() === 'all'; }
  get clinicId(): string | null {
    const ctx = this.selectedClinic();
    return ctx === 'all' ? null : ctx;
  }

  async loadAccessibleClinics(): Promise<void> { }
  switchClinic(clinicId: string | 'all'): void { }
}
```

Este serviço é o **ponto central de dependência** — todos os outros serviços injetam `ClinicContextService` ao invés de `DatabaseService` para saber o contexto atual.

### 2.3 — Unificar `AppointmentService`

**Problema**: Appointments são carregados por `DatabaseService` (bulk, signal) E por `PatientService` via NgRx (incremental, Observable). Podem divergir.

**Ação**: `PatientService` vira o dono único de `appointment`. `DatabaseService.appointments()` passa a retornar o signal do `PatientStore`:

```typescript
// database.service.ts (backward compat facade)
get appointments() { return this.patientStore.appointments; }

// patientService absorve o write method
async createAppointment(...): Observable<Appointment> { /* já existe */ }
async updateAppointmentStatus(...): Observable<void> { /* já existe */ }
async transitionStatus(id: string, status: string): Observable<void> { /* extraído de DatabaseService */ }
```

### 2.4 — Unificar `ClinicalRecordService`

Mesma abordagem do 2.3: `PatientService` vira dono, `DatabaseService.clinicalRecords()` delega.

### 2.5 — `DatabaseService` como facade fina (~200L)

Após as extrações 2.1-2.4, `DatabaseService` fica apenas como ponto de acesso agregado para consumers legados, sem lógica própria:

```typescript
@Injectable({ providedIn: 'root' })
export class DatabaseService {
  // Delegações
  readonly currentUser           = computed(() => this.authState.currentUser());
  readonly selectedContextClinic = computed(() => this.clinicCtx.selectedClinic());
  readonly appointments          = computed(() => this.patientStore.appointments());
  readonly patients              = computed(() => this.patientStore.patients());
  readonly products              = computed(() => this.inventoryStore.products());
  // ... etc

  checkPermission = (p: string) => this.authState.checkPermission(p);
  // writes delegam para os serviços certos
}
```

**Meta**: `DatabaseService` fica com ≤ 150 linhas, zero lógica de negócio, apenas delegação.

---

## Fase 3 — Migração NgRx → Angular Signals

**Objetivo**: Eliminar o NgRx e padronizar todo o state em Angular Signals puros com services. Menos boilerplate, mais idiomático para Angular 21+.

**Estimativa**: 3-5 dias de desenvolvimento  
**Pré-requisito**: Fases 1 e 2 concluídas

**Decisão**: Signals puros (não NgRx) — alinhado com a direção do Angular 21+.

### Padrão alvo por feature

```typescript
// Padrão único: Resource Service com signals
@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private clinicCtx = inject(ClinicContextService);

  // Estado
  readonly appointments  = signal<Appointment[]>([]);
  readonly isLoading     = signal(false);
  readonly error         = signal<string | null>(null);

  // Reatividade: recarrega quando clínica muda
  constructor() {
    effect(() => {
      const clinicId = this.clinicCtx.clinicId;
      if (clinicId) this.load(clinicId);
    });
  }

  async load(clinicId: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const { data, error } = await supabase.from('appointment')...;
      if (error) throw error;
      this.appointments.set(data.map(mapAppointmentRow));
    } finally {
      this.isLoading.set(false);
    }
  }

  // Writes
  async create(dto: CreateAppointmentDto): Promise<void> { }
  async updateStatus(id: string, status: string): Promise<void> { }
}
```

### Slices NgRx a remover

| Slice | Substituto |
|-------|-----------|
| `auth` (actions/reducer/effects/selectors) | `AuthStateService` (Fase 2.1) + signals |
| `patient` (actions/reducer/effects/selectors) | `AppointmentService` + `PatientDataService` com signals |
| `inventory` (actions/reducer/effects/selectors) | `InventoryService` refatorado com signals |

### Facades a remover

| Facade | Substituído por |
|--------|----------------|
| `patient.store.ts` | Injeção direta de `AppointmentService`, `PatientDataService` |
| `inventory.store.ts` | Injeção direta de `InventoryService` refatorado |

### Arquivos a deletar após Fase 3

```
frontend/src/app/core/store/auth/
frontend/src/app/core/store/patient/
frontend/src/app/core/store/inventory.store.ts
frontend/src/app/core/store/patient.store.ts
frontend/src/app/features/inventory/store/
```

### `main.ts` após Fase 3

```typescript
// Antes (NgRx)
provideStore({ auth: authReducer, patient: patientReducer, inventory: inventoryReducer }),
provideEffects([AuthEffects, PatientEffects, InventoryEffects]),
provideStoreDevtools(),

// Depois (Signals — sem NgRx)
// Nada. Os services são providedIn: 'root' e se auto-registram.
```

---

## Fase 4 — Config-Driven UI (Postgres como fonte de verdade)

**Objetivo**: Sidebar, módulos habilitados e tabs configuráveis por tenant (clínica), armazenados no Postgres. Permite que diferentes clínicas tenham diferentes módulos ativos conforme o plano SaaS.

**Estimativa**: 3-4 dias de desenvolvimento  
**Pré-requisito**: Fases 1, 2 e 3 concluídas

### 4.1 — Schema: tabelas de configuração de UI

```sql
-- Módulos disponíveis no sistema (seed global, gerenciado pelo SUPER_ADMIN)
CREATE TABLE ui_module (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text UNIQUE NOT NULL,        -- 'inventory', 'reception', 'clinical', etc.
  label       text NOT NULL,               -- exibido no sidebar
  icon        text NOT NULL,               -- nome do ícone Lucide
  route       text NOT NULL,               -- '/inventory', '/reception', etc.
  description text,
  created_at  timestamptz DEFAULT now()
);

-- Habilitação de módulos por clínica (ou global para todos)
CREATE TABLE clinic_module (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  uuid REFERENCES clinic(id) ON DELETE CASCADE,
  module_key text NOT NULL REFERENCES ui_module(key),
  enabled    boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (clinic_id, module_key)
);

-- Feature flags por clínica (valores primitivos configuráveis)
CREATE TABLE clinic_config (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  uuid REFERENCES clinic(id) ON DELETE CASCADE,
  key        text NOT NULL,               -- 'appointment_types', 'workstations', 'plans'
  value      jsonb NOT NULL,              -- ["Consulta", "Procedimento"] etc.
  created_at timestamptz DEFAULT now(),
  UNIQUE (clinic_id, key)
);
```

### 4.2 — Seed: módulos padrão

```sql
INSERT INTO ui_module (key, label, icon, route, description) VALUES
  ('inventory',  'Estoque & Etiquetas', 'Package',    '/inventory',   'Gestão de produtos e impressão de etiquetas'),
  ('reception',  'Recepção',            'Users',       '/reception',   'Fila de atendimento e agendamentos'),
  ('clinical',   'Prontuário IA',       'Stethoscope', '/clinical',    'Prontuário eletrônico com assistência IA'),
  ('procedures', 'Procedimentos',       'Syringe',     '/procedures',  'Tipos de procedimento e receitas'),
  ('patients',   'Pacientes',           'UserRound',   '/pacientes',   'Cadastro e histórico de pacientes'),
  ('reports',    'Indicadores',         'BarChart3',   '/reports',     'KPIs e análise estratégica IA'),
  ('social',     'Marketing IA',        'Share2',      '/social',      'Geração de conteúdo para redes sociais'),
  ('admin',      'Configurações',       'Settings',    '/admin',       'Administração da unidade');

-- Habilitar todos para a clínica demo
INSERT INTO clinic_module (clinic_id, module_key, enabled, sort_order)
SELECT 'cdf8cf49-b559-4c44-8533-38977611e1b4', key, true, ROW_NUMBER() OVER (ORDER BY key)
FROM ui_module;
```

### 4.3 — Backend: RPC para carregar configuração

```sql
CREATE OR REPLACE FUNCTION get_clinic_ui_config(p_clinic_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT jsonb_build_object(
    'modules', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'key',        m.key,
          'label',      m.label,
          'icon',       m.icon,
          'route',      m.route,
          'enabled',    COALESCE(cm.enabled, false),
          'sort_order', COALESCE(cm.sort_order, 999)
        ) ORDER BY COALESCE(cm.sort_order, 999)
      )
      FROM ui_module m
      LEFT JOIN clinic_module cm ON cm.module_key = m.key AND cm.clinic_id = p_clinic_id
    ),
    'config', (
      SELECT jsonb_object_agg(key, value)
      FROM clinic_config
      WHERE clinic_id = p_clinic_id
    )
  );
$$;
```

### 4.4 — Frontend: `UiConfigService`

```typescript
// core/services/ui-config.service.ts
export interface UiModule {
  key: string;
  label: string;
  icon: string;
  route: string;
  enabled: boolean;
  sort_order: number;
}

export interface ClinicUiConfig {
  modules: UiModule[];
  config: Record<string, unknown>;  // appointment_types, workstations, etc.
}

@Injectable({ providedIn: 'root' })
export class UiConfigService {
  private clinicCtx = inject(ClinicContextService);

  readonly config   = signal<ClinicUiConfig | null>(null);
  readonly isLoading = signal(false);

  // Módulos habilitados, ordenados — o sidebar consume isso
  readonly enabledModules = computed(() =>
    this.config()?.modules.filter(m => m.enabled) ?? []
  );

  // Config values com fallback para defaults hardcoded
  getConfigValue<T>(key: string, defaultValue: T): T {
    return (this.config()?.config?.[key] as T) ?? defaultValue;
  }

  constructor() {
    effect(() => {
      const clinicId = this.clinicCtx.clinicId;
      if (clinicId) this.loadConfig(clinicId);
      else if (this.clinicCtx.isGlobalContext) this.loadGlobalConfig();
    });
  }

  async loadConfig(clinicId: string): Promise<void> {
    this.isLoading.set(true);
    const { data } = await supabase.rpc('get_clinic_ui_config', { p_clinic_id: clinicId });
    this.config.set(data as ClinicUiConfig);
    this.isLoading.set(false);
  }

  async loadGlobalConfig(): Promise<void> {
    // Para SUPER_ADMIN global: mostrar todos os módulos
    this.config.set({ modules: ALL_DEFAULT_MODULES, config: {} });
  }
}
```

### 4.5 — Frontend: `MainLayoutComponent` data-driven

```typescript
// main-layout.component.ts — após Fase 4
export class MainLayoutComponent {
  private uiConfig = inject(UiConfigService);

  readonly navItems = computed(() => this.uiConfig.enabledModules());
  // Sidebar renderiza this.navItems() via @for — sem hardcode
}
```

```html
<!-- main-layout.component.html -->
@for (item of navItems(); track item.key) {
  <a [routerLink]="item.route" routerLinkActive="active">
    <lucide-icon [name]="item.icon" />
    {{ item.label }}
  </a>
}
```

### 4.6 — Configuração de constantes de domínio (appointments, workstations)

Após a Fase 4, `APPOINTMENT_TYPES` e `WORKSTATIONS` podem vir do banco via `clinic_config`:

```sql
INSERT INTO clinic_config (clinic_id, key, value) VALUES
  ('cdf8cf49-...', 'appointment_types', '["Consulta", "Procedimento", "Retorno", "Urgência"]'),
  ('cdf8cf49-...', 'workstations',      '["Guichê 01", "Guichê 02", "Triagem 01", "Sala 1"]');
```

```typescript
// No component
readonly appointmentTypes = computed(() =>
  this.uiConfig.getConfigValue<string[]>('appointment_types', APPOINTMENT_TYPES)
);
```

---

## Cronograma e Dependências

```
Fase 1 (1-2d)
  └── 1.1 Unificar InventoryService
  └── 1.2 Remover rota duplicada /clinical-execution
  └── 1.3 Sidebar: links para /procedures e /pacientes
  └── 1.4 domain-constants.ts
      │
      ▼
Fase 2 (3-5d) ← depende de Fase 1 completa
  └── 2.1 AuthStateService
  └── 2.2 ClinicContextService ← ponto central
  └── 2.3 Unificar AppointmentService
  └── 2.4 Unificar ClinicalRecordService
  └── 2.5 DatabaseService → facade fina
      │
      ▼
Fase 3 (3-5d) ← depende de Fase 2 completa
  └── Migrar auth NgRx → Signals (AuthStateService)
  └── Migrar patient NgRx → Signals (AppointmentService, PatientDataService)
  └── Migrar inventory NgRx → Signals (InventoryService refatorado)
  └── Remover @ngrx/store, @ngrx/effects de main.ts
      │
      ▼
Fase 4 (3-4d) ← depende de Fase 3 completa
  └── Migration: ui_module, clinic_module, clinic_config tables
  └── RPC: get_clinic_ui_config
  └── UiConfigService
  └── MainLayoutComponent data-driven
  └── Admin Panel: UI para configurar módulos por clínica
  └── Reception/Social: constantes de domínio via clinic_config
```

**Total estimado**: 10-16 dias de desenvolvimento

---

## Critérios de Conclusão por Fase

### Fase 1 ✅ completa quando:
- [ ] `features/inventory/data/inventory.service.ts` deletado
- [ ] `InventoryEffects` usa `core/services/inventory.service.ts`
- [ ] `app.routes.ts` sem rota `/clinical-execution`
- [ ] Sidebar com links para `/procedures` e `/pacientes`
- [ ] `domain-constants.ts` criado, templates atualizados
- [ ] `tsc --noEmit` → zero erros
- [ ] Playwright auth.spec.ts → todos os testes passam

### Fase 2 ✅ completa quando:
- [ ] `AuthStateService` criado, `DatabaseService` delega
- [ ] `ClinicContextService` criado, todos os serviços o injetam
- [ ] `DatabaseService` ≤ 150 linhas
- [ ] `appointment` tem uma única fonte de truth (PatientService)
- [ ] `clinical_record` tem uma única fonte de truth
- [ ] `tsc --noEmit` → zero erros
- [ ] Todos os specs E2E passam

### Fase 3 ✅ completa quando:
- [ ] Nenhum import de `@ngrx/store`, `@ngrx/effects` em features
- [ ] `main.ts` sem `provideStore`, `provideEffects`, `provideStoreDevtools`
- [ ] Todos os resources são signals em services com `providedIn: 'root'`
- [ ] `tsc --noEmit` → zero erros
- [ ] Todos os specs E2E passam

### Fase 4 ✅ completa quando:
- [ ] Migrations `ui_module`, `clinic_module`, `clinic_config` aplicadas
- [ ] RPC `get_clinic_ui_config` implementada e testada
- [ ] `UiConfigService` carregando config do banco
- [ ] Sidebar renderizando a partir de `enabledModules()`
- [ ] Admin Panel com UI para habilitar/desabilitar módulos por clínica
- [ ] `APPOINTMENT_TYPES` e `WORKSTATIONS` lidos de `clinic_config`
- [ ] Todos os specs E2E passam

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Breaking change em `DatabaseService` ao extrair serviços | Alta | Alto | Extrair incrementalmente; manter facade backward-compat; `tsc --noEmit` a cada passo |
| Divergência de state entre dois fetches do mesmo recurso durante Fase 2 | Média | Médio | Manter um único fetch ativo até o outro ser desativado; não deletar código antigo até o novo estar validado |
| Quebra de NgRx na Fase 3 ao remover effects | Alta | Médio | Migrar um slice de cada vez; cobrir com E2E antes de remover |
| RLS faltando para novas tabelas Fase 4 | Alta | Alto | Criar RLS policies junto com cada migration; não expor as tabelas sem policy |
| `get_clinic_ui_config` retornando config incorreta para SUPER_ADMIN | Média | Médio | Testar explicitamente o caso `context = 'all'` com fixture E2E |
