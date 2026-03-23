# Agent Instructions (AGENTS.md)

Welcome to the **IntraClinica** repository. This is an Angular 18+ multi-tenant SaaS application integrating with Supabase (PostgreSQL), utilizing Tailwind CSS for styling, and heavily incorporating AI (Gemini / WebLLM). 

As an autonomous coding agent operating in this repository, you **must** strictly adhere to the following rules, architecture patterns, and commands to maintain the integrity, security, and modernity of the codebase.

---

## 🛠️ Build, Lint, and Test Commands

All frontend operations must be executed inside the **`/frontend`** directory (formerly `/frontend-v2`). The legacy version is in `/archive/frontend-legacy/` and should be ignored.

### Development & Build
- **Start Dev Server:** `npm run dev` (Runs `ng serve` on `http://localhost:3000`)
- **Build Production:** `npm run build`
- **Type Checking:** `./node_modules/.bin/tsc --noEmit`
  > **CRITICAL:** You must run `tsc --noEmit` inside the `frontend/` folder and ensure exactly 0 errors before committing code.

### Testing
IntraClinica uses **Vitest** for unit testing and **Playwright** for E2E/UI audits.
- **Run all unit tests:** `npm run test`
- **Run a single test file:** `npm run test -- <filename>` or `npx vitest run path/to/file.spec.ts`

---

## 🏗️ Architectural Directives

### 1. Modern Angular 18+ Patterns (Strict)
- **Standalone Components:** All components must be standalone (`standalone: true`). Do not use `NgModule`.
- **Control Flow:** Strictly use the new Angular control flow (`@if`, `@for`, `@empty`, `@switch`). Never use legacy structural directives (`*ngIf`, `*ngFor`, `*ngSwitch`).
- **Dependency Injection:** Always use the `inject()` function for services and stores instead of constructor injection.
- **Signals:** The application is 100% Signal-based. 
  - Use `signal()`, `computed()`, and `effect()`. 
  - **Anti-pattern to avoid:** Never assign a signal's static value to a property in `ngOnInit` or the constructor (e.g., `this.items = this.store.items()`). This breaks reactivity. Instead, expose the signal itself or derive it via `computed()`.

### 2. Multi-Tenant Security & Context (Crucial)
IntraClinica is a multi-tenant SaaS. You must prevent cross-tenant data leaks at all costs. The database has strict Row Level Security (RLS) tied to the `app_user.iam_bindings` JSONB column.
- **Context Awareness:** Every feature component and service must be aware of the active clinic context.
- Always retrieve the active clinic ID via: `const clinicId = this.context.selectedClinicId();`
- **Data Filtering:** Never fetch, display, or mutate data without verifying and filtering by the `clinicId`. 
- **Global vs Local:** In localized features (like Inventory, Reception, Clinical), you must abort or show an empty state if `clinicId === 'all'` or `null`.
- **IAM:** The `app_user` table relies on an `iam_bindings` JSONB column. A static `type` column is no longer used for identifying if an actor is a doctor. Use `.contains('iam_bindings', { [clinicId]: ['roles/doctor'] })` when searching for doctors via Supabase.

### 3. Flat Database Schema & Atomic Operations
The `actor` abstraction table has been flattened and removed to improve performance and code simplicity.
- **`patient`** and **`app_user`** contain their own `name` columns. Do not nest properties (`patient.actor.name`).
- **Atomic Inserts:** Creating multiple records at once (e.g., a product and its initial stock) MUST be handled by PostgreSQL RPC functions (e.g., `create_product_with_stock`) to ensure atomicity. Do not use double `await this.supabase.insert()` operations in Angular services.

### 4. State Management
- **Services (`core/services/`):** Handle raw Supabase interactions, RPC calls, and third-party APIs.
- **Stores (`core/store/`):** Act as facades over services. They expose read-only `computed()` signals to components and provide asynchronous mutation wrappers (e.g., `PatientStore`, `InventoryStore`).
- Avoid component-level state when data needs to be shared across tabs or features.

### 5. Styling and UI (Headless)
- **Tailwind CSS + Angular CDK:** All styling must be done using Tailwind CSS utility classes. Avoid writing custom CSS. Build floating panels, dialogs, and dynamic UI pieces exclusively with `@angular/cdk` primitives. Do not add heavy component libraries.
- **Icons:** Use `lucide-angular`. Always ensure the icon is correctly imported and exposed in the component class as a `readonly` property before passing it to the template (`<lucide-icon [img]="IconName">`).

