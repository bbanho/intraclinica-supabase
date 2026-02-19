export interface InventoryItem {
  id: string;
  clinic_id: string;
  name: string;
  description?: string;
  unit: string; // 'un', 'ml', 'mg', 'cx'
  current_stock: number;
  min_stock: number;
  cost_price: number;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryMovement {
  id: string;
  clinic_id: string;
  item_id: string;
  qty_change: number;
  reason: 'PURCHASE' | 'PROCEDURE' | 'CORRECTION' | 'LOSS' | 'RETURN';
  related_procedure_id?: string;
  actor_id?: string;
  notes?: string;
  created_at?: string;
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
