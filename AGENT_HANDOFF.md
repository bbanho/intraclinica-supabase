# Handoff de Contexto (IntraClinica Supabase)

## 1. Estado Atual do Projeto
- **Stack:** Angular 17+ (Frontend) e Supabase / PostgreSQL (Backend).
- **Status da Arquitetura:** A aplicação atingiu um grau crítico de maturidade. A UI (FSD/Headless) e a Segurança RLS (IAM Bindings) estão operacionais e blindadas contra vazamento de dados multi-tenant.
- **Base de Conhecimento Central:** A documentação para o cliente final fica em `documentacao/`. A documentação de arquitetura do desenvolvedor fica em `docs/IMPLEMENTATION_MASTER_PLAN.md` e nos arquivos ADR em `docs/adr/`. 

## 2. Refatoração Urgente do Banco de Dados (Bloqueio Estrutural)
- **Problema de Atomicidade:** A persistência da UI atual no `inventory.service` e `patient.service` realiza múltiplas chamadas `await` ao invés de usar transações atômicas no lado do servidor. Isso fere os princípios do Master Plan e deixa as tabelas sucetíveis a entidades órfãs (`actor` sem `patient` e vice-versa). 
- **Ação Imediata (Top Priority):** O desenvolvimento da UI está **PAUSADO**. A próxima tarefa não deve tocar no Angular, HTML ou CSS. A tarefa atual é planejar e implementar PostgreSQL RPCs (Transações Atômicas).
  1. Avaliar a adoção de RPCs seguras (e.g. `create_patient`, `create_product_with_stock`) no Supabase e substituir as lógicas sequenciais instáveis no frontend.
  2. Implementar a tipagem correta de retorno das novas funções no Angular e varrer o código atrás de hardcodes, garantindo uso exclusivo de `form.getRawValue()`.

## 3. Próximos Passos Imediatos (Pós-Refatoração do Banco)

1. **Retomar CRUDs Raiz (Pacientes e Estoque):** ⏳ **PAUSADO**
   - Apenas voltar para cá quando a API REST do Supabase estiver com suas operações sensíveis protegidas por RPCs.
   - **Ação:** Implementar o Web Worker (csv/xlsx) para geração de etiquetas do estoque e API de leitor de código de barras.

2. **O Prontuário Médico (Clinical) - Modo Foco:** 📝 **PLANEJADO**
   - **Ação:** Criar o módulo `clinical`. A UI deve ser Full-Screen (escondendo o Sidebar) para maximizar a área de digitação do médico.
   - **Integração IA:** Implementar o *Dynamic Import* do `@mlc-ai/web-llm` conforme o Master Plan.

## 4. Regras de Ouro (Invariáveis)
O próximo agente **deve** respeitar estas regras:
1. **Multi-Tenant Seguro (DB Level):** Todo o RLS é garantido via banco de dados pela coluna `iam_bindings` do JSONB e as funções `has_clinic_access`. **Nunca** remover essas defesas ao recriar/atualizar tabelas.
2. **Angular Moderno:** Proibido `*ngIf`/`*ngFor`. Use `@if`, `@for` e componentes `standalone: true`. A aplicação é 100% `Signals`.
3. **Git Flow:** Crie branches (`refactor/db-atomic-operations`, etc.), e garanta `tsc --noEmit` zerado antes de qualquer merge.