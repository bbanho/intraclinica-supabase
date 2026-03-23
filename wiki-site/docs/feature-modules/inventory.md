---
title: Inventory Module
description: Product stock management, warehouse transfers, and dispense workflows in IntraClinica.
---

# Inventory Module

The Inventory module (`features/inventory/`) handles products, stock levels, warehouse transfers, and dispense operations tied to clinical prescriptions.

## Data Model

### `product`

Master catalog of available products/medications.

```sql
product {
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
  clinic_id    uuid REFERENCES clinic(id)  -- NULL = multi-clinic catalog
  name         text NOT NULL
  sku          text UNIQUE
  category     text  -- e.g., 'medication', 'supply', 'equipment'
  unit         text  -- e.g., 'tablet', 'ml', 'box'
  created_at   timestamptz DEFAULT now()
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

### `inventory_transaction`

Audit log for all stock movements.

```sql
inventory_transaction {
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
  clinic_id     uuid NOT NULL REFERENCES clinic(id)
  product_id    uuid NOT NULL REFERENCES product(id)
  movement_type text NOT NULL  -- 'IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT'
  quantity      integer NOT NULL
  reference_id  uuid  -- links to medical_record.dispense or transfer request
  performed_by  uuid REFERENCES app_user(id)
  created_at    timestamptz DEFAULT now()
}
```

## Atomic Stock Operations

Stock updates must always be atomic — never trust two sequential `UPDATE` calls.

### `create_product_with_stock`

Used when creating a new product AND initializing its first stock record in one shot.

```sql
CREATE OR REPLACE FUNCTION create_product_with_stock(
  p_clinic_id   UUID,
  p_name        TEXT,
  p_sku         TEXT,
  p_category    TEXT,
  p_unit        TEXT,
  p_warehouse_id UUID,
  p_quantity    INTEGER DEFAULT 0
) RETURNS product AS $$
DECLARE
  v_product product;
BEGIN
  INSERT INTO product (clinic_id, name, sku, category, unit)
  VALUES (p_clinic_id, p_name, p_sku, p_category, p_unit)
  RETURNING * INTO v_product;

  INSERT INTO inventory_stock (clinic_id, warehouse_id, product_id, quantity)
  VALUES (p_clinic_id, p_warehouse_id, v_product.id, p_quantity);

  RETURN v_product;
END;
$$ LANGUAGE plpgsql;
```

### `dispense_inventory`

Deducts stock and creates an audit trail atomically.

```sql
CREATE OR REPLACE FUNCTION dispense_inventory(
  p_clinic_id    UUID,
  p_product_id   UUID,
  p_quantity     INTEGER,
  p_reference_id UUID,
  p_performed_by UUID
) RETURNS inventory_transaction AS $$
BEGIN
  -- Deduct stock
  UPDATE inventory_stock
  SET quantity = quantity - p_quantity,
      updated_at = now()
  WHERE clinic_id = p_clinic_id
    AND product_id = p_product_id
    AND quantity >= p_quantity;  -- prevents negative stock

  -- Create audit trail
  RETURN INSERT INTO inventory_transaction
    (clinic_id, product_id, movement_type, quantity, reference_id, performed_by)
  VALUES
    (p_clinic_id, p_product_id, 'OUT', p_quantity, p_reference_id, p_performed_by)
  RETURNING *;
END;
$$ LANGUAGE plpgsql;
```

## Multi-Warehouse Transfers

When a clinic has multiple warehouses, transfers go through a two-step process:

1. `TRANSFER_OUT` at source warehouse (reduces source stock, logs `TRANSFER_OUT` transaction)
2. `TRANSFER_IN` at destination warehouse (increases dest stock, logs `TRANSFER_IN` transaction)

Both steps are executed via a single RPC `transfer_inventory`:

```sql
CREATE OR REPLACE FUNCTION transfer_inventory(
  p_clinic_id      UUID,
  p_product_id     UUID,
  p_quantity       INTEGER,
  p_source_warehouse UUID,
  p_dest_warehouse  UUID,
  p_performed_by   UUID
) RETURNS JSONB AS $$
BEGIN
  -- Out
  UPDATE inventory_stock
  SET quantity = quantity - p_quantity, updated_at = now()
  WHERE clinic_id = p_clinic_id AND warehouse_id = p_source_warehouse AND product_id = p_product_id;

  INSERT INTO inventory_transaction
    (clinic_id, product_id, movement_type, quantity, performed_by)
  VALUES
    (p_clinic_id, p_product_id, 'TRANSFER_OUT', p_quantity, p_performed_by);

  -- In
  UPDATE inventory_stock
  SET quantity = quantity + p_quantity, updated_at = now()
  WHERE clinic_id = p_clinic_id AND warehouse_id = p_dest_warehouse AND product_id = p_product_id;

  INSERT INTO inventory_transaction
    (clinic_id, product_id, movement_type, quantity, performed_by)
  VALUES
    (p_clinic_id, p_product_id, 'TRANSFER_IN', p_quantity, p_performed_by);

  RETURN jsonb_build_object('transferred', p_quantity, 'product_id', p_product_id);
END;
$$ LANGUAGE plpgsql;
```

## Low-Stock Alerts

The `min_quantity` column on `inventory_stock` drives low-stock warnings. The `InventoryStore` exposes a computed signal:

```typescript
readonly lowStockItems = computed(() =>
  this.svc.stocks().filter(s => s.quantity <= s.min_quantity)
)
```

## Multi-Tenant Filtering

Every query MUST include `clinic_id` in the `WHERE` clause:

```typescript
const clinicId = this.context.selectedClinicId()
if (!clinicId || clinicId === 'all') return []  // abort — global context invalid for inventory

const { data } = await this.supabase
  .from('inventory_stock')
  .select('*, product:product_id(*), warehouse:warehouse_id(*)')
  .eq('clinic_id', clinicId)
```

## Related Pages

- [Multi-Tenant Security](../core-architecture/multi-tenant-security) — clinicId filtering
- [Database Schema](../core-architecture/database) — RPC functions
