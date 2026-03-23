BEGIN;

DO $$
DECLARE
    v_clinic_id UUID := '00000000-0000-0000-0000-000000000001';
    v_user_id UUID := '11111111-1111-1111-1111-111111111111';
    v_patient_1_id UUID := '22222222-2222-2222-2222-222222222222';
    v_patient_2_id UUID := '33333333-3333-3333-3333-333333333333';
    v_product_1_id UUID := '44444444-4444-4444-4444-444444444444';
    v_product_2_id UUID := '55555555-5555-5555-5555-555555555555';
    v_iam_bindings JSONB;
BEGIN

    INSERT INTO public.clinic (id, name, email, plan, status)
    VALUES (v_clinic_id, 'Clínica Central IntraClinica', 'contato@intraclinica.com.br', 'Premium', 'active')
    ON CONFLICT (id) DO NOTHING;

    v_iam_bindings := jsonb_build_object(
        v_clinic_id::TEXT, jsonb_build_object(
            'roles', jsonb_build_array('roles/clinic_admin', 'roles/doctor'),
            'grants', jsonb_build_array(),
            'blocks', jsonb_build_array()
        )
    );

    INSERT INTO public.app_user (id, email, name, iam_bindings, role)
    VALUES (v_user_id, 'bmbanho@gmail.com', 'Bruno Banho (Admin)', v_iam_bindings, 'admin')
    ON CONFLICT (id) DO UPDATE SET 
        iam_bindings = EXCLUDED.iam_bindings,
        name = EXCLUDED.name;

    INSERT INTO public.patient (id, clinic_id, name, cpf, birth_date, gender)
    VALUES 
    (v_patient_1_id, v_clinic_id, 'João da Silva', '123.456.789-00', '1985-05-20', 'Masculino'),
    (v_patient_2_id, v_clinic_id, 'Maria Oliveira', '987.654.321-11', '1992-11-10', 'Feminino')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.product (id, clinic_id, name, category, price, avg_cost_price, current_stock, min_stock, unit)
    VALUES 
    (v_product_1_id, v_clinic_id, 'Luva de Procedimento Látex (P)', 'Descartáveis', 45.90, 32.00, 50, 10, 'cx'),
    (v_product_2_id, v_clinic_id, 'Seringa 5ml com Agulha', 'Insumos', 1.50, 0.80, 200, 50, 'un')
    ON CONFLICT (id) DO NOTHING;

END $$;

COMMIT;
