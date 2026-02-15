# MISSION_SOCIAL_CLINICAL_PERSISTENCE: Real Persistence for Clinical and Social modules

## TL;DR
> Implementação da persistência real para  e  no , substituindo stubs por chamadas Supabase diretas, alinhadas com o schema e RLS.

**Deliverables:**
- Método  funcional.
- Método  funcional.
- Build Verde.

**Estimated Effort:** Low (1 hour)
**Critical Path:** Update Service Methods -> Verify Build

---

## Context
Atualmente,  e  são stubs ou implementações parciais. O schema  e  já existe e está correto no banco.

## Work Objectives
1. **Clinical**: Garantir que  insira corretamente na tabela  com  e .
2. **Social**: Garantir que  insira na tabela  com .
3. **Refactor**: Remover logs de console e simulações.

## Execution Strategy
- [ ] 1. Refatorar  em .
- [ ] 2. Refatorar  em .
- [ ] 3. Validar build.


