# Handoff de Contexto (IntraClinica Supabase)

## 1. Estado Atual do Projeto
- **Stack:** Angular 17+ (Frontend) e Supabase / PostgreSQL (Backend).
- **Status da Arquitetura:** A aplicação atingiu um grau crítico de maturidade. A UI (FSD/Headless) e a Segurança RLS (IAM Bindings) estão operacionais e blindadas contra vazamento de dados multi-tenant.
- **Base de Conhecimento Central:** A documentação para o cliente final fica em `documentacao/`. A documentação de arquitetura do desenvolvedor fica em `docs/IMPLEMENTATION_MASTER_PLAN.md` e nos arquivos ADR em `docs/adr/`. 

## 2. Refatoração Urgente do Banco de Dados (O Achatamento / Flattening)
- **Problema:** A tabela abstrata `actor` (superclasse de `app_user` e `patient`) causa gargalos de performance (JOINs), quebra a atomicidade no frontend (obriga dupla inserção não transacional) e polui o TypeScript com tipos aninhados (`patient.actor.name`).
- **Decisão (ADR 003):** Achatar o modelo de dados. A tabela `actor` será removida. `patient` e `app_user` receberão a coluna `name` diretamente. O polimorfismo será sacrificado em prol da **simplicidade mecânica**, performance e queries atômicas nativas (PostgREST).
- **Ação Imediata (Top Priority):** O desenvolvimento de novas UIs está **PAUSADO**. Estamos na branch `refactor/db-flattening`. A tarefa atual é executar o plano de achatamento:
  1. Criar a migração SQL que altera `patient` e `app_user`, remove `actor` e ajusta todas as Foreign Keys (`doctor_actor_id` vira `doctor_id` apontando para `app_user`).
  2. Criar a RPC `create_product_with_stock` para resolver a dupla inserção do estoque de forma transacional no banco.
  3. Refatorar o Angular (`PatientService`, `InventoryService`, `AppointmentService`) para consumir a nova estrutura plana e as novas RPCs, removendo as tipagens aninhadas (`actor?: PatientActor`).

## 3. Próximos Passos Imediatos (Pós-Refatoração do Banco)

1. **Retomar CRUDs Raiz (Pacientes e Estoque):** ⏳ **PAUSADO**
   - Apenas voltar para cá quando a API REST do Supabase estiver com suas operações sensíveis protegidas por RPCs e o achatamento estiver validado.
   - **Ação:** Implementar o Web Worker (csv/xlsx) para geração de etiquetas do estoque e API de leitor de código de barras.

2. **O Prontuário Médico (Clinical) - Modo Foco:** 📝 **PLANEJADO**
   - **Ação:** Criar o módulo `clinical`. A UI deve ser Full-Screen (escondendo o Sidebar) para maximizar a área de digitação do médico.
   - **Integração IA:** Implementar o *Dynamic Import* do `@mlc-ai/web-llm` conforme o Master Plan.

## 4. Regras de Ouro (Invariáveis)
O próximo agente **deve** respeitar estas regras:
1. **Multi-Tenant Seguro (DB Level):** Todo o RLS é garantido via banco de dados pela coluna `iam_bindings` do JSONB e as funções `has_clinic_access`. **Nunca** remover essas defesas ao recriar/atualizar tabelas.
2. **Angular Moderno:** Proibido `*ngIf`/`*ngFor`. Use `@if`, `@for` e componentes `standalone: true`. A aplicação é 100% `Signals`.
3. **Git Flow:** Estamos na branch `refactor/db-flattening`. Garanta `tsc --noEmit` zerado antes de qualquer merge.