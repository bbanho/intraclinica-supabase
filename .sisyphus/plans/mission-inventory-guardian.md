# 🛡️ Missão: Operation Stop the Bleeding (Inventory Guardian)
> *Transformar o Almoxarifado em um cofre inviolável.*

## 🎯 Objetivo
Implementar o sistema de **Auditoria de Estoque Baseada em Procedimentos**.
O sistema deve baixar automaticamente os insumos quando um procedimento médico é registrado, eliminando o "esquecimento" ou desvio de materiais.

---

## 📋 Plano de Execução (Step-by-Step)

### 1. 🏗️ Modelagem de Dados (Supabase SQL)
Criar a fundação do estoque inteligente.
*   **Tabela `inventory_item`:** O catálogo de insumos (Fio, Gaze, Dipirona).
    *   Campos: `id`, `name`, `unit` (un/ml/g), `current_stock`, `min_stock`, `cost_price`.
*   **Tabela `procedure_type`:** O catálogo de serviços cobráveis (Sutura, Consulta, Curativo).
    *   Campos: `id`, `name`, `price`.
*   **Tabela `procedure_recipe` (O Segredo):** A receita do bolo.
    *   Campos: `procedure_id`, `item_id`, `quantity`.
    *   *Ex: 1 "Sutura" consome 1 "Fio Nylon" + 2 "Gaze".*
*   **Tabela `inventory_movement`:** O rastro inauditável.
    *   Campos: `id`, `item_id`, `qty_change` (+/-), `reason` (PURCHASE, PROCEDURE, CORRECTION), `related_procedure_id`.

### 2. 🧠 Lógica de Negócio (Backend RPC)
Criar a função atômica que garante a integridade.
*   **RPC `register_clinical_procedure`:**
    *   Recebe: `patient_id`, `procedure_type_id`, `professional_id`.
    *   Ação 1: Cria o registro clínico (faturamento).
    *   Ação 2: Lê a `procedure_recipe`.
    *   Ação 3: Deduz o estoque de cada item da receita.
    *   Ação 4: Registra os movimentos em `inventory_movement` com a flag `AUTOMATIC_DEDUCTION`.

### 3. 🖥️ Frontend (Angular)
Interface para configurar a "Inteligência".
*   **Tela `InventoryComponent`:**
    *   Listagem de itens e ajuste manual (entrada de nota fiscal).
*   **Tela `ProcedureRecipeComponent`:**
    *   Configuração do "Combo": Selecionar Procedimento -> Adicionar Itens consumidos.

---

## 🚀 Próximo Passo Imediato ✅
- [x] Gerar a **Migration SQL** (`20260219000000_inventory_guardian.sql`) com as tabelas acima.

**Status:** Migração gerada. Aguardando execução no Supabase.
