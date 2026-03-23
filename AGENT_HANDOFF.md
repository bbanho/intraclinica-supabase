# Handoff de Contexto (IntraClinica Supabase)

## 1. Estado Atual do Projeto
- **Stack:** Angular 18+ (Frontend), Supabase / PostgreSQL (Backend), Tailwind CSS, Angular CDK.
- **Status da Arquitetura:** O projeto passou por uma refatoração arquitetural massiva. A tabela `actor` foi **DELETADA** (Flattening). Os dados de nome agora residem diretamente em `patient` e `app_user`. A segurança multi-tenant está 100% blindada via PostgreSQL RLS usando a coluna `iam_bindings` (JSONB) indexada com GIN.
- **Estrutura do Repositório:** O frontend legado foi arquivado (`archive/frontend-legacy/`). A pasta oficial do projeto moderno (anteriormente `frontend-v2`) agora é simplesmente `frontend/`. 
- **Base de Conhecimento Central:** Antes de criar tabelas ou arquiteturas, consulte a documentação DEV em `docs/` e o `docs/IMPLEMENTATION_MASTER_PLAN.md`. 

## 2. CI/CD & Deploy Automatizado (Foco Atual)
- **Status:** Configuramos um pipeline no GitHub Actions (`.github/workflows/deploy.yml`) para compilar o Angular (`npm run build`) e publicar estaticamente no **Cloudflare Pages**. A documentação em Markdown (`documentacao/`) está sendo injetada na pasta de build `/doc/`.
- **Ação Imediata para o Próximo Agente:** Verificar se o último deploy no Cloudflare Pages rodou com sucesso. Caso o GitHub Actions falhe (por problemas de dependências no `package-lock.json` ou falha no token do Cloudflare), corrija o pipeline antes de avançar para a UI.

## 3. Próximos Passos Imediatos (UI & Features)

1. **Retomar CRUDs Raiz (Pacientes e Estoque):** ⏳ **PENDENTE**
   - A fundação do banco de dados e os Services do Angular (`PatientService`, `InventoryService`) já estão conectados às novas transações atômicas e ao esquema achatado.
   - **Ação:** Finalizar a UI. Implementar o Web Worker (parser de csv/xlsx) para a geração de etiquetas do Estoque e a API do leitor de código de barras (Hardware API) descrita no Master Plan.

2. **O Prontuário Médico (Clinical) - Modo Foco:** 📝 **PLANEJADO**
   - **Ação:** Criar o módulo `clinical`. A UI deve ser Full-Screen (escondendo o Sidebar) para maximizar a área de digitação do médico.
   - **Integração IA:** Implementar o *Dynamic Import* do `@mlc-ai/web-llm` para sumarização e análise clínica off-line, garantindo que o carregamento da IA não trave a thread principal do Angular.

## 4. Regras de Ouro (Invariáveis)
O próximo agente **deve** respeitar rigorosamente estas regras:
1. **Multi-Tenant Seguro (DB Level):** Todo o RLS é garantido no banco de dados lendo a coluna `iam_bindings` do JSONB através das funções `has_clinic_access` e `has_clinic_role`. Use sempre `(select auth.uid())` nas funções de RLS para cache de performance. **Nunca remova essas defesas.**
2. **Angular Moderno & Signals:** É terminantemente proibido usar `*ngIf`, `*ngFor` ou `NgModule`. Use o novo control flow (`@if`, `@for`), componentes `standalone: true` e a arquitetura 100% orientada a `Signals`.
3. **FSD (Feature-Sliced Design):** A UI de um módulo (`features/`) **nunca** importa ou acopla componentes de outro módulo.
4. **Git Flow:** Crie branches padronizadas (`feat/`, `fix/`, `ci/`), valide a tipagem com `npx tsc --noEmit` localmente na pasta `frontend/` e nunca dê push direto na `main` se a alteração for grande (faça PRs).
