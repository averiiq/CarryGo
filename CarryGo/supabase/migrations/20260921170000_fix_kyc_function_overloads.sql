-- =============================================================================
-- Migration: Fix KYC Function Overload Conflicts (PGRST203)
-- Drops outdated function overloads from prior migrations so PostgREST
-- can unambiguously resolve calls to verify_aadhaar_sandbox and update_kyc_pan_status.
-- =============================================================================

-- 1. Drop the legacy 7-parameter verify_aadhaar_sandbox
DROP FUNCTION IF EXISTS public.verify_aadhaar_sandbox(uuid, uuid, text, text, text, text, jsonb);

-- 2. Drop the legacy 4-parameter update_kyc_pan_status
DROP FUNCTION IF EXISTS public.update_kyc_pan_status(uuid, uuid, text, text);

-- 3. Ensure the active 8-parameter verify_aadhaar_sandbox is granted
GRANT EXECUTE ON FUNCTION public.verify_aadhaar_sandbox(uuid, uuid, text, text, text, text, jsonb, text) TO authenticated, service_role;

-- 4. Ensure the active 5-parameter update_kyc_pan_status is granted
GRANT EXECUTE ON FUNCTION public.update_kyc_pan_status(uuid, uuid, text, text, text) TO authenticated, service_role;
