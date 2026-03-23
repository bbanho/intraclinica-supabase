# Handoff de Contexto (IntraClinica Supabase)

## 1. Estado Atual do Projeto
- **Stack:** Angular 17+ (Frontend) e Supabase / PostgreSQL (Backend).
- **Status:** Todos os 8 módulos principais foram auditados e refatorados para a arquitetura moderna. As dívidas técnicas críticas de "vazamento de contexto" (cross-tenant data leaks) e de reatividade (Signals) foram resolvidas via PRs #46, #47 e #48.
- **Base de Conhecimento Central:** A documentação para o cliente final fica em `documentacao/`. Mas antes de investigar como o banco ou a arquitetura funcionam, consulte a documentação DEV em `docs/` (como os TXTs de auditoria gerados por agentes anteriores e imagens em `docs/assets/`). Esses arquivos contêm o mapa do banco de dados (ex: tabela `actor`, `app_user`, `clinic_module`), as funções RPC mapeadas e o fluxo de dados dos Services do Angular. 
- **Módulos Refatorados Recentemente:**
  - `Reception`: Fila de check-in e nova Agenda Semanal fundidas em um sistema de abas. Conectado ao Supabase via `AppointmentService` consumindo dados reais em UI (Signals).
  - `Clinical` (Prontuário): O histórico do paciente foi isolado (não vaza mais dados de outros pacientes) e a aba de "Procedimentos" foi modernizada (Tailwind + Signals) com travamento de paciente via `@Input()`.
  - `Admin`, `Social`, `Procedures`: Hardcodes e *stubs* removidos, `effect()` implementado para reagir corretamente às trocas de clínicas do Supabase.

## 2. Regras de Ouro (Sintese do AGENTS.md)
O próximo agente **deve** respeitar estas regras inegociáveis:
1. **Multi-Tenant Seguro:** NENHUMA query, lista ou criação de dados deve ocorrer sem filtrar por `this.db.selectedContextClinic()`. Se for `null` ou `'all'`, aborte a operação nas telas locais.
2. **Angular Moderno:** Proibido o uso de `*ngIf`, `*ngFor` ou `NgModule`. Use `@if`, `@for` e componentes `standalone: true`.
3. **Reatividade:** A aplicação é 100% `Signals`. Não faça cópias estáticas no `ngOnInit` (ex: `this.lista = this.store.lista()`). Use `computed()` para derivar estado ou consuma o Signal direto no template.
4. **Git Flow:** Nunca faça commit direto na `main`. Crie branches (`feat/`, `fix/`, `refactor/`), valide com `./node_modules/.bin/tsc --noEmit` e abra Pull Requests.

## 3. Próximos Passos Imediatos (Backlog Ativo pós-Compactação)

1. **Reidratar a Recepção (Módulo Operacional):** ✅ **CONCLUÍDO**
   - A UI da Recepção foi integrada ao Supabase criando o `AppointmentService` (`getWaitlistForToday`, `createAppointment`). Listagem, atualização de status e agendamento estão conectados à base de dados filtrando corretamente pelo contexto multi-tenant.

2. **Finalizar CRUDs Raiz (Pacientes e Estoque):** ⏳ **PENDENTE**
   - Os subagentes já criaram a fundação das pastas `patients` e `inventory`.
   - **Ação:** Revisar a UI desses módulos. O Gerador de Etiquetas do Estoque precisa de um Web Worker (csv/xlsx parser) e o Leitor de Código de Barras (Hardware API) precisa ser implementado, conforme detalhado no Master Plan.

3. **O Prontuário Médico (Clinical) - Modo Foco:** 📝 **PLANEJADO**
   - **Ação:** Criar o módulo `clinical`. A UI deve ser Full-Screen (escondendo o Sidebar) para maximizar a área de digitação do médico.
   - **Integração IA:** Implementar o *Dynamic Import* do `@mlc-ai/web-llm` conforme o Master Plan, garantindo que o carregamento da IA não trave o inicializador do Angular.

## 4. O "Master Plan" (Documentação Central)
O projeto é estritamente governado pelo `docs/IMPLEMENTATION_MASTER_PLAN.md` e `/docs/adr/001-frontend-modularization.md`. Regra de Ouro: **FSD Strict**. Um módulo não importa outro módulo horizontalmente. A arquitetura é "Dumb UI" (Angular 18 Signals + Tailwind + CDK) conectada a um "Smart Backend" (Supabase RLS + Fail Loud).