---
title: "Changelog"
description: "Summary of recent architectural and feature developments for IntraClinica."
---

# 🆕 Changelog

## [2026-03-23] — Legacy Migration & Parallel Architecture

### 🏗️ Architecture Improvements
- **Legacy Migration Strategy (ADR 001):** Formally documented the move from `/archive/frontend-legacy/` to a 100% Signal-based Angular 18 architecture in `frontend/`.
- **Parallel Development Workflow:** Established the use of **Git Worktrees** to enable multiple AI agents to work concurrently on isolated features.
- **Atomic Operations Shift:** Refactored complex imperative frontend logic (e.g., Procedure Recipe stock deduction) into atomic PostgreSQL RPC functions (`deduct_procedure_stock`) to ensure data consistency.

### ⚛️ Frontend (Angular 18)
- **Standalone Components:** All new components are `standalone: true`.
- **Signal-Based Reactivity:** Switched all state management and view logic to use `signal()`, `computed()`, and `effect()`, eliminating `NgModule` and legacy structural directives (`@if`, `@for` over `*ngIf`, `*ngFor`).
- **Core Stores:** Implemented Signal-based stores in `core/store/` as reactive facades over Supabase services.

### 🛡️ Security & Multi-Tenancy
- **IAM-Based RLS:** Enforced strict multi-tenant isolation using `app_user.iam_bindings` JSONB column mapped to Supabase Row Level Security (RLS).
- **Context-Aware Services:** All feature services now retrieve the active clinic ID via `this.context.selectedClinicId()` before performing any database operations.

### 📚 Documentation (Wiki-Site)
- **ADR 001 Created:** Documented the legacy migration strategy and parallel architecture.
- **Technical Blueprints:** Updated core documentation to reflect the new Signals and Standalone component standards.
- **Onboarding Guides:** Synchronized onboarding docs with the current architecture for better "cold boot" recovery of AI agents.
