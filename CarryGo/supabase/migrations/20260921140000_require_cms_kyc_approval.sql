-- =============================================================================
-- Migration: Require CMS KYC Approval & Face Verification Signals
-- Replaces automatic KYC verification with manual CMS approval workflow.
-- Adds face verification metadata columns to kyc_sessions.
-- =============================================================================

-- 1. Add face verification columns to kyc_sessions
ALTER TABLE public.kyc_sessions
  ADD COLUMN IF NOT EXISTS face_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS face_confidence numeric(5,2),
  ADD COLUMN IF NOT EXISTS face_metrics jsonb,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

-- 2. Index for filtering submitted sessions awaiting review
CREATE INDEX IF NOT EXISTS kyc_sessions_submitted_at_idx
  ON public.kyc_sessions (status, submitted_at DESC)
  WHERE status = 'submitted';

-- 3. RPC: submit_sandbox_kyc
-- Replaces automatic approval: transitions session to 'submitted' for CMS review.
CREATE OR REPLACE FUNCTION public.submit_sandbox_kyc(
  p_session_id uuid,
  p_user_id uuid,
  p_face_verified boolean DEFAULT true,
  p_face_confidence numeric DEFAULT NULL,
  p_face_metrics jsonb DEFAULT NULL
)
RETURNS public.kyc_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_session public.kyc_sessions%ROWTYPE;
BEGIN
  -- Authorization check: caller must be the session owner or an admin
  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND public.get_system_role() <> 'admin') THEN
    RAISE EXCEPTION 'Unauthorized to submit this KYC session';
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
    RAISE EXCEPTION 'Aadhaar verification is required before submitting KYC';
  END IF;

  -- Validation: Selfie MUST be uploaded
  IF v_session.selfie_status NOT IN ('uploaded', 'verified') AND v_session.selfie_url IS NULL THEN
    RAISE EXCEPTION 'Selfie capture is required before submitting KYC';
  END IF;

  -- Validation: Face verification MUST have succeeded
  IF p_face_verified IS NOT TRUE THEN
    RAISE EXCEPTION 'Human face verification must pass before submitting KYC';
  END IF;

  -- Update session to 'submitted' status awaiting CMS admin review
  UPDATE public.kyc_sessions
  SET
    status = 'submitted',
    face_verified = p_face_verified,
    face_confidence = p_face_confidence,
    face_metrics = p_face_metrics,
    submitted_at = now()
  WHERE id = p_session_id
  RETURNING * INTO v_session;

  -- Update user profile to 'submitted' status (NOT approved, NOT verified)
  UPDATE public.user_profiles
  SET
    kyc_status = 'submitted',
    verified = false
  WHERE id = p_user_id;

  -- Emit audit domain event
  PERFORM public.emit_domain_event(
    p_user_id,
    'kyc_session',
    p_session_id,
    'kyc_submitted',
    'kyc',
    jsonb_build_object(
      'user_id', p_user_id,
      'session_id', p_session_id,
      'aadhaar_reference_id', v_session.aadhaar_reference_id,
      'face_verified', p_face_verified,
      'face_confidence', p_face_confidence,
      'pan_status', v_session.pan_verification_status,
      'submitted_at', now()
    )
  );

  RETURN v_session;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_sandbox_kyc(uuid, uuid, boolean, numeric, jsonb) TO authenticated;

-- 3b. Restrict complete_sandbox_kyc to admin-only (revoke from authenticated users to prevent client self-approval)
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
  -- Strict authorization check: caller MUST be an admin or service_role
  IF public.get_system_role() <> 'admin' AND current_user <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: Only CMS administrators can approve KYC sessions directly.';
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

  -- Emit domain event
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
      'pan_status', v_session.pan_verification_status
    )
  );

  RETURN v_session;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_sandbox_kyc(uuid, uuid) FROM public, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_sandbox_kyc(uuid, uuid) TO service_role;