---

## 🤖 AI Features (WebLLM & Gemini)

### Local AI (`LocalAiService`)
- Uses WebGPU via `@mlc-ai/web-llm` and `@tensorflow/tfjs`.
- **Strict Rule:** TensorFlow and WebGPU imports *must* be dynamic inside the initialization functions (e.g., `await import('@tensorflow/tfjs')`). Top-level static imports of WebGPU/TF will execute at module-load time, breaking lazy-loading on devices without GPUs and crashing the application.

### Cloud AI (`GeminiService`)
- Uses Google GenAI SDK. 
- Ensure prompts are strongly typed and handle network/quota failures gracefully with fallback UI states.

---

## 📝 Git Workflow & PRs
- **Branching:** Create a new branch for every feature or fix (e.g., `feat/my-feature`, `fix/issue-description`, `refactor/tech-debt`).
- **Validation:** Run `tsc --noEmit -p tsconfig.app.json` inside `/frontend` before committing.
- **Commits:** Commit messages must follow Conventional Commits (e.g., `feat(reception): add new agenda calendar`).
- **Pull Requests:** Do not push directly to `main`. Structural or severe changes directly to `main` are strictly forbidden (only minor undocumented tweaks are allowed). Push branches and use `gh pr create` to submit Pull Requests so automated AI review bots can audit your code before merging.
- **Review:** Always address bot comments and reviews before executing `gh pr merge`.

---

## 📚 Wiki & Documentation Maintenance (MANDATORY)

IntraClinica maintains a strict "Docs as Code" policy. The legacy `documentacao/` directory is deprecated. The VitePress documentation portal (`wiki-site/`) is the single source of truth for all internal development, architectural, and support documentation.

1. **Wiki Skills**: When making architectural changes, modifying FSD structures, or implementing complex logic, you **MUST** use the `wiki-*` skills (e.g., `wiki-architect`, `wiki-page-writer`, `wiki-changelog`, `wiki-vitepress`) to update the documentation.
2. **Synchronous Updates**: Every PR that introduces a feature, architectural shift, or database change must contain the corresponding Markdown updates in `wiki-site/docs/`.
3. **No Undocumented Features**: Merging a structural PR without the accompanying wiki update is a violation of the repo rules. The wiki must reflect the codebase with 100% accuracy at all times.
4. **IAM-Restricted Access (Wiki & Docs)**: Access to internal documentation portals like `/wiki` must follow the IAM basic principle: **1. Role (Base Package) -> 2. Grants (Cherry-picked concessions) -> 3. Blocks**. For example, a route may be granted to `SUPER_ADMIN` globally, but also permitted to a common user if they possess a specific `iam_bindings` concession for viewing the wiki.

---

## 🚀 Parallel Development with Git Worktrees

For multi-feature development, use Git Worktrees on fast local storage (e.g., `/var/mnt/SATA/worktrees/`).

### Quick Start
```bash
# Create worktree (branch auto-created from current HEAD)
git worktree add /var/mnt/SATA/worktrees/wt-<feature> -b feat/<feature>

# Symlink node_modules (npm installed once in main repo)
rm -rf frontend/node_modules
ln -s /path/to/main-repo/frontend/node_modules frontend/node_modules

# Verify: tsc --noEmit should pass
```

### Critical Rules for Parallel Agents
1. **FSD isolation**: Features (`features/reception/`, `features/inventory/`, etc.) MUST NOT import each other
2. **node_modules**: Install packages ONCE only in the main repo, symlink everywhere else
3. **Core services**: `core/services/` can be read by all features but modified by only ONE agent at a time
4. **Commits per feature**: Each agent commits only to its feature path — ensures atomic PRs

### Review Workflow (MANDATORY before each merge)
1. Push branch: `git push -u origin feat/<feature>`
2. Create PR: `gh pr create --base main --head feat/<feature> ...`
3. Wait 2-3 min for Gemini Code Assist to post auto-comments
4. Agent reviews: reads Gemini comments, fixes CRITICAL/MEDIUM issues, commits, pushes
5. After fixes: verify PR is `mergeable` via `gh pr view <N> --json mergeable`
6. Merge: `gh pr merge <N> --squash`

**Never batch reviews** — each PR gets its own review cycle sequentially.
