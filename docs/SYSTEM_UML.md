# ⚙️ IntraClinica: Diagramas UML e Fluxos de Lógica

Este documento detalha o comportamento dos principais processos de negócio do sistema.

## 1. Fluxo de Baixa de Estoque Automática (`perform_procedure`)
Este diagrama de sequência mostra como o sistema garante a integridade do estoque ao registrar um ato médico.

```mermaid
sequenceDiagram
    participant Médico as Médico/Enfermeiro
    participant UI as ClinicalExecutionComponent
    participant RPC as perform_procedure (Supabase)
    participant DB as Postgres (inventory_item / movement)

    Médico->>UI: Finaliza Procedimento (ex: Sutura)
    UI->>RPC: Chama RPC com procedure_type_id
    Note over RPC: Início da Transação Atômica
    RPC->>DB: Busca receita (procedure_recipe)
    loop Para cada item na receita
        RPC->>DB: Registra rastro (inventory_movement)
        RPC->>DB: Deduz quantidade (inventory_item)
    end
    Note over RPC: Fim da Transação Atômica
    RPC-->>UI: Retorna ID do Procedimento
    UI-->>Médico: Exibe confirmação e logs de auditoria
```

## 2. Máquina de Estados de Agendamento
Regras de transição para o status das consultas.

```mermaid
stateDiagram-v2
    [*] --> Agendado
    Agendado --> Aguardando: Check-in na recepção
    Aguardando --> Chamado: Alerta no painel
    Chamado --> Em_Atendimento: Início da consulta
    Em_Atendimento --> Realizado: Finalização/Receituário
    
    Agendado --> Cancelado
    Aguardando --> Cancelado
    Chamado --> Cancelado
    Em_Atendimento --> Cancelado
    
    Realizado --> [*]
    Cancelado --> [*]
```

---
*Visualização técnica gerada pela arquitetura Axio Nexus v3.* 🧪🏥
