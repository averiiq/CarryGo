-- Upgrade KYC schema to support Sandbox DigiLocker / Aadhaar verification flow,
-- mandatory selfie capture, and optional PAN verification.

-- 1. Expand kyc_sessions table with Sandbox DigiLocker & granular verification fields
ALTER TABLE public.kyc_sessions
  ADD COLUMN IF NOT EXISTS aadhaar_verification_status text NOT NULL DEFAULT 'pending'
    CHECK (aadhaar_verification_status IN ('pending', 'verified', 'failed')),
  ADD COLUMN IF NOT EXISTS aadhaar_reference_id text,
  ADD COLUMN IF NOT EXISTS aadhaar_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS aadhaar_name text,
  ADD COLUMN IF NOT EXISTS aadhaar_dob text,
  ADD COLUMN IF NOT EXISTS aadhaar_gender text,
  ADD COLUMN IF NOT EXISTS aadhaar_address jsonb,
  ADD COLUMN IF NOT EXISTS selfie_status text NOT NULL DEFAULT 'pending'
    CHECK (selfie_status IN ('pending', 'uploaded', 'verified')),
  ADD COLUMN IF NOT EXISTS pan_verification_status text NOT NULL DEFAULT 'not_provided'
    CHECK (pan_verification_status IN ('not_provided', 'pending', 'verified', 'failed')),
  ADD COLUMN IF NOT EXISTS pan_reference_id text,
  ADD COLUMN IF NOT EXISTS pan_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS kyc_flow_version integer NOT NULL DEFAULT 2;

-- 2. Add verified identity & address columns to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_aadhaar_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_address_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_address text;

-- 3. Indexes for fast status filtering
CREATE INDEX IF NOT EXISTS kyc_sessions_aadhaar_status_idx 
  ON public.kyc_sessions (aadhaar_verification_status, created_at DESC);

CREATE INDEX IF NOT EXISTS kyc_sessions_flow_version_idx
  ON public.kyc_sessions (kyc_flow_version, status);

-- 4. Complete KYC domain command (Security Definer)
-- Atomically completes KYC once Aadhaar is verified and selfie is captured/uploaded.
-- PAN is explicitly optional and does NOT block completion.
CREATE OR REPLACE FUNCTION public.complete_sandbox_kyc(
  p_session_id uuid,
  p_user_id uuid
)
RETURNS public.kyc_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_session public.kyc_sessions%ROWTYPE;
  v_address_text text;
BEGIN
  -- Authorization check: caller must be the session owner or an admin
  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND public.get_system_role() <> 'admin') THEN
    RAISE EXCEPTION 'Unauthorized to complete this KYC session';
  END IF;

  SELECT * INTO v_session
  FROM public.kyc_sessions
  WHERE id = p_session_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'KYC session not found';
  END IF;

  -- Validation: Aadhaar MUST be verified
  IF v_session.aadhaar_verification_status <> 'verified' THEN
    RAISE EXCEPTION 'Aadhaar verification is required before completing KYC';
  END IF;

  -- Validation: Selfie MUST be captured and uploaded
  IF v_session.selfie_status NOT IN ('uploaded', 'verified') AND v_session.selfie_url IS NULL THEN
    RAISE EXCEPTION 'Selfie capture is required before completing KYC';
  END IF;

  -- Build verified address string from JSON if available
  IF v_session.aadhaar_address IS NOT NULL THEN
    v_address_text := COALESCE(
      v_session.aadhaar_address->>'full_address',
      CONCAT_WS(', ',
        NULLIF(v_session.aadhaar_address->>'house', ''),
        NULLIF(v_session.aadhaar_address->>'street', ''),
        NULLIF(v_session.aadhaar_address->>'landmark', ''),
        NULLIF(v_session.aadhaar_address->>'locality', ''),
        NULLIF(v_session.aadhaar_address->>'city', ''),
        NULLIF(v_session.aadhaar_address->>'state', ''),
        NULLIF(v_session.aadhaar_address->>'pincode', '')
      )
    );
  END IF;

  -- Update session status to approved
  UPDATE public.kyc_sessions
  SET
    status = 'approved',
    selfie_status = 'verified',
    reviewed_at = now()
  WHERE id = p_session_id
  RETURNING * INTO v_session;

  -- Update user profile to fully verified state
  UPDATE public.user_profiles
  SET
    kyc_status = 'approved',
    verified = true,
    is_aadhaar_verified = true,
    is_address_verified = true,
    verified_address = COALESCE(v_address_text, verified_address),
    full_name = COALESCE(NULLIF(v_session.aadhaar_name, ''), full_name)
  WHERE id = p_user_id;

  -- Emit audit event
  PERFORM public.emit_domain_event(
    p_user_id,
    'kyc_session',
    p_session_id,
    'kyc_completed',
    'kyc',
    jsonb_build_object(
      'user_id', p_user_id,
      'session_id', p_session_id,
      'aadhaar_reference_id', v_session.aadhaar_reference_id,
      'pan_status', v_session.pan_verification_status,
      'completed_at', now()
    )
  );

  RETURN v_session;
END;
$$;
