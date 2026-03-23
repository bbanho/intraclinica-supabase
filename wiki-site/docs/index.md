---
layout: home
hero:
  name: "IntraClinica Wiki"
  text: "Documentation Portal"
  tagline: "Angular 18, Supabase RLS, and 100% Signals Architecture."
  actions:
    - theme: brand
      text: "Onboarding (Zero-to-Hero)"
      link: "/onboarding/zero-to-hero"
    - theme: alt
      text: "Technical Deep-Dive"
      link: "/raw-reports/exhaustive-deep-dive"
features:
  - title: 🔒 Multi-Tenant RLS
    details: Supabase Row Level Security mapped to app_user.iam_bindings via JSONB.
  - title: ⚛️ 100% Signal-Based
    details: Zero RxJS subjects. Fully reactive state management using computed() and effect().
  - title: 🤖 Local & Cloud AI
    details: WebGPU WebLLM for private inferences, Gemini Cloud as a fallback.
---

## 🏗️ Core Documentation

Access the technical blueprints and reference guides for the IntraClinica platform.

- **[Exhaustive Deep-Dive](/raw-reports/exhaustive-deep-dive)** — The comprehensive technical reference and architectural audit.
- **[IAM & Security Model](/core-architecture/iam-security-model)** — Details on multi-tenant isolation, `iam_bindings`, and RLS.
- **[Database Schema](/core-architecture/database)** — Tables, RPC functions, and migration strategies.
- **[Zero-to-Hero Onboarding](/onboarding/zero-to-hero)** — Quick start guide for new contributors and environment setup.

::: info Deployment
This wiki is automatically deployed via GitHub Actions to Cloudflare Pages on merge to main.
:::
