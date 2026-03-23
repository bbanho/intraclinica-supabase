---
title: Relatório Cru - Ações de Banco de Dados e RLS
description: Regras implícitas e funções RPC extraídas das migrations SQL (22/Mar).
---

# Relatório Cru: Ações do Banco e RLS

*Este relatório mapeia as operações atômicas da base de dados e suas restrições de isolamento por tenant, essenciais para o novo motor IAM.*

## ⚡ Database-Level Atomic Operations (RPCs & Triggers)

**Remote Procedure Calls (RPCs)**
*   `create_product_with_stock(p_clinic_id, p_name, p_category, p_price, p_cost, p_min_stock, p_current_stock, p_barcode)`: Cria produto atomicamente e insere `INITIAL_STOCK` 'IN'.
*   `perform_procedure(p_clinic_id, p_patient_id, p_professional_id, p_procedure_type_id, ...)`: Itera pela `procedure_recipe` e insere `OUT` stock transactions de ingredientes consumidos.
*   `add_appointment(...)`: Criação server-side de consulta que desnormaliza `patient_name` para evitar frontend spoofing.
*   `add_stock_movement(...)`: Inserção server-side de movimentação de estoque.
*   `create_medical_record(p_clinic_id, p_patient_id, p_doctor_id, p_content, p_type)`: Insere JSONB com strict null checks e validação `has_clinic_access`. Somente para papel autenticado.
*   `get_clinic_ui_config(p_clinic_id)`: Fetches active modules e configs do tenant num único JSONB.

**Automated Triggers**
*   `trg_stock_transaction_sync`: Regra de Ouro: Nunca atualizar `product.current_stock` direto. Inserções em `stock_transaction` dão trigger de inc/dec no saldo do produto.
*   `trg_appointment_conflict_check`: Impede "double-booking" com constraint de exclusão (`tstzrange`) para checar se o médico já não está bloqueado naquele intervalo.

## 🔐 Implicit Business Rules & RLS Policies

**1. Strict Tenant Isolation (Multi-tenant Security)**
*   Todas as tabelas de negócio utilizam RLS atrelado à `clinic_id`.
*   Acesso é verificado dinamicamente via `has_clinic_access()`, lendo a coluna `app_user.iam_bindings`.

**2. Vertical Privilege Segregation (IAM)**
*   Usuário pode ser *Recepcionista* na Clínica A e *Médico* na Clínica B.
*   `clinical_record` tem barreira estrita: frontend usa `has_clinic_role(clinic_id, 'roles/doctor')` na RLS (O novo motor unificará em `has_permission`).

**3. Flattened Data Boundaries**
*   Sem tabela `actor`. Identidades desnormalizadas ( `patient.name` e `app_user.name` diretos) aceleram consultas isolando-as de joins desnecessários.
