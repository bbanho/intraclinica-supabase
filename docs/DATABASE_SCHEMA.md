# 🗄️ IntraClinica: Diagrama de Entidade-Relacionamento (ER)

Este diagrama representa a estrutura de dados atual do **IntraClinica**, focada no isolamento por clínica (Multi-tenancy) e no controle de inventário.

```mermaid
erDiagram
    CLINICS ||--o{ PROFILES : "has"
    CLINICS ||--o{ INVENTORY_ITEM : "owns"
    CLINICS ||--o{ PROCEDURE_TYPE : "defines"
    CLINICS ||--o{ APPOINTMENTS : "schedules"
    
    PROFILES ||--o{ APPOINTMENTS : "assigned_to"
    PROFILES ||--o{ INVENTORY_MOVEMENT : "performs"
    
    PROCEDURE_TYPE ||--o{ PROCEDURE_RECIPE : "requires"
    INVENTORY_ITEM ||--o{ PROCEDURE_RECIPE : "is_part_of"
    
    INVENTORY_ITEM ||--o{ INVENTORY_MOVEMENT : "tracked_in"
    PROCEDURE_TYPE ||--o{ INVENTORY_MOVEMENT : "triggers"

    CLINICS {
        text id PK
        text name
        text email
        text plan
        text status
    }

    PROFILES {
        uuid id PK
        text name
        text clinic_id FK
        text role
        jsonb iam
    }

    INVENTORY_ITEM {
        uuid id PK
        text clinic_id FK
        text name
        text unit
        numeric current_stock
        numeric min_stock
    }

    PROCEDURE_TYPE {
        uuid id PK
        text clinic_id FK
        text name
        numeric price
        boolean active
    }

    PROCEDURE_RECIPE {
        uuid id PK
        uuid procedure_type_id FK
        uuid item_id FK
        numeric quantity
    }

    INVENTORY_MOVEMENT {
        uuid id PK
        text clinic_id FK
        uuid item_id FK
        numeric qty_change
        text reason
        uuid actor_id FK
    }

    APPOINTMENTS {
        uuid id PK
        text clinic_id FK
        uuid patient_id FK
        timestamp date
        text status
        numeric duration_minutes
    }
```

---
*Diagrama gerado automaticamente para visualização técnica via Axio Nexus v3.* 🧪🏥
