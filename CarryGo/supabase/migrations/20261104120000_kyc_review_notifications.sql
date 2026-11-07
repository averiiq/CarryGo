-- KYC review notifications
--
-- Previously cms_review_kyc only wrote audit_events and updated status rows.
-- The mobile app never got a push when an admin approved, rejected, or asked
-- for resubmission — users had to open the app and check manually.
--
-- This migration extends cms_review_kyc to emit outbox_events and inserts
-- into the notifications table so the existing outbox + push pipeline
-- delivers a notification to the affected user.

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
  v_title text;
  v_body text;
  v_notif_type text;
BEGIN
  PERFORM public.assert_cms_admin(p_actor_id);
  SELECT * INTO v_session FROM public.kyc_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'KYC session not found'; END IF;

  IF p_action = 'approved' THEN
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

    v_notif_type := 'kyc_approved';
    v_title := 'Identity verified';
    v_body := 'Your KYC is approved. You can now send parcels and accept trips.';

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

    v_notif_type := 'kyc_rejected';
    v_title := 'KYC was not approved';
    v_body := 'Reason: ' || left(p_reason, 160);

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

    v_notif_type := 'kyc_resubmission';
    v_title := 'Please resubmit KYC';
    v_body := 'Reason: ' || left(p_reason, 160);

  ELSIF p_action = 'note_added' THEN
    IF length(trim(COALESCE(p_note, ''))) = 0 THEN
      RAISE EXCEPTION 'Note cannot be empty';
    END IF;
    UPDATE public.kyc_sessions
    SET reviewer_notes = p_note
    WHERE id = p_session_id;
    -- Internal note; no user notification
    v_notif_type := NULL;

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

  -- Notify the affected user (in-app row + outbox for push fanout)
  IF v_notif_type IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, type, related_id, read)
    VALUES (v_session.user_id, v_title, v_body, v_notif_type, p_session_id, false);

    INSERT INTO public.outbox_events (topic, entity_type, entity_id, payload, status)
    VALUES (
      'kyc.' || p_action,
      'kyc_session',
      p_session_id,
      jsonb_build_object(
        'user_id', v_session.user_id,
        'title', v_title,
        'body', v_body,
        'type', v_notif_type,
        'reason', p_reason
      ),
      'pending'
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cms_review_kyc(uuid, uuid, text, text, text) TO service_role, authenticated;
