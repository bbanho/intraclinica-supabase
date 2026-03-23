-- 🛡️ Mission: Inventory Guardian (Schema Setup) - FIXED: Singular Naming
-- Description: Foundation for Procedure-Based Inventory Audit.

-- 1. Inventory Items (The Catalog)
CREATE TABLE IF NOT EXISTS inventory_item (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL DEFAULT 'un', -- 'un', 'ml', 'mg', 'cx'
  current_stock NUMERIC DEFAULT 0,
  min_stock NUMERIC DEFAULT 0,
  cost_price NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Procedure Types (The Services)
CREATE TABLE IF NOT EXISTS procedure_type (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  price NUMERIC DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Procedure Recipes (The "Cake Recipe")
-- Defines what items are consumed per procedure
CREATE TABLE IF NOT EXISTS procedure_recipe (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  procedure_type_id UUID REFERENCES procedure_type(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES inventory_item(id) ON DELETE CASCADE NOT NULL,
  quantity NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(procedure_type_id, item_id)
);

-- 4. Inventory Movements (The Audit Trail)
CREATE TABLE IF NOT EXISTS inventory_movement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES inventory_item(id) ON DELETE CASCADE NOT NULL,
  qty_change NUMERIC NOT NULL, -- (+/-)
  reason TEXT NOT NULL CHECK (reason IN ('PURCHASE', 'PROCEDURE', 'CORRECTION', 'LOSS', 'RETURN')),
  related_procedure_id UUID, -- Links to clinical_records or appointments if needed
  actor_id UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable RLS
ALTER TABLE inventory_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_recipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movement ENABLE ROW LEVEL SECURITY;

-- 6. Basic Policies (Clinic Scoped)
-- Note: Requires a 'profiles' table with 'clinic_id' to work
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view items in their clinic') THEN
        CREATE POLICY "Users can view items in their clinic" ON inventory_item
          FOR SELECT USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view procedures in their clinic') THEN
        CREATE POLICY "Users can view procedures in their clinic" ON procedure_type
          FOR SELECT USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()));
    END IF;
END $$;

-- 7. Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_inventory_item_updated_at ON inventory_item;
CREATE TRIGGER update_inventory_item_updated_at BEFORE UPDATE ON inventory_item FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_clinic ON inventory_item(clinic_id);
CREATE INDEX IF NOT EXISTS idx_procedure_clinic ON procedure_type(clinic_id);
CREATE INDEX IF NOT EXISTS idx_movement_item ON inventory_movement(item_id);
