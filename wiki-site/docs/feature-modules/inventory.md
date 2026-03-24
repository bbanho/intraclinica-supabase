---
title: Inventory Module
description: Product stock management, warehouse transfers, and dispense workflows in IntraClinica.
---

# Inventory Module

The Inventory module (`features/inventory/`) handles products, stock levels, warehouse transfers, and dispense operations tied to clinical prescriptions. It ensures that clinics maintain optimal supply levels while providing a full audit trail of movements.

## IAM Permissions

Access to inventory data and operations is controlled by three distinct permission tiers in the `iam_bindings` configuration.

| Permission | Description | Access Level |
|------------|-------------|--------------|
| `inventory.read` | View product catalog, current stock levels, and basic metadata. | Basic Staff |
| `inventory.write` | Add/deduct stock, create new products, and edit basic product info. | Stock Clerks / Admins |
| `inventory.view_cost` | View sensitive cost price and supplier data. | Managers / Owners |

> [!IMPORTANT]
> The `inventory.view_cost` permission is required to see the `avg_cost_price` and total stock value in the dashboard (frontend/src/app/features/inventory/inventory.component.ts:103).

## Data Model

### `product`

Master catalog of available products/medications.

```sql
product {
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid()
  clinic_id        uuid REFERENCES clinic(id)  -- NULL = multi-clinic catalog
  name             text NOT NULL
  sku              text UNIQUE
  barcode          text
  category         text  -- e.g., 'medication', 'supply', 'equipment'
  unit             text  -- e.g., 'tablet', 'ml', 'box'
  price            numeric(10,2) DEFAULT 0
  avg_cost_price   numeric(10,2) DEFAULT 0
  created_at       timestamptz DEFAULT now()
}
```

### `inventory_stock`

Current stock level per product per clinic warehouse.

```sql
inventory_stock {
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid()
  clinic_id      uuid NOT NULL REFERENCES clinic(id)
  warehouse_id   uuid REFERENCES warehouse(id)
  product_id     uuid NOT NULL REFERENCES product(id)
  quantity       integer NOT NULL DEFAULT 0
  min_quantity   integer DEFAULT 0       -- low-stock alert threshold
  updated_at     timestamptz DEFAULT now()
  UNIQUE(clinic_id, warehouse_id, product_id)
}
```

## Atomic Operations (RPC)

Stock updates must always be atomic to prevent race conditions. IntraClinica uses PostgreSQL RPC functions for all critical movements.

### Product Creation

The `create_product_with_stock` RPC handles the simultaneous creation of a product catalog entry and its initial stock level in a single transaction.

```sql
-- Implementation in frontend/src/app/core/services/inventory.service.ts:58
CREATE OR REPLACE FUNCTION create_product_with_stock(
  p_clinic_id     UUID,
  p_name          TEXT,
  p_category      TEXT,
  p_price         NUMERIC,
  p_cost          NUMERIC,
  p_min_stock     INTEGER,
  p_current_stock INTEGER,
  p_barcode       TEXT
) RETURNS product AS $$
DECLARE
  v_product product;
BEGIN
  INSERT INTO product (clinic_id, name, category, price, avg_cost_price, barcode)
  VALUES (p_clinic_id, p_name, p_category, p_price, p_cost, p_barcode)
  RETURNING * INTO v_product;

  INSERT INTO inventory_stock (clinic_id, product_id, quantity, min_quantity)
  VALUES (p_clinic_id, v_product.id, p_current_stock, p_min_stock);

  RETURN v_product;
END;
$$ LANGUAGE plpgsql;
```

### Dispensing & Transfers

- **`dispense_inventory`**: Deducts stock and creates an audit trail (`inventory_transaction`) atomically.
- **`transfer_inventory`**: Moves stock between two warehouses within the same clinic.

## UI Features

### Tab Navigation

The inventory module provides two main tabs:

1. **Produtos** — Product catalog and stock management
2. **Procedimentos** — Procedure types and recipe configuration

### Product Modal

The `ProductModalComponent` (`frontend/src/app/features/inventory/product-modal/product-modal.component.ts`) handles new product intake.

