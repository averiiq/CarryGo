-- =============================================================================
-- Migration: Prevent Duplicate Aadhaar & PAN Across Multiple Accounts
-- Adds deterministic cryptographic hash columns to kyc_sessions.
-- Ensures zero storage of plaintext Aadhaar/PAN while enforcing strict 1-to-1
-- identity mapping (prevents Sybil attacks and duplicate identity fraud).
-- =============================================================================

-- 1. Add hash columns to kyc_sessions
ALTER TABLE public.kyc_sessions
  ADD COLUMN IF NOT EXISTS aadhaar_hash text,
  ADD COLUMN IF NOT EXISTS pan_hash text;

-- 2. Performance indexes for duplicate identity lookups
CREATE INDEX IF NOT EXISTS kyc_sessions_aadhaar_hash_idx
  ON public.kyc_sessions (aadhaar_hash)
  WHERE aadhaar_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS kyc_sessions_pan_hash_idx
  ON public.kyc_sessions (pan_hash)
  WHERE pan_hash IS NOT NULL;

-- 3. Update verify_aadhaar_sandbox to enforce Aadhaar uniqueness
CREATE OR REPLACE FUNCTION public.verify_aadhaar_sandbox(
  p_session_id uuid,
  p_user_id uuid,
  p_reference_id text,
  p_name text,
  p_dob text DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_address jsonb DEFAULT NULL,
  p_aadhaar_hash text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_session public.kyc_sessions%ROWTYPE;
BEGIN
  -- Auth: caller must be the session owner
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_session
  FROM public.kyc_sessions
  WHERE id = p_session_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'KYC session not found';
  END IF;

  -- Must be in pending/submitted status
  IF v_session.status NOT IN ('pending', 'submitted') THEN
    RAISE EXCEPTION 'Session is not in a modifiable state';
  END IF;

  -- Aadhaar must not already be verified (prevent replay)
  IF v_session.aadhaar_verification_status = 'verified' THEN
    RAISE EXCEPTION 'Aadhaar is already verified for this session';
  END IF;

  -- DUPLICATE IDENTITY CHECK:
  -- Verify that no other user has verified or submitted with this Aadhaar hash
  IF p_aadhaar_hash IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.kyc_sessions
      WHERE aadhaar_hash = p_aadhaar_hash
        AND user_id <> p_user_id
        AND (status IN ('submitted', 'approved') OR aadhaar_verification_status = 'verified')
    ) THEN
      RAISE EXCEPTION 'This Aadhaar number is already linked to another CarryGo account.';
    END IF;
  END IF;

  UPDATE public.kyc_sessions
  SET
    aadhaar_verification_status = 'verified',
    aadhaar_reference_id = p_reference_id,
    aadhaar_verified_at = now(),
    aadhaar_name = p_name,
    aadhaar_dob = p_dob,
    aadhaar_gender = p_gender,
    aadhaar_address = p_address,
    aadhaar_hash = COALESCE(p_aadhaar_hash, aadhaar_hash)
  WHERE id = p_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_aadhaar_sandbox(uuid, uuid, text, text, text, text, jsonb, text) TO authenticated;

-- 4. Update update_kyc_pan_status to enforce PAN uniqueness
CREATE OR REPLACE FUNCTION public.update_kyc_pan_status(
  p_session_id uuid,
  p_user_id uuid,
  p_pan_status text,
  p_pan_reference_id text DEFAULT NULL,
  p_pan_hash text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_session public.kyc_sessions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_pan_status NOT IN ('verified', 'not_provided', 'failed') THEN
    RAISE EXCEPTION 'Invalid PAN status value';
  END IF;

  SELECT * INTO v_session
  FROM public.kyc_sessions
  WHERE id = p_session_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'KYC session not found';
  END IF;

  -- Selfie must be uploaded/verified before PAN step
  IF v_session.selfie_status NOT IN ('uploaded', 'verified') THEN
    RAISE EXCEPTION 'Selfie must be completed before PAN verification';
  END IF;

  -- DUPLICATE IDENTITY CHECK:
  -- If PAN is verified, ensure no other user has verified with this PAN hash
  IF p_pan_status = 'verified' AND p_pan_hash IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.kyc_sessions
      WHERE pan_hash = p_pan_hash
        AND user_id <> p_user_id
        AND (pan_verification_status = 'verified' OR status IN ('submitted', 'approved'))
    ) THEN
      RAISE EXCEPTION 'This PAN number is already linked to another CarryGo account.';
    END IF;
  END IF;

  UPDATE public.kyc_sessions
  SET
    pan_verification_status = p_pan_status,
    pan_reference_id = COALESCE(p_pan_reference_id, pan_reference_id),
    pan_verified_at = CASE WHEN p_pan_status = 'verified' THEN now() ELSE pan_verified_at END,
    pan_hash = CASE WHEN p_pan_status = 'verified' THEN COALESCE(p_pan_hash, pan_hash) ELSE pan_hash END
  WHERE id = p_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_kyc_pan_status(uuid, uuid, text, text, text) TO authenticated;
