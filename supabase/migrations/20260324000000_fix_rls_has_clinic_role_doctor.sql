-- Migration: Fix RLS has_clinic_role Function for Array-based IAM Bindings
-- 
-- ISSUE: The RLS policies in 20260322230000_iam_rls_enforcement.sql call 
-- has_clinic_role(clinic_id, 'DOCTOR') using the legacy role format. However,
-- the has_clinic_role function in 20260323000000_flatten_actor_model.sql uses 
-- the JSONB `?` operator which checks for KEY existence, not VALUE existence.
--
-- The frontend stores iam_bindings as:
--   { "clinic_uuid": ["roles/doctor", "roles/admin"] }
--
-- This is an ARRAY of role strings with 'roles/' prefix. The old function tried 
-- to use `iam_bindings->clinic_id ? 'DOCTOR'` which would check for a key named 
-- 'DOCTOR' in the JSONB object at that clinic, but since the value is an ARRAY,
-- not an OBJECT, this check was broken.
--
-- This migration replaces has_clinic_role with a correct implementation that:
-- 1. Uses jsonb_array_elements_text() to check if the role string exists in the array
-- 2. Normalizes the role parameter to accept both 'DOCTOR' and 'roles/doctor' formats
--    for backward compatibility with RLS policies using 'DOCTOR' format.
--
-- RLS policies that call has_clinic_role(clinic_id, 'DOCTOR') will now work
-- because the function normalizes to 'roles/doctor' internally before checking.

-- Replace has_clinic_role with corrected implementation
CREATE OR REPLACE FUNCTION public.has_clinic_role(target_clinic_id uuid, target_role text)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.app_user u,
         jsonb_array_elements_text(
           COALESCE(u.iam_bindings->target_clinic_id::text, '[]'::jsonb)
         ) AS role_value
    WHERE u.id = (SELECT auth.uid())
      AND (
        u.role = 'SUPER_ADMIN' 
        OR role_value = CASE 
            -- Normalize: accept 'DOCTOR' or 'roles/doctor' format
            WHEN target_role = 'DOCTOR' THEN 'roles/doctor'
            WHEN target_role = 'ADMIN' THEN 'roles/admin'
            WHEN target_role = 'RECEPTIONIST' THEN 'roles/receptionist'
            WHEN target_role = 'LAB_MANAGER' THEN 'roles/lab_manager'
            WHEN target_role LIKE 'roles/%' THEN target_role  -- passthrough if already prefixed
            ELSE 'roles/' || lower(target_role)
          END
      )
  );
$$;

-- Add comment explaining format consistency for future developers
COMMENT ON FUNCTION public.has_clinic_role(uuid, text) IS 
  'Checks if current user has a specific role for a clinic. 
   Role parameter accepts both legacy format (DOCTOR, ADMIN) and modern format (roles/doctor, roles/admin).
   The iam_bindings column stores roles as JSONB arrays: { "clinic_uuid": ["roles/doctor", "roles/admin"] }';
