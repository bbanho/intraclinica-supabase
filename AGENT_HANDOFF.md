# Handoff de Contexto (IntraClinica Supabase)

## 1. Estado Atual do Projeto
- **Stack:** Angular 17+ (Frontend) e Supabase / PostgreSQL (Backend).
- **Status:** Todos os 8 módulos principais foram auditados e refatorados para a arquitetura moderna. As dívidas técnicas críticas de "vazamento de contexto" (cross-tenant data leaks) e de reatividade (Signals) foram resolvidas via PRs #46, #47 e #48.
- **Base de Conhecimento Central:** A documentação para o cliente final fica em `documentacao/`. Mas antes de investigar como o banco ou a arquitetura funcionam, consulte a documentação DEV em `docs/` (como os TXTs de auditoria gerados por agentes anteriores e imagens em `docs/assets/`). Esses arquivos contêm o mapa do banco de dados (ex: tabela `actor`, `app_user`, `clinic_module`), as funções RPC mapeadas e o fluxo de dados dos Services do Angular. 
- **Módulos Refatorados Recentemente:**
  - `Reception`: Fila de check-in e nova Agenda Semanal fundidas em um sistema de abas. O módulo obsoleto `/appointments` foi removido.
  - `Clinical` (Prontuário): O histórico do paciente foi isolado (não vaza mais dados de outros pacientes) e a aba de "Procedimentos" foi modernizada (Tailwind + Signals) com travamento de paciente via `@Input()`.
  - `Admin`, `Social`, `Procedures`: Hardcodes e *stubs* removidos, `effect()` implementado para reagir corretamente às trocas de clínicas do Supabase.

## 2. Regras de Ouro (Sintese do AGENTS.md)
O próximo agente **deve** respeitar estas regras inegociáveis:
1. **Multi-Tenant Seguro:** NENHUMA query, lista ou criação de dados deve ocorrer sem filtrar por `this.db.selectedContextClinic()`. Se for `null` ou `'all'`, aborte a operação nas telas locais.
2. **Angular Moderno:** Proibido o uso de `*ngIf`, `*ngFor` ou `NgModule`. Use `@if`, `@for` e componentes `standalone: true`.
3. **Reatividade:** A aplicação é 100% `Signals`. Não faça cópias estáticas no `ngOnInit` (ex: `this.lista = this.store.lista()`). Use `computed()` para derivar estado ou consuma o Signal direto no template.
4. **Git Flow:** Nunca faça commit direto na `main`. Crie branches (`feat/`, `fix/`, `refactor/`), valide com `./node_modules/.bin/tsc --noEmit` e abra Pull Requests.

## 3. Próximos Passos Imediatos (Backlog Ativo)

1. **Validação de Conflito de Horários (Backend/Database):** ✅ **CONCLUÍDO**
   - Migration aplicada com constraint `EXCLUDE USING gist`, limitando conflitos com a nova coluna `duration_minutes`. Script de deduplicação mitigou o erro `23P01`.
   - Trigger com erro `P0001` em português adicionado. 

2. **Migração Arquitetural Greenfield (Frontend V2):** ✅ **CONCLUÍDO (Fundação)**
   - O frontend legado (V1) provou-se frágil para E2E (modais engolidos por `overflow-hidden` e Tailwind mal balanceado).
   - Abortamos os testes no legado e criamos o `frontend-v2` com **Angular 18 + Angular CDK (Headless) + Tailwind CSS**. A "Prova de Vida" da recepção (com modais CDK) isolou perfeitamente o Z-index.
   - O `IMPLEMENTATION_MASTER_PLAN.md` foi escrito ditando regras imutáveis de Módulos Independentes.

3. **Arquitetura Fail-Loud e Config-Driven UI:** ✅ **CONCLUÍDO (Testado)**
   - Desenhamos o `AdminPanelComponent` (Painel Global SaaS) como a fundação do sistema.
   - Provamos a arquitetura **Fail-Loud** com Signals: O Toggle de "Ativar Módulo" não muda visualmente se o Supabase estourar erro (Ex: *Foreign Key* ou *RLS*). O front nunca mente o estado do banco.

4. **Ajuste de Políticas RLS (Supabase):** ⏳ **PRÓXIMO PASSO (BLOQUEANTE)**
   - O `SUPER_ADMIN` (ex: `bmbanho@gmail.com`) loga perfeitamente na V2, mas é bloqueado pelo RLS ao tentar ativar módulos (`INSERT`/`UPDATE` na `clinic_module`).
   - **Ação Imediata:** Revisar as policies SQL da tabela `clinic_module` para permitir que roles de `SUPER_ADMIN` na tabela `app_user` editem os módulos.

## 4. O "Master Plan" (Documentação Central)
O projeto agora é regido pelos documentos `/docs/adr/001-frontend-modularization.md` e `/docs/IMPLEMENTATION_MASTER_PLAN.md`. A arquitetura proíbe acoplamento de UI e dita Lazy Loading (Dynamic Imports) para integrações pesadas como o WebLLM e WebWorkers para CSV.