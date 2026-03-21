# IntraClinica Supabase — Arquitetura de Software

> Documento atualizado em: 2026-03-21 (Após Refatoração Fase 4)  
> Branch: `main`  
> Stack: Angular 21 (standalone) + Supabase (Postgres + PostgREST + Auth) + Angular Signals

---

## 1. Visão Geral

IntraClinica é um SaaS multi-tenant para gestão de clínicas médicas. Cada **tenant** é uma `clinic`. Um usuário (`app_user`) pertence a uma clínica e tem um role IAM. O `SUPER_ADMIN` opera em visão global (`context = 'all'`) e pode alternar o contexto de visualização para qualquer clínica. A interface do sistema é **Data-Driven (Config-driven UI)**, baseada nos módulos habilitados via banco de dados para a clínica em questão.

### Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Angular 21, standalone components |
| State management | **Angular Signals (100%)** — Padrão reativo oficial, sem NgRx |
| Backend | Supabase (Postgres 15 + PostgREST + GoTrue Auth) |
| ORM / Query | `@supabase/supabase-js` (client direto, sem ORM) |
| AI | Google Gemini (`@google/genai`) |
| CSS | Tailwind CSS |
| Testes E2E | Playwright 1.58 |

---

## 2. Estrutura de Diretórios e Serviços Core

A aplicação segue a arquitetura orientada a Signals e injeção de dependências limpa. A antiga classe "God Object" (`DatabaseService`) foi decomposta em serviços granulares.

```text
frontend/src/
├── app/
│   ├── app.routes.ts                       # Rotas lazy-loaded padronizadas para inglês
│   ├── core/
│   │   ├── config/
│   │   │   ├── domain-constants.ts         # Central de enums e hardcoded strings (Status, Planos, etc)
│   │   │   └── iam-roles.ts                # Definições de RBAC e permissões
│   │   ├── models/                         # Tipagens TypeScript do domínio (types.ts, ui-config.types.ts)
│   │   ├── services/
│   │   │   ├── auth-state.service.ts       # Sessão, Auth, e IAM Role Checking
│   │   │   ├── clinic-context.service.ts   # Contexto de Tenant atual (`selectedClinic`)
│   │   │   ├── database.service.ts         # Facade leve (~150L) para integrações globais
│   │   │   ├── inventory.service.ts        # Regras de Produto e Movimentações
│   │   │   ├── patient.service.ts          # Pacientes, Consultas e Prontuários (ClinicalRecords)
│   │   │   ├── ui-config.service.ts        # Gerencia os módulos UI ativados (Config-Driven)
│   │   │   └── supabase.service.ts         # Inicialização do client do Supabase
│   │   └── store/
│   │       ├── inventory.store.ts          # Facade baseada em Signals para retrocompatibilidade
│   │       └── patient.store.ts            # Facade baseada em Signals para retrocompatibilidade
│   ├── features/
│   │   ├── admin-panel/                    # Governança SaaS e Toggle de Módulos (UI Config)
│   │   ├── appointments/                   # Consultas
│   │   ├── clinical/                       # Prontuário IA
│   │   ├── inventory/                      # Estoque e Produtos
│   │   ├── login/                          # Autenticação
│   │   ├── patients/                       # Pacientes
│   │   ├── procedures/                     # Procedimentos
│   │   ├── reception/                      # Recepção e Triagem
│   │   ├── reports/                        # Dashboard BI
│   │   └── social/                         # Marketing IA
│   └── layout/
│       └── main-layout.component.ts        # Sidebar Dinâmico baseado no ui-config.service.ts
```

---

## 3. Gerenciamento de Estado (Signals)

Após a migração, a aplicação não utiliza mais NgRx. O estado reativo é inteiramente mantido nos **Services**, tirando proveito de `signal()`, `computed()` e `effect()`.

