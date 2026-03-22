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
A interface de agendamento e o fluxo de atendimento médico estão prontos no Frontend. As próximas prioridades identificadas são:

1. **Validação de Conflito de Horários (Backend/Database):**
   - Atualmente, é possível agendar dois pacientes para o mesmo médico no mesmo horário.
   - **Ação:** Precisamos investigar e criar uma *constraint* ou um *trigger* (função RPC no Supabase) na tabela `appointment` que bloqueie agendamentos sobrepostos para o mesmo `doctor_actor_id` na mesma data/hora.
2. **Teste End-to-End do Fluxo Clínico:**
   - Criar uma consulta de teste, fazer o check-in na Recepção (status `Aguardando`), e atender via aba Prontuário para validar se a conexão Fila -> Consultório -> Insumos está 100% fluida após as refatorações.