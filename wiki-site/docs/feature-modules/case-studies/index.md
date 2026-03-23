---
title: "Case Studies"
description: "Critical operational scenarios demonstrating NEXUS AI and multi-tenant governance"
---

# Case Studies

Operational scenarios that demonstrate how IntraClinica's NEXUS AI engine and Config-Driven UI solve critical clinic management problems.

## 📋 Available Case Studies

| # | Title | Module | Key Pattern |
|:---:|:---|:---|:---|
| 01 | [No-Show Prevention](./no-show-case) | Reception | AI-powered waitlist auto-filling |
| 02 | [Inventory Rupture](./inventory-rupture-case) | Inventory | Predictive stock + FIFO deduction |
| 03 | [AI Medical Records](./clinical-ai-case) | Clinical | SOAP voice-to-record transformation |
| 04 | [Medical Marketing](./marketing-ai-case) | Social | AI content + hashtag generation |
| 05 | [SaaS Governance](./saas-governance-case) | Admin | Config-Driven UI + Multi-Tenant RLS |

## 🎯 Common Patterns

These cases demonstrate core IntraClinica architectural principles:

- **Proactive Intelligence:** The system predicts problems before they occur (stock rupture, no-shows)
- **Atomic Operations:** Complex multi-step operations (product + stock creation) happen in a single RPC
- **Reactive UI:** Interface changes in milliseconds via Angular Signals without page reloads
- **Multi-Tenant Security:** Data isolation enforced at the RLS level, impossible to leak between clinics

## 🔗 Cross-References

- [IAM Security Model](../core-architecture/iam-security-model) — Roles, grants, blocks hierarchy
- [Core Services](../core-architecture/services) — Signal-based service architecture
- [Database Schema](../core-architecture/database) — ER diagrams and table relationships
