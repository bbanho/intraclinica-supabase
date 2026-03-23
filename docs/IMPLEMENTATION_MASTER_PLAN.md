# IntraClinica: Implementation Master Plan & Architecture Design

## 1. Executive Summary
This document serves as the architectural foundation for IntraClinica, a modern, multi-tenant greenfield SaaS application built on Angular 18+ and Supabase (PostgreSQL). The primary objective is to establish an **implacable, zero-technical-debt architecture** that scales flawlessly. We prioritize strict Feature-Sliced Design (FSD), robust state management using modern Angular Signals, and absolute multi-tenant data isolation.

## 2. Architectural Philosophy & Core Rules
- **Framework Modernity**: 100% Standalone Components, Signal-based reactivity, new control flows (`@if`, `@for`, `@defer`), and `inject()` for DI.
- **Zero Tech Debt Tolerance**: No generic utility dumping grounds. No `any` types. Strict TS checks (`tsc --noEmit`).
- **Multi-Tenant Isolation**: Every interaction mandates `clinicId` context awareness. No global data leakage.
- **Progressive Enhancement**: Lazy load heavy dependencies, specifically AI models and hardware APIs, to guarantee sub-second initial paints.

## 3. Module Architecture: Feature-Sliced Design (FSD)
To ensure isolation, testability, and scalability, the frontend will be structured using FSD. This prevents the "big ball of mud" anti-pattern.

### REGRA ABSOLUTA: Módulos 100% Livres de Dependências Horizontais
A UI de um módulo **nunca** é acoplada a outro. Se o módulo de Recepção precisa criar um paciente, ele **não importa** o módulo de Pacientes nem seus componentes de UI. Em vez disso, a Recepção realiza a inserção diretamente na tabela `patient` via `core/services` (ou serviços de domínio estritamente isolados). A comunicação horizontal entre módulos de negócio é terminantemente proibida na camada de UI.

```text
frontend/src/
├── app/             # Application shell, global providers, core routing
├── pages/           # Route-level components (e.g., AgendaPage, InventoryPage)
├── widgets/         # Independent, self-contained UI blocks (e.g., AgendaCalendarWidget, AICommandBar)
├── features/        # Business logic & interactions (e.g., schedule-appointment, generate-labels)
├── entities/        # Domain data models, stores, and Supabase services (e.g., patient, clinic, product)
└── shared/          # Reusable UI kits (Tailwind/Lucide), pure utilities, and base configurations
```

### Dependency Rules (Strict FSD)
- Layers can only import from layers *below* them.
  - `pages` -> imports `widgets`, `features`, `entities`, `shared`.
  - `entities` -> imports ONLY `shared`.
- Features must NEVER import other features. If features need to communicate, it must be orchestrated at the `widget` or `page` layer.

### A Anatomia de um Módulo Básico
Cada módulo de negócio no IntraClinica deve seguir rigorosamente esta anatomia para garantir o desacoplamento:
1. **Rota Isolada**: O módulo é carregado via lazy-loading em sua própria sub-rota, sem vazar dependências de página no nível principal.
2. **Serviço DB Isolado**: Utiliza chamadas PostgREST específicas para suas necessidades. Não compartilha "Mega Serviços" com outros módulos.
3. **View Component com Signals**: O gerenciamento de estado da UI e da tela é feito via Signals no nível do componente (ou em um Signal Store local/provider de rota), **sem poluir o store global**. O store global é restrito apenas à sessão, permissões e contexto (`clinicId`).

## 4. Multi-Tenant Security & Context Management
IntraClinica is deeply multi-tenant. The core security rule is: **Never fetch, display, or mutate data without verifying and filtering by `clinicId`.**

### Implementation
1.  **Context Store (`entities/clinic/store/clinic.store.ts`)**:
    Provides `selectedContextClinic()` as a `computed` Signal.
