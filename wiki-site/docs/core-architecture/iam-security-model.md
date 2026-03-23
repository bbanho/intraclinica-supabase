---
title: IAM Security Model (GCP-Style)
description: O novo paradigma de segurança Role-Based Access Control com Delegação Hierárquica e "Cherry-Picking".
---

# IAM Security Model (GCP-Style)

O **IntraClinica** implementa um sistema de controle de acesso de padrão corporativo (inspirado no Google Cloud Platform - GCP), focado em flexibilidade, performance no banco de dados e hierarquia estrita de delegação.

> **Princípio Fundamental:** Nenhuma string de permissão (ex: `'DOCTOR'`, `'RECEPTIONIST'`) deve existir hardcoded nas condicionais do frontend. O sistema inteiro *reage* a um dicionário dinâmico vindo do Supabase.

## 1. A Hierarquia de Autorização: Role -> Grant -> Block

Nós avaliamos a permissão de um usuário para executar uma ação (ex: `inventory.view_cost`) seguindo um funil estrito de prioridades. O algoritmo de resolução no banco e no frontend é:

1. **Blocks Explícitos (Deny Policies):** O usuário possui um bloqueio explícito (Cherry-picked Block) para essa ação nesta clínica? Se sim, **NEGA**. (Mesmo que ele seja o dono da clínica, um Block tem precedência absoluta).
2. **Grants Explícitos (Cherry-picked Grant):** O usuário recebeu a permissão individual para essa ação? Se sim, **PERMITE**.
3. **Roles Base (Pacotes Padrão):** O usuário possui uma Role (Ex: `roles/doctor`) cujo dicionário contém essa permissão? Se sim, **PERMITE**.
4. **Contexto Global (SaaS):** Se a permissão não foi resolvida localmente, o motor repete os passos 1 a 3 no nó "Global" do usuário (útil para `SUPER_ADMIN` ou suporte técnico).
5. **Default:** Se nada for encontrado, **NEGA**.

## 2. Delegação Hierárquica (Níveis de Poder)

Para que um usuário comum com permissão `users.manage` não consiga escalar seus próprios privilégios ou criar um "Dono" para a clínica, as Roles possuem um sistema de "Peso" (Level). 

| Nível (Level) | Nome da Role Base | Escopo Típico |
|:---:|:---|:---|
| **0** | `roles/super_admin` | Global SaaS (Tudo) |
| **10** | `roles/clinic_admin` | Tenant (Dono da Clínica) |
| **20** | `roles/doctor` | Equipe Médica e Clínica |
| **30** | `roles/stock_manager` | Compras e Estoque |
| **40** | `roles/reception` | Atendimento e Agenda |

**Regra de Ouro da Delegação:** Um usuário só pode atribuir papéis (Roles) aos seus funcionários que tenham um Level **maior ou igual** ao seu próprio Level.
*Exemplo:* O Administrador (10) pode criar um Médico (20) ou um Recepcionista (40). O Médico (20) não pode transformar ninguém em Administrador (10).

## 3. O Dicionário de Dados (Supabase)

Tudo isso vive em duas tabelas estáticas no PostgreSQL, expostas ao frontend apenas para leitura:

1. `iam_permissions`: O catálogo absoluto de ações atômicas.
   *(Ex: `appointments.write`, `clinical.read_records`, `inventory.view_cost`)*
2. `iam_roles`: A definição de cada pacote.
   *(Ex: `id: 'roles/reception'`, `default_grants: ['appointments.read', 'patients.write']`, `level: 40`)*

## 4. O Motor RLS (A Coluna `iam_bindings`)

Para evitar JOINs custosos a cada query no Supabase (o que destruiria a performance do SaaS), as vinculações do usuário vivem na coluna **JSONB** `iam_bindings` da tabela `app_user`.

```json
{
  "global": {
    "roles": ["roles/super_admin"],
    "grants": [],
    "blocks": []
  },
  "uuid_da_clinica_A": {
    "roles": ["roles/doctor"],
    "grants": ["inventory.view_cost"], 
    "blocks": ["clinical.delete_records"]
  }
}
```

A função RPC do PostgreSQL `has_permission(auth.uid(), clinic_id, 'inventory.view_cost')` decodifica esse JSONB em milissegundos e retorna `TRUE` ou `FALSE` diretamente para a Row Level Security de tabelas como `patients` e `products`.

## 5. Frontend Implementation (`IamService`)

O motor de segurança no frontend é centralizado no `IamService`, que espelha a lógica de resolução do PostgreSQL para garantir uma experiência de usuário (UX) fluida e sem latência.

### 5.1 Signal-Based Architecture
O `IamService` (`frontend/src/app/core/services/iam.service.ts`) utiliza Angular Signals para armazenar o dicionário de permissões e os bindings do usuário. Isso permite buscas O(1) na memória sem requisições repetitivas ao banco de dados:

```typescript
private _roles = signal<Map<string, IamRole>>(new Map());
private _permissions = signal<Map<string, IamPermission>>(new Map());
private _userBindings = signal<UserIamBindings | null>(null);
public userBindings = this._userBindings.asReadonly();
public isInitialized = signal<boolean>(false);
```

### 5.2 The `can()` Method
O método `can()` é a porta de entrada para verificações de permissão em templates e guardas. Ele segue rigorosamente o funil Role -> Grant -> Block:

```typescript
public can(permissionKey: string): boolean {
  if (!this.isInitialized()) return false;
  
  const bindings = this._userBindings();
  if (!bindings) return false;

  const currentClinicId = this.clinicCtx.selectedClinicId();

  // 1. Avalia o contexto local (Clínica)
  if (currentClinicId && currentClinicId !== 'all' && bindings[currentClinicId]) {
    const localResult = this.evaluateContextPermissions(bindings[currentClinicId], permissionKey);
    if (localResult !== null) return localResult;
  }

  // 2. Fallback para o contexto Global (SaaS)
  const globalResult = this.evaluateContextPermissions(bindings.global, permissionKey);
  if (globalResult !== null) return globalResult;

  // Default: Deny
  return false;
}
```

### 5.3 Initialization Guard
O `can()` retorna `false` até que o cache do IAM esteja totalmente carregado (`isInitialized()`). Isso evita condições de corrida (race conditions) onde a interface poderia renderizar elementos restritos antes que as permissões fossem validadas.

### 5.4 `evaluateContextPermissions` Helper
Este método privado centraliza a lógica de precedência (Block > Grant > Role). Ele retorna `boolean` se a permissão for resolvida ou `null` se deve prosseguir para o próximo nível (fallback global), garantindo que a lógica não seja duplicada entre os escopos.

### 5.5 Auth Integration
O serviço utiliza um `effect()` no construtor que monitora o `auth.currentUser()`. Ao detectar um login, dispara automaticamente a inicialização do cache (`initializeIamCache`). Ao deslogar, limpa todos os signals para garantir que nenhum dado de segurança vaze entre sessões.

### 5.6 MainLayout Synchronization
Para reagir dinamicamente a mudanças nas permissões ou na troca de clínica, componentes como a barra lateral utilizam a sincronização entre Signals e Observables:

```typescript
// Exemplo conceitual de uso no MainLayout/Sidebar
toObservable(this.iam.userBindings).pipe(
  switchMap(bindings => this.clinicService.fetchAllowedClinics(bindings))
).subscribe(...)
```
O uso de `switchMap` garante que, se o perfil do usuário mudar rapidamente, requisições obsoletas sejam canceladas, mantendo a UI em sincronia com o estado atual do IAM.
