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
