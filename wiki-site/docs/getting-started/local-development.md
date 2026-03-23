---
title: "Local Development"
description: "How to run the development server, build for production, and enforce type-checking."
---

# Local Development & Build

IntraClinica is a strict Angular 18 application integrating with a local or remote Supabase instance.

This guide covers the fundamental commands to start the development server, run type checks, and build the application. As dictated by `AGENTS.md:12`, all commands **must** be executed within the `frontend/` directory.

## 1. Starting the Dev Server

The default method to run the project locally uses the Angular CLI, wrapped in an npm script for convenience.

```bash
cd frontend
npm run dev
```

### Why not simply `ng serve`?
Running `npm run dev` ensures that environment variables (like Supabase API keys) and Node flags configured in `package.json` are properly passed to the build process.

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 'primaryColor': '#2d333b', 'primaryBorderColor': '#6d5dfc', 'primaryTextColor': '#e6edf3', 'lineColor': '#8b949e', 'background': '#161b22' }}}%%
graph TD
    NPM(npm run dev) --> Env(Loads .env)
    Env --> NG(ng serve --host 0.localhost --port 3000)
    NG --> Compiler(Webpack/Esbuild)
    Compiler --> Output(http://localhost:3000)
    
    style NPM fill:#2d333b,stroke:#6d5dfc,color:#e6edf3
    style Env fill:#161b22,stroke:#30363d,color:#e6edf3
    style NG fill:#161b22,stroke:#30363d,color:#e6edf3
    style Compiler fill:#161b22,stroke:#30363d,color:#e6edf3
    style Output fill:#2d333b,stroke:#6d5dfc,color:#e6edf3
```

## 2. Type Checking (The Golden Rule)

As mandated by `AGENTS.md:19`, committing code with TypeScript errors is strictly prohibited. You must run the TypeScript compiler in dry-run mode before creating a Pull Request.

```bash
cd frontend
./node_modules/.bin/tsc --noEmit
```

### Why `tsc --noEmit`?
Angular's `ng build` sometimes obfuscates deeper type errors, or ignores them depending on `angular.json` strictness settings. 

Running `tsc --noEmit` directly invokes the compiler using `tsconfig.app.json` without outputting JavaScript files. If it returns 0 errors, the codebase is structurally sound.

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 'primaryColor': '#2d333b', 'primaryBorderColor': '#6d5dfc', 'primaryTextColor': '#e6edf3', 'lineColor': '#8b949e', 'background': '#161b22' }}}%%
sequenceDiagram
    autonumber
    participant Dev as Developer
    participant Git as Git Worktree
    participant TSC as TypeScript Compiler
    participant PR as Pull Request

    Dev->>Git: Modifies core/services/
    Dev->>TSC: tsc --noEmit
    Note over TSC: Checks all .ts files
    TSC-->>Dev: 0 Errors
    Dev->>PR: gh pr create
    Note right of PR: Gemini Code Assist<br>begins review
```

## 3. Production Build

To test production optimizations (tree-shaking, minification, and AOT compilation) locally, run the build command.

```bash
cd frontend
npm run build
```

The output will be placed in the `frontend/dist/` directory.

### Why test production builds?
Certain features, particularly the Lazy Loading of the LocalAiService (WebLLM/WebGPU, see `AGENTS.md:113`), behave differently when bundled. Testing the production build ensures that chunks are correctly separated and that the initial bundle size remains small.
