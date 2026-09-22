-- =============================================================================
-- Migration: Add PAN Verification to User Profiles for Transactions
-- Enables mandatory, one-time PAN verification for financial transactions.
-- Stores hashed PAN for 1-to-1 duplicate prevention and masked PAN for UI display.
-- =============================================================================

-- 1. Add PAN verification columns to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_pan_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pan_hash text,
  ADD COLUMN IF NOT EXISTS pan_masked text,
  ADD COLUMN IF NOT EXISTS pan_verified_at timestamptz;

-- 2. Performance index for duplicate PAN lookups
CREATE INDEX IF NOT EXISTS user_profiles_pan_hash_idx
  ON public.user_profiles (pan_hash)
  WHERE pan_hash IS NOT NULL;

-- 3. Atomic RPC to verify and record user's PAN card for transactions
CREATE OR REPLACE FUNCTION public.verify_user_pan(
  p_user_id uuid,
  p_pan_masked text,
  p_pan_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_existing_profile public.user_profiles%ROWTYPE;
BEGIN
  -- Caller authorization
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Verify user profile exists
  SELECT * INTO v_existing_profile
  FROM public.user_profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
  END IF;

  -- Already verified check
  IF v_existing_profile.is_pan_verified IS TRUE THEN
    RETURN jsonb_build_object('success', true, 'pan_masked', v_existing_profile.pan_masked, 'already_verified', true);
  END IF;

  -- DUPLICATE CHECK across all other user profiles
  IF EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE pan_hash = p_pan_hash
      AND id <> p_user_id
      AND is_pan_verified IS TRUE
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This PAN card is already linked to another CarryGo account.');
  END IF;

  -- DUPLICATE CHECK across existing KYC sessions
  IF EXISTS (
    SELECT 1 FROM public.kyc_sessions
    WHERE pan_hash = p_pan_hash
      AND user_id <> p_user_id
      AND (pan_verification_status = 'verified' OR status IN ('submitted', 'approved'))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This PAN card is already linked to another CarryGo account.');
  END IF;

  -- Record verification on user_profiles
  UPDATE public.user_profiles
  SET
    is_pan_verified = true,
    pan_hash = p_pan_hash,
    pan_masked = p_pan_masked,
    pan_verified_at = now()
  WHERE id = p_user_id;

  -- Also update latest kyc_session if one exists for this user
  UPDATE public.kyc_sessions
  SET
    pan_verification_status = 'verified',
    pan_hash = p_pan_hash,
    pan_reference_id = 'pan_tx_' || p_pan_masked || '_' || floor(extract(epoch from now())),
    pan_verified_at = now()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object('success', true, 'pan_masked', p_pan_masked);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_user_pan(uuid, text, text) TO authenticated;
