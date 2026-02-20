# FINAL_MISSION_ADMIN_USERS: Implementação do saveUser() Gold Standard

## TL;DR

> Implementação completa do fluxo de criação/edição de usuários seguindo o padrão Actor (Auth + Actor + User). Substituição do método `saveUser()` stub por implementação real atômica via RPC, garantindo integridade referencial e evitando registros órfãos.

**Deliverables:**
- Função RPC `create_user_with_actor` no banco
- Método `saveUser()` refatorado em `DatabaseService`
- Validação de build verde (`ng build`)
- Teste de integridade: criação de usuário gera Actor correspondente

**Estimated Effort:** Medium (2-3 horas)
**Parallel Execution:** NO - sequencial devido a dependências de schema
**Critical Path:** Criar RPC → Refatorar saveUser → Validar Build

---

## Context

### Origem da Missão
Fonte: `/var/home/motto/Documentos/REPO/axio/data/raw/daily/OPENCODE_COMMUNICATION.md`
- Missão: `FINAL_MISSION_ADMIN_USERS`
- Instrução: "Foque na implementação real do `saveUser()` no `DatabaseService`"
- Alerta: "Não esqueça de tratar o `actor_id` corretamente para evitar órfãos"

### Estado Atual (Problemas Identificados)

**Arquivo:** `frontend/src/app/core/services/database.service.ts` (linhas 486-537)

```typescript
async saveUser(u: Partial<UserProfile>, pw?: string) {
  if (u.id) {
    // PROBLEMA 1: Usa tabela 'profiles' que não segue padrão Actor
    const { error } = await this.supabase
      .from('profiles')  // ❌ Deveria usar 'user' com JOIN actor
      .update({...})
      .eq('id', u.id);
  } else {
    // PROBLEMA 2: Cria auth user mas não cria Actor atomicamente
    const { data: authData } = await this.supabase.auth.signUp({...});
    
    // PROBLEMA 3: Update em profiles separado - risco de inconsistência
    const { error: profileError } = await this.supabase
      .from('profiles')
      .update({...})
      .eq('id', authData.user.id);
    // Se este update falhar, temos um auth user sem metadados!
  }
}
```

### Padrão Actor (Obrigatório)

Conforme PILOT_PLAN.md e manifesto:
- `User` e `Patient` **NÃO possuem nome diretamente**
- Eles apontam para `Actor` via `actor_id`
- Query correta: `.select('*, actor:actor_id(name, clinic_id)')`
- Já implementado corretamente em `PatientService.createPatient()` usando RPC

### Referência de Implementação Correta

**Arquivo:** `frontend/src/app/core/services/patient.service.ts` (linhas 107-123)

```typescript
createPatient(patient: Omit<Patient, 'id' | 'createdAt'>): Observable<Patient> {
  // ✅ Criação atômica via RPC - garante Actor + Patient
  return from(
    this.supabase.rpc('create_patient_with_actor', {
      p_clinic_id: patient.clinicId,
      p_name: patient.name,
      p_cpf: patient.cpf,
      p_birth_date: patient.birthDate,
      p_gender: patient.gender
    })
  );
}
```

---

## Work Objectives

### Core Objective
Implementar o fluxo completo de criação e atualização de usuários seguindo rigorosamente o padrão Actor, garantindo atomicidade e integridade referencial.

### Concrete Deliverables
1. **Migration SQL**: Função RPC `create_user_with_actor` no banco
2. **Migration SQL**: Função RPC `update_user_with_actor` para edições
3. **Refatoração**: Método `saveUser()` em `DatabaseService`
4. **Atualização**: `UserProfile` interface se necessário
5. **Build**: Verificação `ng build --configuration=production`

### Definition of Done
- [ ] Usuário criado via `saveUser()` aparece em `db.users()` com `actor_id` preenchido
- [ ] Build Angular executa sem erros (`BUILD_GREEN`)
- [ ] Edição de usuário atualiza nome em `actor` não em `user`
- [ ] Nenhum registro órfão de `actor` é criado em caso de falha

### Must Have
- RPC `create_user_with_actor` atômica (transação)
- RPC `update_user_with_actor` para updates
- Tratamento de erro rollback em caso de falha
- Validação de email único no Auth
- Criptografia de senha via Supabase Auth

### Must NOT Have (Guardrails)
- NÃO alterar schema existente de `profiles` (legado)
- NÃO modificar `PatientService` (já funciona)
- NÃO quebrar compatibilidade com dados existentes
- NÃO criar múltiplos Actors para o mesmo usuário

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Vitest configurado)
- **Automated tests**: YES (Tests after)
- **Framework**: Vitest + Angular Testing Utilities

### Agent-Executed QA Scenarios (MANDATORY)