-- 4. Update cms_review_kyc to support both v2 Sandbox sessions and legacy v1 sessions
CREATE OR REPLACE FUNCTION public.cms_review_kyc(
  p_actor_id uuid,
  p_session_id uuid,
  p_action text,
  p_reason text DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_session public.kyc_sessions%ROWTYPE;
  v_missing_documents text[];
  v_address_text text;
BEGIN
  PERFORM public.assert_cms_admin(p_actor_id);
  SELECT * INTO v_session FROM public.kyc_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'KYC session not found'; END IF;

  IF p_action = 'approved' THEN
    -- For Sandbox v2 flow: require Aadhaar verified + selfie uploaded
    IF COALESCE(v_session.kyc_flow_version, 1) = 2 THEN
      IF v_session.aadhaar_verification_status <> 'verified' THEN
        RAISE EXCEPTION 'Aadhaar verification is required before approving KYC';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.kyc_documents
        WHERE session_id = p_session_id AND document_type = 'selfie'
      ) AND v_session.selfie_url IS NULL THEN
        RAISE EXCEPTION 'Selfie document is required before approving KYC';
      END IF;
    ELSE
      -- Legacy v1 flow: require id_front and selfie
      SELECT array_agg(required_type) INTO v_missing_documents
      FROM unnest(array['id_front', 'selfie']) required_type
      WHERE NOT EXISTS (
        SELECT 1 FROM public.kyc_documents
        WHERE session_id = p_session_id AND document_type = required_type
      );
      IF COALESCE(array_length(v_missing_documents, 1), 0) > 0 THEN
        RAISE EXCEPTION 'Missing required documents: %', array_to_string(v_missing_documents, ', ');
      END IF;
    END IF;

    -- Build verified address string if available
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

    UPDATE public.kyc_sessions
    SET status = 'approved',
        selfie_status = 'verified',
        rejection_reason = NULL,
        reviewed_by = p_actor_id,
        reviewed_at = now()
    WHERE id = p_session_id;

    UPDATE public.user_profiles
    SET kyc_status = 'approved',
        verified = true,
        is_aadhaar_verified = TRUE,
        is_address_verified = TRUE,
        verified_address = COALESCE(v_address_text, verified_address),
        full_name = COALESCE(NULLIF(v_session.aadhaar_name, ''), full_name)
    WHERE id = v_session.user_id;

  ELSIF p_action = 'rejected' THEN
    IF length(trim(COALESCE(p_reason, ''))) < 10 THEN
      RAISE EXCEPTION 'Rejection reason must be at least 10 characters';
    END IF;
    UPDATE public.kyc_sessions
    SET status = 'rejected',
        rejection_reason = p_reason,
        reviewed_by = p_actor_id,
        reviewed_at = now()
    WHERE id = p_session_id;

    UPDATE public.user_profiles
    SET kyc_status = 'rejected',
        verified = false
    WHERE id = v_session.user_id;

  ELSIF p_action = 'requested_resubmission' THEN
    IF length(trim(COALESCE(p_reason, ''))) < 10 THEN
      RAISE EXCEPTION 'Reason must be at least 10 characters';
    END IF;
    UPDATE public.kyc_sessions
    SET status = 'pending',
        rejection_reason = p_reason,
        submission_attempt = COALESCE(submission_attempt, 1) + 1,
        reviewed_by = p_actor_id,
        reviewed_at = now()
    WHERE id = p_session_id;

    UPDATE public.user_profiles
    SET kyc_status = 'pending',
        verified = false
    WHERE id = v_session.user_id;

  ELSIF p_action = 'note_added' THEN
    IF length(trim(COALESCE(p_note, ''))) = 0 THEN
      RAISE EXCEPTION 'Note cannot be empty';
    END IF;
    UPDATE public.kyc_sessions
    SET reviewer_notes = p_note
    WHERE id = p_session_id;

  ELSE
    RAISE EXCEPTION 'Invalid KYC review action';
  END IF;

  INSERT INTO public.kyc_review_history (session_id, reviewer_id, action, reason, notes)
  VALUES (p_session_id, p_actor_id, p_action, p_reason, p_note);

  INSERT INTO public.audit_events (actor_id, entity_type, entity_id, event_type, payload)
  VALUES (
    p_actor_id,
    'kyc_session',
    p_session_id,
    'kyc.' || p_action,
    jsonb_build_object('user_id', v_session.user_id, 'reason', p_reason)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cms_review_kyc(uuid, uuid, text, text, text) TO service_role, authenticated;
