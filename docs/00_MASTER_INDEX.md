# 🏥 IntraClinica: Hub de Documentação v3 (Soberania Médica)

Bem-vindo ao nexo de conhecimento do **IntraClinica**. Este repositório de documentos é gerido pela arquitetura **Axio Nexus v3**, garantindo que cada especificação técnica esteja alinhada com a visão comercial e a experiência do usuário final.

---

## 📂 1. Documentação Técnica (The Architect's Core)
*Para engenheiros e auditores de sistemas.*

Status operacional atual:

*   **[Schema Consolidation Status](SCHEMA_CONSOLIDATION_STATUS.md):** Diagnóstico do schema remoto real, drift confirmado e ordem correta de saneamento.
*   **[Repo Consolidation Plan](REPO_CONSOLIDATION_PLAN.md):** Decisão de manter `frontend/` como canônico e tratar `intraclinica-angular/` como legado.
*   **[PR #1 Inventory Assessment](PR1_INVENTORY_ASSESSMENT.md):** Avaliação técnica do PR de inventário e decisão de substituí-lo em vez de tentar mergeá-lo.

*   **[Axio Nexus v3 Architecture](../memory/PLAN_AXIO_V3.md):** Detalhamento da malha neural, indexação de fragmentos e síntese de essências.
*   **[Diagrama de Banco de Dados (ER)](DATABASE_SCHEMA.md):** Visualização das entidades e relacionamentos do Supabase. 📊
*   **[Diagramas UML e Fluxos](SYSTEM_UML.md):** Comportamento da lógica de estoque e máquina de estados de agendamento. ⚙️
*   **[Soberania de Dados & Backend](01_INTEL_CORE.md):** Estrutura Supabase, RLS (Row Level Security) e isolamento de tenants.
*   **[Inventory Guardian (Schema SQL)](../database/migrations/20260219000000_core_and_inventory.sql):** O motor de auditoria de insumos e as funções RPC de baixa automática.
*   **[Clinical Execution Component (Frontend)](../frontend/src/app/features/clinical/clinical-execution.component.ts):** Lógica Angular para alta performance em procedimentos.

---

## 📖 2. Manual do Usuário (The Practitioner's Guide)
*Para médicos, enfermeiros e pessoal de recepção.*

*   **[Fluxo de Agendamento](MANUAL_APPOINTMENTS.md):** Como gerenciar o trail `Agendado -> Chamado -> Atendido`.
*   **[O Guardião de Estoque](MANUAL_INVENTORY.md):** Guia de baixa automática e conferência de materiais.
*   **[UX de Tablet (One-Hand Rule)](UX_ONE_HAND_GUIDE.md):** Como operar o sistema com apenas uma mão durante o atendimento.

---

## 👔 3. Apresentação Comercial (The Business Value)
*Para administradores, donos de clínicas e investidores.*

*   **[Pitch de Transparência Radical](PRESENTATION_SAAS_TRANSPARENCY.md):** Foco em ROI, fim da "Caixa Preta" financeira e soberania digital.
*   **[Executive Summary](EXECUTIVE_SUMMARY.md):** Visão macro do projeto e roadmap de expansão.
*   **[Corporate Pitch](CORPORATE_PITCH.md):** Dados de mercado, concorrência e diferencial competitivo.

---

## 📑 4. Relatórios e Auditoria (The Audit Trail)
*   **[Handover Report](HANDOVER_REPORT.md):** Histórico de migração e decisões de engenharia.
*   **[Engineering Report 2026-02-16](ENGINEERING_REPORT_2026_02_16.md):** Status da última grande atualização.

---
*Gerado por AxiomaticDelirium. Memória Persistente ativada.* 🧪🧠