**Scenario 1: Criação de usuário cria Actor correspondente**
```
Tool: Bash (curl para RPC + psql para verificação)
Preconditions: Supabase local/emulator rodando
Steps:
  1. Chamar RPC create_user_with_actor com dados de teste
  2. Verificar retorno contém user.id válido
  3. Query na tabela actor: SELECT * FROM actor WHERE id = [actor_id retornado]
  4. Assert: actor.name = nome fornecido
  5. Assert: actor.clinic_id = clinic_id fornecido
Expected Result: Usuário e Actor criados com dados consistentes
Evidence: Query results capturados em .sisyphus/evidence/scenario-1.log
```

**Scenario 2: Build Angular verde**
```
Tool: Bash
Preconditions: Node modules instalados
Steps:
  1. cd /var/home/motto/Documentos/REPO/intraclinica-supabase/frontend
  2. Run: ng build --configuration=production
  3. Assert: Exit code = 0
  4. Assert: Output contém "BUILD_GREEN" ou nenhum erro crítico
Expected Result: Build completo sem erros de compilação
Evidence: Build output em .sisyphus/evidence/build.log
```

**Scenario 3: Atualização de nome reflete em Actor**
```
Tool: Bash (psql)
Preconditions: Usuário de teste existente
Steps:
  1. Update user via saveUser() com novo nome
  2. Query: SELECT name FROM actor WHERE id = [actor_id do user]
  3. Assert: actor.name = novo nome
  4. Query: SELECT * FROM "user" WHERE id = [user_id]
  5. Assert: Não existe campo name na tabela user
Expected Result: Nome atualizado apenas em Actor, não em User
Evidence: Query results em .sisyphus/evidence/scenario-3.log
```

---

## Execution Strategy

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2 | None |
| 2 | 1 | 3 | None |
| 3 | 2 | 4 | None |
| 4 | 3 | 5 | None |
| 5 | 4 | None | None |

### Wave Execution

```
Wave 1 (Schema):
└── Task 1: Criar RPCs no banco

Wave 2 (Service):
└── Task 2: Refatorar saveUser()

Wave 3 (Types):
└── Task 3: Atualizar interfaces se necessário

Wave 4 (Validation):
└── Task 4: Testar integração

Wave 5 (Build):
└── Task 5: Build de produção
```

---

## TODOs