### Padrão de Sincronização e Contexto
O fluxo de dados obedece à hierarquia de contexto:
1. `AuthStateService` detecta o login e define o usuário atual. Se ADMIN/SUPER_ADMIN, infere o primeiro acesso.
2. `ClinicContextService` mantém o signal `selectedClinic`.
3. Os serviços de domínio (`PatientService`, `InventoryService`, `UiConfigService`, etc.) possuem `effect()` em seus construtores que "escutam" o ID da clínica atual. 
4. Quando a clínica muda, todos os serviços disparam suas queries ao Supabase simultaneamente e atualizam seus próprios `signal<T[]>`.
5. Componentes leem os dados diretamente através de `computed()` ou das facades (como o `PatientStore`).

---

## 4. Config-Driven UI (Fase 4)

A visualização e a navegação da plataforma são geridas pelo banco de dados, configuradas através de três tabelas principais no PostgreSQL:
- `ui_module`: Catálogo global de features disponíveis no SaaS.
- `clinic_module`: Mapeamento de quais módulos estão ativos para cada clínica (tenant), com ordem de ordenação.
- `clinic_config`: JSON genérico de configurações (ex: cores, labels).

O `UiConfigService` carrega esses dados (via RPC `get_clinic_ui_config`) toda vez que a clínica do contexto é alterada. O `<aside>` no `MainLayoutComponent` renderiza a barra lateral através de uma diretiva `@for` que lê os módulos ativados dinamicamente. No `AdminPanelComponent`, Super Admins podem ligar/desligar features em tempo real para cada clínica através da aba "Configurações SaaS".

---

## 5. Schema do Banco de Dados (Supabase)

O acesso aos dados é protegido por **Row Level Security (RLS)**, garantindo o isolamento multi-tenant (com exceções para `SUPER_ADMIN`).

### Tabelas principais

```sql
-- Config Driven UI
ui_module (id, key, label, icon, route)
clinic_module (id, clinic_id, module_key, enabled, sort_order)
clinic_config (id, clinic_id, key, value jsonb)

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

---

## 6. Padronizações de Código

- **Idioma de Rotas e Pastas:** Inglês técnico (`/patients`, `/appointments`, `/procedures`, `/inventory`).
- **Enums e Constantes:** Mantidas exclusivamente no `core/config/domain-constants.ts` (nenhuma string mágica duplicada na UI).
- **Acesso ao Supabase:** Centralizado através de chamadas em services do diretório `core/services/` (nunca injetar client do Supabase direto nos componentes).
- **Semantização HTML:** Os componentes Standalone Angular são preferidos.

---

## 7. Sentinel `'all'` — Convenção de Contexto

O signal de contexto (`ClinicContextService.selectedClinic()`) usa dois sentinels especiais:

| Valor | Significado |
|-------|------------|
| `null` | Não inicializado / loading / logout |
| `'all'` | SUPER_ADMIN em visão global SaaS — **NÃO é um UUID válido** |
| `string (UUID)` | Clínica específica selecionada |

**Regra obrigatória**: Todo código que passa o id da clínica para uma query no Supabase **deve** guardar contra `'all'`. O `clinicId` computed property do serviço já retorna `null` caso seja 'all', facilitando esta checagem.

---

## 8. Testes (Playwright)
A cobertura E2E está na pasta `frontend/e2e/`, implementando **Page Object Models (POM)** para Login, Gestão Global, Recepção e Prontuários, cobrindo o fluxo de vida do paciente desde o check-in até a conclusão da consulta.

---

## 9. Comandos Úteis

```bash
# Dev server
cd frontend && npm run dev           # http://localhost:3000

# TypeScript check (Validação Rigorosa)
cd frontend && ./node_modules/.bin/tsc --noEmit

# E2E tests (requer dev server rodando)
cd frontend && npm run test:e2e

# Regenerar tipos Supabase
SUPABASE_ACCESS_TOKEN=sbp_... supabase gen types typescript --linked 2>/dev/null > frontend/src/types/supabase.ts

# Aplicar migrations
SUPABASE_ACCESS_TOKEN=sbp_... supabase db push --linked
```