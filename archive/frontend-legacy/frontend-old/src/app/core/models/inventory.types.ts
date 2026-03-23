// InventoryItem now maps to the canonical `product` table.
export interface InventoryItem {
  id: string;
  clinic_id: string;
  name: string;
  description?: string | null;
  unit: string; // 'un', 'ml', 'mg', 'cx'
  current_stock: number;
  min_stock: number;
  avg_cost_price: number;  // was cost_price in inventory_item
  price: number;
  category?: string | null;
  barcode?: string | null;
  deleted?: boolean;
}

// InventoryMovement now maps to `stock_transaction`.
export interface InventoryMovement {
  id: string;
  clinic_id: string;
  product_id: string;        // was item_id
  type: 'IN' | 'OUT';       // replaces numeric qty_change sign
  total_qty: number;         // absolute quantity
  reason: string;
  record_id?: string | null;
  actor_id?: string | null;
  notes?: string | null;
  timestamp?: string;
}

export interface ProcedureType {
  id: string;
  clinic_id: string;
  name: string;
  code?: string;
  price: number;
  active: boolean;
  created_at?: string;
}

export interface ProcedureRecipe {
  id: string;
  procedure_type_id: string;
  item_id: string;
  quantity: number;
  created_at?: string;
  // Join fields (optional)
  item_name?: string;
  unit?: string;
}
