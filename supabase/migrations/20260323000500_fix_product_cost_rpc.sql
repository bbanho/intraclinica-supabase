-- Fix the return object mapping of create_product_with_stock
-- The frontend Product interface expects 'cost', but the db column is 'avg_cost_price'

CREATE OR REPLACE FUNCTION public.create_product_with_stock(
  p_clinic_id uuid,
  p_name text,
  p_category text,
  p_price numeric,
  p_cost numeric,
  p_min_stock integer,
  p_current_stock integer,
  p_barcode text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_product_id uuid;
  v_product_result jsonb;
BEGIN
  -- Check permission
  IF NOT public.has_clinic_access(p_clinic_id) THEN
    RAISE EXCEPTION 'Access denied to clinic %', p_clinic_id;
  END IF;

  -- 1. Insert product (current_stock forced to 0 temporarily to allow trigger math)
  INSERT INTO public.product (
    clinic_id, name, category, price, avg_cost_price, 
    min_stock, current_stock, barcode
  )
  VALUES (
    p_clinic_id, p_name, p_category, p_price, p_cost, 
    p_min_stock, 0, p_barcode
  )
  RETURNING id INTO v_product_id;

  -- 2. Insert initial stock transaction if > 0
  IF p_current_stock > 0 THEN
    INSERT INTO public.stock_transaction (
      clinic_id, product_id, type, total_qty, reason, notes, user_id
    )
    VALUES (
      p_clinic_id, v_product_id, 'IN', p_current_stock, 'INITIAL_STOCK', 'Estoque inicial', (select auth.uid())
    );
  END IF;

  -- 3. Return product mapped to frontend interface
  SELECT jsonb_build_object(
    'id', p.id,
    'clinic_id', p.clinic_id,
    'name', p.name,
    'category', p.category,
    'price', p.price,
    'cost', p.avg_cost_price,
    'min_stock', p.min_stock,
    'current_stock', p.current_stock,
    'barcode', p.barcode
  ) INTO v_product_result FROM public.product p WHERE id = v_product_id;
  
  RETURN v_product_result;
END;
$$;
