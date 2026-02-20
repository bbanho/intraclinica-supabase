# ADMIN_SOVEREIGNTY_CLINICS: Gestão de Clínicas e Correção de Schema

## TL;DR
> Padronização da gestão de clínicas (`addClinic`, `deleteClinic`) corrigindo a divergência de nomenclatura (`clinic` vs `clinics`) e implementando validações de segurança (RLS/Tenancy).

**Deliverables:**
- Correção de todas as referências para o nome correto da tabela (`clinics`).
- Implementação robusta de `addClinic` (com validação de ID único).
- Implementação de `deleteClinic` (Soft delete ou Cascade seguro).
- Validação de RLS para criação de clínicas.

**Estimated Effort:** Low (1 hora)
**Critical Path:** Fix Table Name -> Implement Methods -> Verify RLS

---

## Context

### Estado Atual
- `DatabaseService` usa `.from('clinic')`.
- `schema.sql` define `create table clinics`.
- Métodos `addClinic` e `deleteClinic` são stubs funcionais básicos, sem validação.

### Problema
O Supabase/Postgres é sensível ao nome exato. Se a tabela é `clinics`, o código `.from('clinic')` falhará (erro 404/42P01). Precisamos alinhar código e banco.

---

## Work Objectives

### Core Objective
Garantir que a criação e remoção de clínicas funcione corretamente e respeite a arquitetura multi-tenant.

### Concrete Deliverables
1. **Refactor**: Renomear referências de `clinic` para `clinics` no `database.service.ts`.
2. **Feature**: `addClinic` deve validar se ID já existe.
3. **Feature**: `deleteClinic` deve marcar status como `inactive` (Soft Delete) em vez de `DELETE` físico (preservação de histórico).

---

## Execution Strategy

### Wave 1: Saneamento
- [ ] 1. Verificar nome real da tabela no banco (via `axioma-query` ou tentativa de select).
- [ ] 2. Refatorar `database.service.ts` para usar o nome correto (`clinics`).

### Wave 2: Implementação
- [ ] 3. Atualizar `addClinic` para lidar com erros de duplicidade.
- [ ] 4. Atualizar `deleteClinic` para fazer Soft Delete (`update clinics set status = 'inactive'`).

### Wave 3: Validação
- [ ] 5. `ng build` para garantir integridade.

---

## Verification
- Build verde.
- Análise estática do código para garantir ausência de `.from('clinic')`.