2.  **Supabase RLS & Frontend Mapping**:
    Supabase Row Level Security (RLS) is the final defense, but the frontend must proactively filter queries:
    ```typescript
    const clinicId = this.clinicStore.selectedContextClinic();
    if (!clinicId || clinicId === 'all') throw new Error('Invalid Context for local feature');
    return await this.supabase.from('patients').select('*').eq('clinic_id', clinicId);
    ```
3.  **IAM & Feature Gating**:
    Use a central Permission Service (`db.checkPermission('permission.key', clinicId)`) to drive UI rendering (`@if`) and Route Guards. Never hardcode roles.

### 4.1. Clinical Data Privacy & Cryptographic Authorization (Critical Future Requirement)
While `SUPER_ADMIN` access is often unrestricted in early development environments for debugging purposes, **unrestricted access to third-party medical records by system administrators is a severe privacy violation in production.**

To address this, the architecture mandates the future implementation of robust, mathematically proven cryptographic access controls for sensitive clinical data (e.g., patient records, appointment details, clinical notes). 

**Directives for Clinical Data Security:**
- **Explicit Authorization:** System administrators (`SUPER_ADMIN`) must NEVER have default read access to tenant clinical data. Access must require explicit, auditable cryptographic authorization from the data owner (the clinic or the specific doctor).
- **Cryptographic Mechanisms:** We will transition from basic IAM permission checks to strong cryptographic solutions. Acceptable patterns include:
  - **Asymmetric Key Pairs:** Utilizing the WebCrypto API where data is encrypted with the clinic's/doctor's public key and can only be decrypted by their private key.
  - **Hardware/OS-Backed Keys:** Leveraging WebAuthn / Passkeys stored securely on the doctor's device (USB security keys, OS secure enclaves) to unwrap data encryption keys (DEKs).
- **Zero-Knowledge Architecture Goal:** The backend (Supabase) should ideally store encrypted blobs for highly sensitive fields, ensuring that even a database breach or rogue DBA cannot read the plaintext medical records.
- **Validation Mandate:** NEVER implement custom, "homebrew" security or encryption algorithms. All cryptographic implementations must rely exclusively on industry-standard, heavily audited libraries and protocols that hold absolute consensus within the cybersecurity and mathematical communities.

## 5. State Management Strategy
- **Services (`entities/<domain>/api/`)**: Handle raw Supabase API/RPC calls. Stateless.
- **Stores (`entities/<domain>/model/`)**: Signal Stores that wrap services. Expose read-only `computed()` signals to components.
- Avoid component-level state for domain data. Components only hold ephemeral UI state (e.g., dropdown open/closed).

## 6. Managing Complex Integrations

### 6.1. Híbrido IA: WebLLM (Local) & Gemini (Cloud)
The challenge: WebLLM relies on `@mlc-ai/web-llm` and `@tensorflow/tfjs` (WebGPU), which are incredibly heavy. Importing them statically will bloat the main bundle and crash devices without GPU support during hydration/routing.

**Architecture Solution: The AI Orchestrator Pattern**
- **Dynamic Imports**: TensorFlow and WebGPU modules MUST be dynamically imported inside the service initialization method.
- **Service Abstraction**: Create a single `AiOrchestratorService` that routes prompts.
- **Graceful Fallback**: The service checks `navigator.gpu`. If unavailable or if local initialization fails, it seamlessly falls back to the `GeminiService` (Cloud).

```typescript
// features/ai-assistant/api/ai-orchestrator.service.ts
@Injectable({ providedIn: 'root' })
export class AiOrchestratorService {
  private localAiService = inject(LocalAiService);
  private geminiService = inject(GeminiService);

  async askQuestion(prompt: string): Promise<string> {
    if (this.canUseLocalGpu()) {
      try {
        // DYNAMIC IMPORT is mandatory here to preserve lazy loading
        const { MLCEngine } = await import('@mlc-ai/web-llm'); 
        return await this.localAiService.ask(MLCEngine, prompt);
      } catch (e) {
        console.warn('Local AI failed, falling back to Gemini Cloud', e);
      }
    }
    return await this.geminiService.ask(prompt);
  }

  private canUseLocalGpu(): boolean {
    return !!navigator.gpu;
  }
}
```

