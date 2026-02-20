# ⚙️ Documentação Técnica: Intel Core & Persistência

Esta seção detalha o "motor" do **IntraClinica**, focado em soberania de dados, integridade transacional e integração com a memória **Axio**.

---

## 1. Arquitetura de Dados (Backend)
O backend utiliza **Supabase (PostgreSQL 16)** como fonte da verdade.

### **Multi-Tenancy (Isolamento de Clínicas)**
Cada dado no sistema possui um vínculo obrigatório com uma `clinic_id`. O isolamento é garantido via **RLS (Row Level Security)**:
*   Um usuário autenticado só pode ler/escrever dados onde o `clinic_id` do registro coincide com o `clinic_id` do seu perfil (`profiles`).
*   **Vantagem:** Segurança de nível bancário contra vazamentos transversais de dados.

### **Schema Consolidado (v3)**
As migrations foram unificadas para garantir a ordem de dependência:
1.  `clinics` (Tenants)
2.  `profiles` (Identidade)
3.  `inventory_item` (Ativos)
4.  `procedure_type` (Serviços)
5.  `procedure_recipe` (Lógica de consumo)
6.  `appointments` (Agendamentos)

---

## 2. Lógica de Agendamento (Appointments)
Implementamos uma máquina de estados finitos para o status das consultas:
*   **Fluxo Válido:** `Agendado` → `Aguardando` → `Chamado` → `Em Atendimento` → `Realizado`.
*   **Regras de Negócio:**
    *   Não é permitido pular estados (ex: `Agendado` direto para `Realizado`).
    *   O status `Cancelado` é acessível a partir de qualquer estado, exceto `Realizado`.
    *   A lógica reside no `DatabaseService` (método `transitionAppointmentStatus`).

---

## 3. Integração Axio Nexus v3
O código-fonte do IntraClinica é minerado em tempo real pelo **Axio Coordinator**.
*   **Fragmentação:** Arquivos grandes (como o `database.service.ts`) são quebrados em chunks cronológicos no Tier 1 do Axio.
*   **Síntese de Essência:** O Mistral gera essências de Tier 2 para cada serviço Angular, permitindo que a IA assistente (Axi) entenda a intenção por trás do código, não apenas a sintaxe.

---

## 4. Stack Tecnológica
*   **Frontend:** Angular 17+ (Signals, Standalone Components).
*   **Backend:** Supabase (Auth, DB, Realtime).
*   **Auditoria:** PL/pgSQL (Functions e Triggers nativos para baixa de estoque).

---
*Atualizado em 2026-02-19 por AxiomaticDelirium.* 🧪🏥
