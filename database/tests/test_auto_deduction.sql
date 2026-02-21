-- 🧪 TESTE DE FOGO: BAIXA AUTOMÁTICA DE ESTOQUE
-- Objetivo: Provar que a lógica funciona independente da UI.

DO $$
DECLARE
  v_clinic_id uuid;
  v_item_id uuid;
  v_proc_type_id uuid;
  v_proc_id uuid;
  v_stock_before numeric;
  v_stock_after numeric;
  v_actor_id uuid;
BEGIN
  -- 0. Preparar Terreno (Pega IDs)
  SELECT id INTO v_clinic_id FROM clinic LIMIT 1;
  SELECT actor_id INTO v_actor_id FROM app_user WHERE email = 'motto@axio.eng.br';

  -- 1. Criar Item: "Fio de Teste" (Estoque: 100)
  INSERT INTO inventory_item (clinic_id, name, current_stock)
  VALUES (v_clinic_id, 'Fio de Teste', 100)
  RETURNING id INTO v_item_id;

  -- 2. Criar Procedimento: "Sutura Teste"
  INSERT INTO procedure_type (clinic_id, name)
  VALUES (v_clinic_id, 'Sutura Teste')
  RETURNING id INTO v_proc_type_id;

  -- 3. Criar Receita: 1 Sutura gasta 10 Fios (para ser óbvio)
  INSERT INTO procedure_recipe (procedure_type_id, item_id, quantity)
  VALUES (v_proc_type_id, v_item_id, 10);

  -- 4. Medir Estoque Antes
  SELECT current_stock INTO v_stock_before FROM inventory_item WHERE id = v_item_id;
  RAISE NOTICE 'Estoque Inicial: %', v_stock_before;

  -- 5. EXECUTAR A MÁGICA (RPC perform_procedure)
  -- Simula o médico clicando no botão
  v_proc_id := perform_procedure(
    v_clinic_id,
    NULL, -- Patient ID (opcional no teste)
    v_actor_id,
    v_proc_type_id,
    'Teste de automação via SQL'
  );

  -- 6. Medir Estoque Depois
  SELECT current_stock INTO v_stock_after FROM inventory_item WHERE id = v_item_id;
  RAISE NOTICE 'Estoque Final: %', v_stock_after;

  -- 7. Veredito
  IF v_stock_after = (v_stock_before - 10) THEN
    RAISE NOTICE '✅ SUCESSO ABSOLUTO: O estoque baixou automaticamente!';
  ELSE
    RAISE EXCEPTION '❌ FALHA CRÍTICA: O estoque não mudou ou mudou errado.';
  END IF;

END $$;
