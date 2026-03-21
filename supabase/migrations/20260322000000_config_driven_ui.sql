-- 1. ui_module: All available SaaS features
CREATE TABLE ui_module (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(50) NOT NULL,
  icon VARCHAR(50) NOT NULL,
  route VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. clinic_module: Which modules are enabled for a specific clinic, and in what order
CREATE TABLE clinic_module (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinic(id) ON DELETE CASCADE,
  module_key VARCHAR(50) NOT NULL REFERENCES ui_module(key) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(clinic_id, module_key)
);

-- 3. clinic_config: JSON configurations for a clinic (like specific workflows, workstations, labels)
CREATE TABLE clinic_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinic(id) ON DELETE CASCADE,
  key VARCHAR(50) NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(clinic_id, key)
);

-- Row Level Security
ALTER TABLE ui_module ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_module ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ui_module is viewable by all users" ON ui_module FOR SELECT USING (true);
CREATE POLICY "clinic_module is viewable by clinic members" ON clinic_module FOR SELECT USING (true);
CREATE POLICY "clinic_config is viewable by clinic members" ON clinic_config FOR SELECT USING (true);

-- 4. Seed SaaS Available Modules
INSERT INTO ui_module (key, label, icon, route, description) VALUES
  ('inventory', 'Estoque', 'Package', '/inventory', 'Controle de suprimentos'),
  ('reception', 'Recepção', 'Users', '/reception', 'Gestão de filas de pacientes'),
  ('patients', 'Pacientes', 'UserRound', '/patients', 'Prontuários e Cadastros'),
  ('appointments', 'Consultas', 'Calendar', '/appointments', 'Agenda e Reservas'),
  ('procedures', 'Procedimentos', 'ClipboardList', '/procedures', 'Execução de protocolos'),
  ('clinical', 'Prontuário IA', 'Stethoscope', '/clinical', 'Anotações clínicas auxiliadas por IA'),
  ('reports', 'Indicadores', 'BarChart3', '/reports', 'Métricas e Dashboards BI'),
  ('social', 'Marketing IA', 'Share2', '/social', 'Geração de conteúdo para redes sociais')
ON CONFLICT (key) DO NOTHING;

-- 5. Seed Demo Clinic (cdf8cf49-b559-4c44-8533-38977611e1b4) modules
DO $$
DECLARE
  v_demo_clinic UUID := 'cdf8cf49-b559-4c44-8533-38977611e1b4';
  v_mod RECORD;
  v_order INT := 10;
BEGIN
  IF EXISTS (SELECT 1 FROM clinic WHERE id = v_demo_clinic) THEN
    FOR v_mod IN (SELECT key FROM ui_module ORDER BY key) LOOP
      INSERT INTO clinic_module (clinic_id, module_key, enabled, sort_order)
      VALUES (v_demo_clinic, v_mod.key, true, v_order)
      ON CONFLICT (clinic_id, module_key) DO NOTHING;
      v_order := v_order + 10;
    END LOOP;
  END IF;
END $$;

-- 6. RPC: Fetch config and modules at once
CREATE OR REPLACE FUNCTION get_clinic_ui_config(p_clinic_id UUID)
RETURNS JSONB
AS $$
DECLARE
  v_modules JSONB;
  v_config JSONB;
BEGIN
  -- Get all modules available, sorted. If not explicitly enabled/disabled, they don't show up.
  SELECT jsonb_agg(
    jsonb_build_object(
      'key', m.key,
      'label', m.label,
      'icon', m.icon,
      'route', m.route,
      'enabled', cm.enabled,
      'sort_order', cm.sort_order
    ) ORDER BY cm.sort_order ASC
  ) INTO v_modules
  FROM clinic_module cm
  JOIN ui_module m ON m.key = cm.module_key
  WHERE cm.clinic_id = p_clinic_id;

  -- Get arbitrary key-value configs
  SELECT jsonb_object_agg(key, value)
  INTO v_config
  FROM clinic_config
  WHERE clinic_id = p_clinic_id;

  RETURN jsonb_build_object(
    'modules', COALESCE(v_modules, '[]'::jsonb),
    'config', COALESCE(v_config, '{}'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
