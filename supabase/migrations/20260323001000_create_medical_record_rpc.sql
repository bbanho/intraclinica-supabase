-- Migration: Create medical_record RPC (replaces add_clinical_record dropped in flatten migration)

CREATE OR REPLACE FUNCTION public.create_medical_record(
  p_clinic_id uuid,
  p_patient_id uuid,
  p_doctor_id uuid,
  p_content jsonb,
  p_type text DEFAULT 'consultation'
) RETURNS setof public.clinical_record
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.has_clinic_access(p_clinic_id) THEN
    RAISE EXCEPTION 'Access denied to clinic %', p_clinic_id;
  END IF;

  IF p_content IS NULL OR p_content = 'null'::jsonb THEN
    RAISE EXCEPTION 'Content cannot be null';
  END IF;

  RETURN QUERY
  INSERT INTO public.clinical_record (clinic_id, patient_id, doctor_id, content, type)
  VALUES (p_clinic_id, p_patient_id, p_doctor_id, p_content, p_type::public.record_type)
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_medical_record TO authenticated;
