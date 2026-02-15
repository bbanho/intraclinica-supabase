# Plano de Correção: saveUser() no DatabaseService

## TL;DR

**Problema**: O método `saveUser()` no `DatabaseService` tenta usar tabelas `actor` e `user` que **NÃO EXISTEM** no schema do banco. O schema real usa apenas a tabela `profiles`.

**Solução**: Refatorar `saveUser()` para usar a tabela `profiles` corretamente, mantendo compatibilidade com o fluxo de criação via `Auth.signUp()`.

**Arquivo Alvo**: `frontend/src/app/core/services/database.service.ts` (linhas 486-563)

**Build**: Deve passar em `ng build --configuration=production`

---

## Contexto

### Schema Real do Banco (Prisma)
```prisma
model Profile {
  id           String    @id @db.Uuid
  name         String
  email        String?
  role         String?   @default("USER")
  clinicId     String?   @map("clinic_id")
  avatar       String?
  assignedRoom String?   @map("assigned_room")
  iam          Json?     @default("[]")
  createdAt    DateTime? @default(now()) @map("created_at")
  
  clinic Clinic? @relation(fields: [clinicId], references: [id])
  @@map("profiles")
}
```

### Implementação Atual (QUEBRADA)
```typescript
async saveUser(u: Partial<UserProfile>, pw?: string) {
  if (u.id) {
    // Update - usa tabela 'actor' que NÃO EXISTE
    const { error: actorError } = await this.supabase
      .from('actor')  // ❌ TABELA NÃO EXISTE
      .update({ name: u.name, clinic_id: u.clinicId })
      .eq('id', u.actor_id);
    
    // Update - usa tabela 'user' que NÃO EXISTE
    const { error: userError } = await this.supabase
      .from('user')  // ❌ TABELA NÃO EXISTE (é 'profiles')
      .update({...})
      .eq('id', u.id);
  } else {
    // Create - usa tabelas inexistentes
    const { data: actorData } = await this.supabase
      .from('actor')  // ❌ NÃO EXISTE
      .insert({ clinic_id: u.clinicId, name: u.name, type: 'user' })
    
    const { error: profileError } = await this.supabase
      .from('user')  // ❌ NÃO EXISTE
      .insert({ id: userId, actor_id: actorData.id, ... })
  }
}
```

---

## TODOs

### [CRÍTICO] 1. Corrigir método saveUser() para usar tabela 'profiles'

**O que fazer:**
Refatorar o método `saveUser()` em `frontend/src/app/core/services/database.service.ts` (linhas 486-563) para usar a tabela `profiles` corretamente.

**Implementação Correta:**
```typescript
async saveUser(u: Partial<UserProfile>, pw?: string) {
  if (u.id) {
    // UPDATE usuário existente
    const { error } = await this.supabase
      .from('profiles')
      .update({
        name: u.name,
        email: u.email,
        role: u.role,
        clinic_id: u.clinicId,
        iam: u.iam,
        assigned_room: u.assignedRoom,
        avatar: u.avatar
      })
      .eq('id', u.id);
    
    if (error) throw error;
    
  } else {
    // CREATE novo usuário
    if (!u.email || !pw || !u.clinicId || !u.name) {
      throw new Error('Email, Password, Name and Clinic are required for new users');
    }
    
    // 1. Criar usuário no Auth
    const { data: authData, error: authError } = await this.supabase.auth.signUp({
      email: u.email,
      password: pw,
      options: {
        data: {
          name: u.name,
          clinic_id: u.clinicId,
          role: u.role || 'USER'
        }
      }
    });
    
    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create auth user');
    
    // 2. O trigger do Supabase já criou o profile automaticamente
    // Apenas atualizamos com dados adicionais
    const { error: profileError } = await this.supabase
      .from('profiles')
      .update({
        name: u.name,
        role: u.role || 'USER',
        clinic_id: u.clinicId,
        iam: u.iam || [],
        assigned_room: u.assignedRoom,
        avatar: u.avatar
      })
      .eq('id', authData.user.id);
    
    if (profileError) throw profileError;
  }
}
```

**Referências:**
- Schema Prisma: `backend/prisma/schema.prisma` (linhas 30-44)
- Tabela profiles: `database/schema.sql` (linhas 16-25)
- Uso atual de Auth.signUp: `frontend/src/app/core/services/database.service.ts:518-528`

**Acceptance Criteria:**
- [ ] Método saveUser() atualizado para usar tabela 'profiles'
- [ ] Removidas todas as referências a tabelas 'actor' e 'user' inexistentes
- [ ] Fluxo de criação: Auth.signUp → update profiles
- [ ] Fluxo de atualização: update profiles direto
- [ ] Tratamento de erros mantido

**Agent-Executed QA Scenarios:**
```
Scenario: Build after saveUser fix
  Tool: Bash
  Steps:
    1. cd /var/home/motto/Documentos/REPO/intraclinica-supabase/frontend
    2. ng build --configuration=production
  Expected Result: Build completa sem erros (BUILD_GREEN)
  Failure Indicators: Erros de TypeScript ou compilação
```

**Commit:**
- Message: `fix(database): corrige saveUser para usar tabela profiles correta`
- Files: `frontend/src/app/core/services/database.service.ts`
- Pre-commit: `ng build --configuration=production` deve passar

---

## Verificação Pós-Correção

### Comandos de Verificação
```bash
cd /var/home/motto/Documentos/REPO/intraclinica-supabase/frontend
ng build --configuration=production
```

**Esperado:** BUILD_GREEN (apenas warnings de CommonJS, sem erros)

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Trigger não criar profile automaticamente | Baixa | Alta | Verificar se trigger existe no Supabase |
| Referências actor_id em outros lugares | Média | Média | Buscar e atualizar todas as referências |
| Quebra de tipos TypeScript | Baixa | Média | Verificar interface UserProfile |

---

## Success Criteria

- [ ] saveUser() usa apenas tabela `profiles` existente
- [ ] Nenhuma referência a tabelas inexistentes (`actor`, `user`)
- [ ] ng build --configuration=production passa
- [ ] Lógica de Auth.signUp preservada
- [ ] Tratamento de erros funcional

---

## Notas

**IMPORTANTE**: A tabela `profiles` já é criada automaticamente pelo Supabase Auth quando um usuário é criado (via trigger). Por isso, no fluxo de criação:
1. Chamamos `auth.signUp()` primeiro
2. Depois apenas **atualizamos** o profile criado automaticamente com os metadados adicionais

Isso evita erros de "duplicate key" e mantém consistência com o Supabase Auth.
