-- Função para dedução atômica de estoque baseada em receita de procedimento
CREATE OR REPLACE FUNCTION public.deduct_procedure_stock(
  p_clinic_id UUID,
  p_procedure_id UUID,
  p_actor_id UUID,
  p_record_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
  v_procedure_name TEXT;
BEGIN
  -- 1. Validação de acesso (IAM/RLS bridge)
  IF NOT public.has_clinic_access(p_clinic_id) THEN
    RAISE EXCEPTION 'Acesso negado para a clínica %', p_clinic_id;
  END IF;

  -- 2. Obter nome do procedimento para o log (opcional, melhora auditabilidade)
  SELECT name INTO v_procedure_name FROM public.procedure_type WHERE id = p_procedure_id;

  -- 3. Loop na receita do procedimento
  FOR r IN
    SELECT item_id, quantity
    FROM public.procedure_recipe
    WHERE procedure_type_id = p_procedure_id
  LOOP
    -- 4. Inserir log em stock_transaction
    -- O gatilho 'trg_stock_transaction_sync' cuidará de atualizar 'product.current_stock' atomicamente.
    INSERT INTO public.stock_transaction (
      clinic_id,
      product_id,
      type,
      total_qty,
      reason,
      record_id,
      user_id,
      notes,
      timestamp
    )
    VALUES (
      p_clinic_id,
      r.item_id,
      'OUT',
      r.quantity,
      'PROCEDURE_CONSUMPTION',
      p_record_id,
      p_actor_id,
      format('Consumo automático: %s', COALESCE(v_procedure_name, 'Procedimento desconhecido')),
      now()
    );
  END LOOP;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.deduct_procedure_stock(UUID, UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_procedure_stock(UUID, UUID, UUID, UUID) TO service_role;

COMMENT ON FUNCTION public.deduct_procedure_stock IS 'Deduz estoque atomicamente com base na receita (procedure_recipe) vinculada a um procedure_type.';
