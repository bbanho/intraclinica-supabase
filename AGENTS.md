# Agent Instructions (AGENTS.md)

Welcome to the **IntraClinica** repository. This is an Angular 17+ multi-tenant SaaS application integrating with Supabase (PostgreSQL), utilizing Tailwind CSS for styling, and heavily incorporating AI (Gemini / WebLLM). 

As an autonomous coding agent operating in this repository, you **must** strictly adhere to the following rules, architecture patterns, and commands to maintain the integrity, security, and modernity of the codebase.

---

## 🛠️ Build, Lint, and Test Commands

All frontend operations must be executed inside the `/frontend` directory.

### Development & Build
- **Start Dev Server:** `npm run dev` (Runs `ng serve` on `http://localhost:3000`)
- **Build Production:** `npm run build`
- **Type Checking:** `./node_modules/.bin/tsc --noEmit`
  > **CRITICAL:** You must run `tsc --noEmit` and ensure there are exactly 0 errors before committing any code.

### Testing
IntraClinica uses **Vitest** for unit testing and **Playwright** for E2E/UI audits.

- **Run all unit tests:** `npm run test`
- **Run a single test file:** `npm run test -- <filename>` or `npx vitest run path/to/file.spec.ts`
- **Watch mode (single file):** `npx vitest watch path/to/file.spec.ts`
- **E2E / UI Audits:** 
  To run visual UI audits, use the local Playwright skill script mapped for this project:
  ```bash
  node /var/home/bruno/.agents/skills/playwright-skill/run.js /tmp/playwright-intraclinica-audit.js
  ```

---

## 🏗️ Architectural Directives

### 1. Modern Angular 17+ Patterns
- **Standalone Components:** All components must be standalone (`standalone: true`). Do not use `NgModule`.
- **Control Flow:** Strictly use the new Angular control flow (`@if`, `@for`, `@empty`, `@switch`). Never use legacy structural directives (`*ngIf`, `*ngFor`, `*ngSwitch`).
- **Dependency Injection:** Always use the `inject()` function for services and stores instead of constructor injection.
- **Signals:** The application is 100% Signal-based. 
  - Use `signal()`, `computed()`, and `effect()`. 
  - **Anti-pattern to avoid:** Never assign a signal's static value to a property in `ngOnInit` or the constructor (e.g., `this.items = this.store.items()`). This breaks reactivity. Instead, expose the signal itself or derive it via `computed()`.

### 2. Multi-Tenant Security & Context (Crucial)
IntraClinica is a multi-tenant SaaS. You must prevent cross-tenant data leaks at all costs.
- **Context Awareness:** Every feature component and service must be aware of the active clinic context.
- Always retrieve the active clinic ID via: `const clinicId = this.db.selectedContextClinic();`
- **Data Filtering:** Never fetch, display, or mutate data without verifying and filtering by the `clinicId`. 
- **Global vs Local:** If the user is a `SUPER_ADMIN`, `clinicId` might be `'all'`. In localized features (like Inventory, Reception, Clinical), you must abort or show an empty state if `clinicId === 'all'` or `null`.
- **IAM:** Use `db.checkPermission('permission.key', clinicId)` to gate UI elements and routes. Never hardcode role checks (`role === 'ADMIN'`) when a permission key exists.

### 3. State Management
- **Services (`core/services/`):** Handle raw Supabase interactions, RPC calls, and third-party APIs.
- **Stores (`core/store/`):** Act as facades over services. They expose read-only `computed()` signals to components and provide asynchronous mutation wrappers (e.g., `PatientStore`, `InventoryStore`).
- Avoid component-level state when data needs to be shared across tabs or features.

### 4. Styling and UI
- **Tailwind CSS:** All styling must be done using Tailwind CSS utility classes. Avoid writing custom CSS in the `@Component` styles array unless absolutely necessary (e.g., custom scrollbars or specific keyframe animations).
- **Icons:** Use `lucide-angular`. Always ensure the icon is correctly imported and exposed in the component class as a `readonly` property before passing it to the template (`<lucide-icon [img]="IconName">`).

---

## ✍️ Code Style & Conventions

### Imports & File Structure
- **Order:** Angular core imports first, followed by third-party libraries, then local core/services, and finally models/types.
- **Component Size:** Favor inline templates and styles for smaller components to keep logic and UI tightly coupled. For larger components or distinct tabs (e.g., a complex Calendar view), extract them into smaller child components rather than creating massive 1000+ line files.

### Naming Conventions
- **Components:** PascalCase (e.g., `AgendaCalendarComponent`) and kebab-case for filenames (`agenda-calendar.component.ts`).
- **Signals:** CamelCase (e.g., `patients`, `isLoading`). Do not use Hungarian notation or `$` suffixes for Signals (reserve `$` strictly for RxJS Observables, though RxJS should be avoided in favor of Signals).
- **Interfaces/Types:** PascalCase (e.g., `ProcedureType`, `UserProfile`).

### Types and Error Handling
- **No `any`:** Avoid casting `as any`. Always use strict typing. If a type is missing, define it in `core/models/types.ts` or the relevant domain type file.
- **Async/Await:** Prefer `async/await` over Promise chaining (`.then().catch()`).
- **Try/Catch:** Wrap all Supabase/API calls and mutations in `try/catch` blocks.
- **User Feedback:** Never use native browser `alert()` for production code. If a Toast/Snackbar service isn't available, add a `// TODO: Replace alert with Toast component` comment if you must use a fallback. 
- **Loading States:** Always handle loading states (e.g., `isLoading.set(true/false)`) to visually indicate progress and disable submit buttons during mutations to prevent double-clicks.

---

## 🤖 AI Features (WebLLM & Gemini)

### Local AI (`LocalAiService`)
- Uses WebGPU via `@mlc-ai/web-llm` and `@tensorflow/tfjs`.
- **Strict Rule:** TensorFlow and WebGPU imports *must* be dynamic inside the initialization functions (e.g., `await import('@tensorflow/tfjs')`). Top-level static imports of WebGPU/TF will execute at module-load time, breaking lazy-loading on devices without GPUs and crashing the application via wildcard route redirects.

### Cloud AI (`GeminiService`)
- Uses Google GenAI SDK. 
- Ensure prompts are strongly typed and handle network/quota failures gracefully with fallback UI states.

---

## 📝 Git Workflow & PRs
- **Branching:** Create a new branch for every feature or fix (e.g., `feat/my-feature`, `fix/issue-description`, `refactor/tech-debt`).
- **Validation:** Run `tsc --noEmit` before committing.
- **Commits:** Commit messages must follow Conventional Commits (e.g., `feat(reception): add new agenda calendar`).
- **Pull Requests:** Do not push directly to `main`. Push branches and use `gh pr create` to submit Pull Requests so automated AI review bots (like Gemini Code Assist) can audit your code before merging.
- **Review:** Always address bot comments and reviews before executing `gh pr merge`.