| Field | Requirement | Permission Required |
|-------|-------------|---------------------|
| Name | Mandatory | `inventory.write` |
| Category | Optional | `inventory.write` |
| Selling Price | Mandatory (>=0) | `inventory.write` |
| Cost Price | Mandatory (>=0) | `inventory.view_cost` |
| Initial Stock | Mandatory (>=0) | `inventory.write` |
| Min. Stock | Mandatory (>=0) | `inventory.write` |

### Procedures & Recipes

The Procedures tab (`frontend/src/app/features/inventory/`) allows clinics to define medical/aesthetic procedures and configure which inventory items are consumed when a procedure is performed.

#### Data Model

**`procedure_type`** — Types of procedures offered:

```sql
procedure_type {
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid()
  clinic_id  uuid NOT NULL REFERENCES clinic(id)
  name       text NOT NULL
  code       text          -- TUSS/Internal code
  price      numeric(10,2) DEFAULT 0 NOT NULL
  active     boolean DEFAULT true
  created_at timestamptz DEFAULT now()
}
```

**`procedure_recipe`** — Ingredients/consumables for a procedure:

```sql
procedure_recipe {
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid()
  procedure_type_id  uuid NOT NULL REFERENCES procedure_type(id)
  item_id            uuid NOT NULL REFERENCES product(id)
  quantity           numeric(10,2) DEFAULT 1 NOT NULL
  created_at         timestamptz DEFAULT now()
  UNIQUE(procedure_type_id, item_id)
}
```

#### Service Layer

The `ProcedureService` (`frontend/src/app/core/services/procedure.service.ts`) provides:

| Method | Description |
|--------|-------------|
| `getProcedureTypes()` | List all procedure types for the clinic |
| `createProcedureType(dto)` | Create a new procedure type |
| `updateProcedureType(id, dto)` | Update an existing procedure type |
| `getRecipeForProcedure(procedureId)` | Get all recipe items for a procedure |
| `addRecipeItem(dto)` | Add an item to a procedure's recipe |
| `removeRecipeItem(recipeId)` | Remove an item from a recipe |

#### Components

| Component | File | Purpose |
|-----------|------|---------|
| `ProcedureModalComponent` | `procedure-modal/procedure-modal.component.ts` | Create/edit procedure form |
| `RecipePanelComponent` | `recipe-panel/recipe-panel.component.ts` | Shows selected procedure's recipe items |

#### Procedure Modal Fields

| Field | Requirement | Permission Required |
|-------|-------------|---------------------|
| Name | Mandatory | `inventory.write` |
| Code (TUSS/Internal) | Optional | `inventory.write` |
| Price (R$) | Mandatory (>=0) | `inventory.write` |
| Active | Checkbox (default true) | `inventory.write` |

#### Recipe Panel

The recipe panel displays when a procedure is selected. It allows:
- Viewing all items configured for the selected procedure
- Adding new items with quantity
- Removing items from the recipe

> [!NOTE]
> Recipe items reference the `product` table, not `inventory_item`. All procedure recipes consume products from the main inventory.

### Filtering & Alerts
Implemented in recent updates (PR #71), the inventory dashboard now supports:

1. **Category Filtering**: A dynamic dropdown appears if more than two product categories exist (frontend/src/app/features/inventory/inventory.component.ts:119).
2. **Low-Stock Highlighting**: Cards turn red and display an "Abaixo do Mín." badge when `current_stock < min_stock`.
3. **Audit Trail**: All movements are logged in `inventory_transaction` via RPC calls.

## System Architecture

```mermaid
sequenceDiagram
    autonumber
    participant UI as Inventory UI
    participant Store as InventoryStore (Signal)
    participant SVC as InventoryService
    participant RPC as Postgres RPC
    participant DB as Supabase Tables

    UI->>Store: openNewProductModal()
    Store->>SVC: createProduct(dto)
    Note over SVC,RPC: Atomic Transaction
    SVC->>RPC: create_product_with_stock()
    RPC->>DB: INSERT product
    RPC->>DB: INSERT inventory_stock
    DB-->>UI: Refresh Signals
```

## Related Pages

- [Multi-Tenant Security](../core-architecture/multi-tenant-security) — clinicId filtering logic.
- [Database Schema](../core-architecture/database) — Complete list of inventory tables.
