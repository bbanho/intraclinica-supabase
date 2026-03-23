-- Revoke unnecessary anon grant on create_medical_record (has_clinic_access already checks auth.uid)
REVOKE EXECUTE ON FUNCTION public.create_medical_record FROM anon;
