-- Mobile user-event logging RPC
--
-- Most mobile mutations go through security-definer RPCs (request status
-- transitions, delivery OTP, payments) that already write audit_events. But
-- non-RPC actions (support ticket opened, profile viewed, deep-link
-- followed) are invisible to the CMS audit log today.
--
-- This RPC lets an authenticated user append an audit row for their OWN
-- actions. Actor is pinned to auth.uid() — no spoofing. Event types are
-- prefixed with `user.` to distinguish from admin.* and system.* entries.

CREATE OR REPLACE FUNCTION public.log_user_event(
  p_event_type text,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_event_type IS NULL OR length(trim(p_event_type)) = 0 THEN
    RAISE EXCEPTION 'event_type is required';
  END IF;

  -- Namespace: user.* reserved for mobile-originated events.
  IF p_event_type NOT LIKE 'user.%' THEN
    p_event_type := 'user.' || p_event_type;
  END IF;

  INSERT INTO public.audit_events (actor_id, entity_type, entity_id, event_type, payload)
  VALUES (
    v_uid,
    COALESCE(p_entity_type, 'user'),
    COALESCE(p_entity_id, v_uid),
    p_event_type,
    COALESCE(p_payload, '{}'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_user_event(text, text, uuid, jsonb) TO authenticated;
