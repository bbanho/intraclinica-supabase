---
title: "ADR 001: Legacy Migration & Parallel Architecture"
description: "Documentation of the migration strategy from legacy frontend to Angular 18 Signals and the parallel development workflow."
---

# ADR 001: Legacy Migration & Parallel Architecture

## Status
Accepted

## Context
The project required a complete modernization of the legacy clinical management system (`/archive/frontend-legacy/`). The old architecture relied on traditional Angular modules, RxJS-heavy state management, and fragmented business logic spread across the frontend. Additionally, the need for rapid, large-scale development by multiple AI agents necessitated a workflow that could handle parallel contributions without constant merge conflicts.

## Decision Drivers
- **Maintainability**: Moving away from legacy `NgModule` to a more modular, tree-shakable structure.
- **Performance**: Leveraging Angular 18 Signals for fine-grained reactivity and reduced change detection overhead.
- **Scalability**: Supporting multi-tenant SaaS requirements with strict IAM and RLS.
- **AI Velocity**: Enabling multiple AI agents to work simultaneously on different features.
- **Atomic Reliability**: Ensuring database consistency for complex operations like inventory deductions during procedures.

## Considered Options

### 1. Incremental Migration (Hybrid)
- **Pros**: Lower risk, immediate value.
- **Cons**: High technical debt overhead, complexity in managing two different architectures (Modules vs. Standalone).

### 2. Full Rewrite with Standalone Components & Signals
- **Pros**: Clean slate, maximum performance, future-proof.
- **Cons**: Higher upfront time investment.

## Decision
We decided to pursue a **Full Rewrite Strategy** for all modules being moved from `archive/frontend-legacy/` to `frontend/`, adopting the following architectural pillars:

### 1. 100% Signal-Based Architecture
All state management is handled through Angular Signals (`signal`, `computed`, `effect`). 
- **No NgModules**: Every component is `standalone: true`.
- **Injection over Constructor**: Use the `inject()` function for all dependencies.
- **Reactive Stores**: Stores (in `core/store/`) act as Signal-based facades over Supabase services.

### 2. Massive Parallelization via Git Worktrees
To allow multiple AI agents (or developers) to work on isolated features without interfering with each other, we adopted **Git Worktrees**.
- Features are developed in dedicated branches and worktrees.
- Isolation is enforced: `features/reception/` cannot import from `features/inventory/`.
- Shared logic resides in `core/`, modified by only one agent at a time.

### 3. Shift to PostgreSQL RPC for Atomic Operations
Imperative business logic that was previously handled in the frontend (and prone to race conditions or partial failures) is moved to the database.
- **Example**: The `ProcedureRecipe` logic (deducting multiple stock items when a procedure is performed) is now a single RPC call `deduct_procedure_stock`.
- This ensures **Atomicity (ACID)** and reduces network overhead.

## Rationale
The combination of Signals and Standalone components provides the most modern and performant Angular experience. Moving logic to RPCs simplifies the frontend and guarantees data integrity. Git Worktrees solve the bottleneck of sequential AI development, drastically increasing project velocity.

## Consequences

### Positive
- **Zero Change Detection Issues**: Signals ensure only the necessary parts of the UI re-render.
- **Simplified Dependency Graph**: Standalone components make it clear what each part of the app needs.
- **Robust Business Logic**: Database-level atomicity prevents stock inconsistencies.
- **High Throughput**: Multiple features can be developed and reviewed in parallel.

### Negative
- **Learning Curve**: Requires a shift in mindset for developers used to RxJS and NgModules.
- **Initial Setup Overhead**: Managing worktrees and RPC migrations requires more backend coordination.

## References
- [Angular Signals Documentation](https://angular.dev/guide/signals)
- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree)
- [Supabase RPC Documentation](https://supabase.com/docs/guides/database/functions)
- (wiki-site/docs/raw-reports/legacy-frontend-actions.md)
