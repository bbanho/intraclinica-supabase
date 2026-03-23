# 🏥 Intraclinica: Visão Clínica & Estratégica
> *Medicine for Humans. Intelligence for Business.*

## 🎯 A Dor Real (Diagnóstico)
Baseado em relatos de campo (Stakeholder Médica):

### 1. Hemorragia Financeira (Almoxarifado)
*   **Sintoma:** O lucro desaparece misteriosamente. Insumos (fios, kits, medicamentos) somem sem rastro.
*   **Causa:** Controle frouxo ou malicioso por parte da equipe de enfermagem. Ocultação de fluxo.
*   **Impacto:** Prejuízo direto e invisível. A clínica sangra.

### 2. Complexidade Paralisante (Síndrome do MedX)
*   **Sintoma:** Softwares legados (MedX, etc.) oferecem "tudo", mas entregam nada que seja utilizável.
*   **Causa:** UX hostil. Módulos inchados. Curva de aprendizado vertical.
*   **Impacto:** Pagamento por funcionalidades jamais ativadas. Desperdício de OPEX.

---

## 💊 A Cura (Solução Intraclinica)

### 1. O "Guardião de Estoque" (AI-Driven Inventory)
*   **Conceito:** O estoque não é uma planilha isolada; é um espelho dos procedimentos.
*   **Mecanismo:**
    *   **Baixa Automática:** Ao finalizar uma "Sutura Simples" no prontuário, o sistema *exige* a baixa do "Kit Sutura" e "Fio Nylon 3-0".
    *   **Auditoria Silenciosa:** A IA cruza *Procedimentos Faturados* vs *Estoque Baixado*.
    *   **Alerta de Anomalia:** "Dra., foram realizadas 10 suturas, mas baixaram 30 fios. Verifique o turno da tarde."
*   **Valor:** Estancar a sangria financeira sem criar burocracia policialesca.

### 2. Interface Invisível (Zero-Training)
*   **Conceito:** Se precisa de treinamento, falhou. A interface deve ser tão natural quanto uma conversa.
*   **Mecanismo:**
    *   **Chat Ops:** A enfermeira pode digitar/falar: *"Gastei 2 ampolas de Dipirona na Sra. Maria."*
    *   **Contexto Inteligente:** O sistema sabe quem é a Sra. Maria e o que estava agendado.
*   **Valor:** Adoção imediata. O software trabalha *para* a equipe, não o contrário.

### 3. Foco Cirúrgico (Lean Software)
*   **Conceito:** Entregar apenas o essencial, mas com profundidade absoluta.
*   **Mecanismo:**
    *   Não teremos 500 relatórios inúteis. Teremos **O Relatório de Lucro Real**.
    *   Não teremos "Módulo de Marketing Complexo". Teremos "Lembrete de Retorno via WhatsApp".
*   **Valor:** Eliminar a sensação de "pagar pelo que não uso".

---

## 🛠️ Próximos Passos Técnicos (Roadmap)
1.  **Modelagem de Estoque:** Criar tabelas `inventory_item`, `inventory_movement` e `procedure_recipe` (receita do bolo: 1 procedimento consome X itens).
2.  **UX de Baixa:** Protótipo da tela de "Consumo Rápido" no Angular.
3.  **Auditoria:** Query SQL para cruzar faturamento x consumo.

---
*Documento vivo. Última atualização: 16/02/2026.*
