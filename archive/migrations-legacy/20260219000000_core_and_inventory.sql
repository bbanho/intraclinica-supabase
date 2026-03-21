-- 🛡️ IntraClinica Foundation + Inventory Guardian (Combined Migration)
-- This script ensures core tables (clinics, profiles) exist before building inventory.

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Core: Clinics (Tenants)
CREATE TABLE IF NOT EXISTS clinics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  plan TEXT CHECK (plan IN ('Starter', 'Pro', 'Enterprise')),
  status TEXT CHECK (status IN ('active', 'inactive', 'trial')),
  next_billing TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Core: Profiles (User Identity)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT DEFAULT 'USER',
  clinic_id TEXT REFERENCES clinics(id),
  avatar TEXT,
  assigned_room TEXT,
  iam JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Inventory Items
CREATE TABLE IF NOT EXISTS inventory_item (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL DEFAULT 'un',
  current_stock NUMERIC DEFAULT 0,
  min_stock NUMERIC DEFAULT 0,
  cost_price NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Procedure Types
CREATE TABLE IF NOT EXISTS procedure_type (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  price NUMERIC DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Procedure Recipes
CREATE TABLE IF NOT EXISTS procedure_recipe (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  procedure_type_id UUID REFERENCES procedure_type(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES inventory_item(id) ON DELETE CASCADE NOT NULL,
  quantity NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(procedure_type_id, item_id)
);

-- 6. Inventory Movements
CREATE TABLE IF NOT EXISTS inventory_movement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES inventory_item(id) ON DELETE CASCADE NOT NULL,
  qty_change NUMERIC NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('PURCHASE', 'PROCEDURE', 'CORRECTION', 'LOSS', 'RETURN')),
  related_procedure_id UUID,
  actor_id UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Security: RLS
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_recipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movement ENABLE ROW LEVEL SECURITY;

-- 8. Policies
DO $$ 
BEGIN
    -- Clinics
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Authenticated users can view clinics') THEN
        CREATE POLICY "Authenticated users can view clinics" ON clinics FOR SELECT USING (auth.role() = 'authenticated');
    END IF;

    -- Profiles
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view own profile') THEN
        CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
    END IF;

    -- Inventory
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view items in their clinic') THEN
        CREATE POLICY "Users can view items in their clinic" ON inventory_item
          FOR SELECT USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view procedures in their clinic') THEN
        CREATE POLICY "Users can view procedures in their clinic" ON procedure_type
          FOR SELECT USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()));
    END IF;
END $$;

-- 9. RPC: perform_procedure
CREATE OR REPLACE FUNCTION perform_procedure(
    p_clinic_id TEXT,
    p_patient_id UUID,
    p_professional_id UUID,
    p_procedure_type_id UUID,
    p_notes TEXT DEFAULT ''
) RETURNS UUID AS $$
DECLARE
    v_procedure_id UUID;
    v_recipe_item RECORD;
BEGIN
    v_procedure_id := gen_random_uuid();

    FOR v_recipe_item IN (
        SELECT item_id, quantity 
        FROM procedure_recipe 
        WHERE procedure_type_id = p_procedure_type_id
    ) LOOP
        INSERT INTO inventory_movement (
            clinic_id, item_id, qty_change, reason, related_procedure_id, actor_id, notes
        ) VALUES (
            p_clinic_id, v_recipe_item.item_id, -v_recipe_item.quantity, 'PROCEDURE', v_procedure_id, p_professional_id, p_notes
        );

        UPDATE inventory_item 
        SET current_stock = current_stock - v_recipe_item.quantity,
            updated_at = NOW()
        WHERE id = v_recipe_item.item_id;
    END LOOP;

    RETURN v_procedure_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Triggers & Indexes
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_inventory_item_updated_at ON inventory_item;
CREATE TRIGGER update_inventory_item_updated_at BEFORE UPDATE ON inventory_item FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_inventory_clinic ON inventory_item(clinic_id);
CREATE INDEX IF NOT EXISTS idx_procedure_clinic ON procedure_type(clinic_id);
CREATE INDEX IF NOT EXISTS idx_movement_item ON inventory_movement(item_id);