- [ ] 1. Criar RPCs `create_user_with_actor` e `update_user_with_actor`

  **What to do**:
  - Criar migration SQL em `database/migrations/`
  - Implementar função `create_user_with_actor` que:
    1. Insere em `actor` (name, clinic_id, type='user')
    2. Insere em `user` (id, actor_id, email, role, iam_bindings, assigned_room)
    3. Retorna o registro completo
  - Implementar função `update_user_with_actor` que:
    1. Atualiza `actor` se name mudou
    2. Atualiza `user` com demais campos
  - Garantir atomicidade com transação

  **Must NOT do**:
  - NÃO modificar tabela `profiles` (legado)
  - NÃO remover funções existentes
  - NÃO alterar permissões RLS

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain` (lógica de transação SQL complexa)
  - **Skills**: [`postgres`, `supabase`]
    - `postgres`: Domínio de PL/pgSQL e transações
    - `supabase`: Conhecimento de RLS e Auth

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 2
  - **Blocked By**: None

  **References**:
  - Pattern: `patient.service.ts:110` - Uso de RPC similar
  - Schema: `database/schema.sql` - Estrutura de tabelas
  - Types: `frontend/src/app/core/models/types.ts:122-132` - UserProfile

  **Acceptance Criteria**:
  - [ ] Migration executa sem erros
  - [ ] RPC `create_user_with_actor` existe e é chamável
  - [ ] RPC `update_user_with_actor` existe e é chamável
  - [ ] Teste: criação retorna usuário com actor_id preenchido

  **Commit**: YES
  - Message: `feat(database): add RPCs for user creation with Actor pattern`
  - Files: `database/migrations/00X_add_user_actor_rpc.sql`

---

- [ ] 2. Refatorar método `saveUser()` em `DatabaseService`

  **What to do**:
  - Substituir lógica atual (linhas 486-537) por:
    - Novo usuário: chamar `create_user_with_actor` via RPC
    - Update: chamar `update_user_with_actor` via RPC
  - Manter tratamento de erro existente
  - Preservar interface pública (assinatura do método)
  - Atualizar mapeamento de retorno para UserProfile

  **Must NOT do**:
  - NÃO alterar assinatura do método (manter compatibilidade)
  - NÃO usar tabela `profiles` (deprecated)
  - NÃO quebrar código que chama saveUser()

  **Recommended Agent Profile**:
  - **Category**: `quick` (refatoração direta)
  - **Skills**: [`typescript`, `angular`]
    - `typescript`: Tipagem correta
    - `angular`: Serviços e injeção de dependência

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 4
  - **Blocked By**: Task 1

  **References**:
  - Pattern: `patient.service.ts:107-123` - RPC call pattern
  - Current: `database.service.ts:486-537` - Código a ser refatorado
  - Service: `database.service.ts:377-385` - Exemplo addPatient com RPC

  **Acceptance Criteria**:
  - [ ] saveUser chama RPC para criação (novo usuário)
  - [ ] saveUser chama RPC para atualização (usuário existente)
  - [ ] Retorno mapeado corretamente para UserProfile
  - [ ] Erros propagados corretamente

  **Commit**: YES
  - Message: `refactor(database): update saveUser to use Actor pattern RPCs`
  - Files: `frontend/src/app/core/services/database.service.ts`

---

- [ ] 3. Verificar e atualizar interfaces TypeScript

  **What to do**:
  - Verificar se `UserProfile` (types.ts:122) está alinhado
  - Confirmar que campos opcionais estão corretos
  - Adicionar tipos para parâmetros RPC se necessário

  **Must NOT do**:
  - NÃO alterar campos obrigatórios sem migrar dados
  - NÃO quebrar outros componentes

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`typescript`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 4
  - **Blocked By**: Task 2

  **References**:
  - `frontend/src/app/core/models/types.ts:122-132`
  - `frontend/src/app/core/models/types.ts:4-10` (Actor interface)

  **Acceptance Criteria**:
  - [ ] UserProfile reflete estrutura real do banco
  - [ ] Campos mapeados corretamente (camelCase)

  **Commit**: NO (agrupar com Task 2)

---

- [ ] 4. Testar integração end-to-end

  **What to do**:
  - Executar testes manuais via console/admin panel
  - Criar usuário de teste
  - Editar usuário de teste
  - Verificar consistência no banco

  **Must NOT do**:
  - NÃO usar dados de produção

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 5
  - **Blocked By**: Task 3

  **Acceptance Criteria**:
  - [ ] Criação de usuário funciona via UI
  - [ ] Actor é criado automaticamente
  - [ ] Edição atualiza Actor corretamente

  **Commit**: NO

---

- [ ] 5. Build de produção

  **What to do**:
  - Executar `ng build --configuration=production`
  - Verificar zero erros
  - Capturar evidência

  **Must NOT do**:
  - NÃO ignorar warnings críticos

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`angular-cli`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: None
  - **Blocked By**: Task 4

  **Acceptance Criteria**:
  - [ ] Build completo sem erros
  - [ ] Exit code 0
  - [ ] Arquivos gerados em `dist/`

  **Commit**: NO

  **Agent-Executed QA Scenario**:
  ```
  Scenario: Build de produção verde
    Tool: Bash
    Preconditions: Tasks 1-4 completos
    Steps:
      1. cd frontend/
      2. ng build --configuration=production 2>&1
      3. Assert: Exit code = 0
      4. Assert: Output não contém "ERROR" ou "error TS"
    Expected Result: BUILD_GREEN
    Evidence: .sisyphus/evidence/build-final.log
  ```

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(database): add RPCs for user creation with Actor pattern` | `database/migrations/*.sql` | psql -c "SELECT proname FROM pg_proc WHERE proname LIKE '%user%'" |
| 2 | `refactor(database): update saveUser to use Actor pattern RPCs` | `database.service.ts`, `types.ts` | ng build (check compilation) |

---

## Success Criteria

### Verification Commands
```bash
# Verificar RPCs existem
cd database && psql $DATABASE_URL -c "\df *user*"

# Build Angular
cd frontend && ng build --configuration=production

# Verificar integridade (exemplo)
psql $DATABASE_URL -c "SELECT u.id, u.email, a.name, a.clinic_id FROM \"user\" u JOIN actor a ON u.actor_id = a.id LIMIT 5;"
```

### Final Checklist
- [ ] RPC `create_user_with_actor` funciona
- [ ] RPC `update_user_with_actor` funciona
- [ ] saveUser() usa RPCs corretamente
- [ ] Build verde confirmado
- [ ] Nenhum registro órfão de actor
- [ ] Integridade: User.actor_id -> Actor.id válido

---

## Notes

### Estrutura Esperada do Banco (Padrão Actor)

```sql
-- Tabela Actor (central)
create table actor (
  id uuid primary key default uuid_generate_v4(),
  clinic_id text references clinics(id),
  name text not null,
  type text check (type in ('patient', 'user', 'clinic', 'system')),
  created_at timestamptz default now()
);

-- Tabela User (específica)
create table "user" (
  id uuid references auth.users primary key,  -- Mesmo ID do Auth
  actor_id uuid references actor(id),
  email text,
  role text,
  iam_bindings jsonb default '[]',
  assigned_room text
);
```

### Diferença Patient vs User

| Aspecto | Patient | User |
|---------|---------|------|
| ID | uuid_generate_v4() | auth.users.id |
| Criação | Pode ser offline | Sempre requer Auth |
| Actor | Mesmo padrão | Mesmo padrão |
| Tabela específica | patient | "user" |

### Pontos de Atenção

1. **Transação**: A RPC deve usar BEGIN/COMMIT/ROLLBACK
2. **Auth**: Criar usuário no Auth ANTES de inserir em "user"
3. **RLS**: Verificar se políticas permitem a operação
4. **Rollback**: Se falhar em qualquer etapa, desfazer tudo