### 6.2. Hardware Integrations: Reusable Barcode Scanner
Barcode scanners act as rapid keyboard inputs or via camera streams. 

**Architecture Solution: The Singleton Scanner Service & Directive**
1.  **Scanner Service (`shared/api/barcode-scanner.service.ts`)**:
    - Listens to global `keydown` events, buffering keystrokes that happen within a tight threshold (e.g., < 20ms between strokes).
    - Emits a signal `lastScannedCode()` when a full code + 'Enter' is detected.
2.  **Camera Fallback (`widgets/barcode-capture/`)**:
    - A standalone widget that uses `navigator.mediaDevices.getUserMedia`.
    - Wrapped in `@defer (on interaction)` so the heavy camera parsing library (like `html5-qrcode`) is ONLY loaded when the user explicitly clicks "Scan via Camera".
3.  **Usage**: Components inject the service for physical scanners, or use an `@defer` block for the camera UI, ensuring the application remains lightweight until hardware interaction is strictly required.

### 6.3. Data Processing: Etiquetadora (CSV/XLSX Label Generator)
Parsing large CSV/XLSX files blocks the JavaScript main thread, freezing the Angular UI (animations stop, clicks don't register).

**Architecture Solution: Web Workers & Offscreen Processing**
1.  **Web Worker (`features/label-generator/worker/excel-parser.worker.ts`)**:
    - The heavy lifting (parsing XLSX/CSV using libraries like `xlsx` or `papaparse`) is isolated in a background Web Worker.
    - The worker posts back chunked data (e.g., 100 rows at a time) to the main thread.
2.  **Signal Integration**:
    - The `LabelGeneratorStore` receives worker messages and incrementally updates a `processedRows` Signal.
3.  **UI Rendering**:
    - Use Angular's `@for` with `track` to render the parsed labels efficiently.
    - Show a non-blocking progress bar (`@if (isParsing()) <app-progress-bar />`).
    - The UI remains buttery smooth 60fps while gigabytes of data are parsed in the background.

## 7. Quality Assurance & UI/UX Patterns
- **No Stale UI**: Use skeletons for initial loads, spinners for mutations. Never swallow errors silently.
- **Error Handling**: Every API call wrapped in `try/catch`. Errors must be surfaced via Toast notifications.
- **Zero Errors Policy**: CI/CD pipeline enforces `./node_modules/.bin/tsc --noEmit`. Any TypeScript error blocks the deployment.
- **Visual Audits**: Playwright E2E testing integrated for critical paths (Reception, Billing, Inventory).

## 8. Roteiro de Implementação (Master Roadmap)

Construir telas de negócios sem o motor que as permite existir é uma falha arquitetural. O roadmap abaixo deve ser seguido com rigor absoluto.

### PASSO 1: Painel Global SaaS (Config-Driven UI)
O "Caminho Mínimo" do MVP exige a consolidação do alicerce multi-tenant e da gestão SaaS:
- **Super Admin**: Login do administrador geral (contexto `clinicId === 'all'`).
- **Gestão de Clínicas**: Criação, edição e controle de status (ativo/inativo) das clínicas.
- **Motor de Módulos (`clinic_module`)**: Ligar ou desligar funcionalidades por clínica. A UI do sistema é *Config-Driven*: o menu e as rotas só devem renderizar os módulos (ex: Recepção, Estoque) que estão ativados no banco de dados para aquela clínica.

### PASSO 2: Infraestrutura Base da Clínica (Local Context)
- **Roteamento Contextual**: Configuração das rotas isoladas garantindo a persistência do `clinicId`.
- **IAM & Permissões**: Integração do controle de acesso (`db.checkPermission()`) para gerenciar as actions dentro de cada módulo.
- **App Shell Dinâmico**: O layout base que se reconstrói dependendo do contexto da clínica e de seus módulos habilitados.

### PASSO 3: Módulos de Domínio (FSD Estrito)
Após a base do PASSO 1 e PASSO 2 estar impenetrável, inicia-se o desenvolvimento dos módulos de negócio seguindo a anatomia de módulos 100% isolados:
- **Recepção & Pacientes**: Criação isolada usando `core/services` (ou serviços do domínio de pacientes, mas sem acoplar a UI).
- **Agenda Clínica**: Widgets independentes para calendário e alocação.
- **Prontuário e Atendimento**: Foco no médico, com suporte a templates e IA.
- **Estoque & Financeiro**: Módulos paralelos ativados conforme o plano SaaS.

## 9. CI/CD Pipeline & Cloudflare Pages Deployment

O deployment do IntraClinica (Frontend) deve ser automatizado, contínuo e integrado ao repositório GitHub para garantir que as mudanças na `main` sejam refletidas em um ambiente real (demo/homologação) em questão de minutos, com zero intervenção manual.

### 9.1. Arquitetura de Deploy (Cloudflare Pages)
Optamos por hospedar a aplicação compilada (arquivos estáticos e PWA) na infraestrutura de borda (Edge CDN) da Cloudflare. 
- **Por que Cloudflare Pages?** O Angular compila para HTML/JS/CSS puros (`npm run build`). Não precisamos de um servidor Node.js rodando SSR (Server-Side Rendering) no momento. A Cloudflare entrega esses arquivos estáticos de forma global, gratuita e absurdamente rápida.
- **Domínio Alvo:** O pipeline deve estar preparado para publicar no domínio oficial de demonstração (ex: `axio.eng.br` ou um subdomínio específico `demo.axio.eng.br`).

### 9.2. O Fluxo do GitHub Actions
O arquivo de workflow (`.github/workflows/deploy-cloudflare.yml`) deve seguir este roteiro mecânico:
1.  **Gatilho (Trigger):** Dispara em cada `push` ou `merge` direto na branch `main`.
2.  **Qualidade (Fail-Fast):** 
    - Instala dependências (`npm ci`).
    - Roda a verificação de tipagem estrita do TypeScript (`npx tsc --noEmit`). Se falhar, o deploy é abortado imediatamente.
    - Roda os testes unitários (`npm run test -- --watch=false --browsers=ChromeHeadless`).
3.  **Build (Compilação):** Executa `npm run build` na pasta `frontend-v2`.
4.  **Integração Documental (Opcional):** Copia os artefatos de documentação (`documentacao/`) para uma subpasta pública (ex: `/docs`) dentro de `dist/frontend-v2/browser/`, para que a documentação fique acessível via URL.
5.  **Publish (Cloudflare API):** Usa a action oficial `cloudflare/pages-action` para enviar a pasta `/dist/frontend-v2/browser/` para o projeto configurado na Cloudflare.
    - Exige os secrets: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_PROJECT_NAME`.

## 10. Histórico de Refatoração (V1 -> V2 -> Atual)
**Nota de Histórico:** O diretório original do repositório era `frontend/` (V1 legado). Posteriormente, uma refatoração massiva foi iniciada no diretório `frontend-v2/` para implementar o Angular 18+ com Tailwind, Signals e CDK, seguindo o padrão estrangulador descrito neste documento. Após a conclusão bem sucedida da refatoração e a estabilização da arquitetura (FSD + Headless UI + Signals), o repositório foi limpo: o `frontend/` legado foi movido para `archive/frontend-legacy/` e o diretório `frontend-v2/` assumiu o nome raiz `frontend/`. 

Todos os fluxos de trabalho (CI/CD) e comandos agora apontam diretamente para a pasta `frontend/`.