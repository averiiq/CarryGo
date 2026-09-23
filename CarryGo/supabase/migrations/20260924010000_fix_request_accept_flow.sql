-- Migration: 20260924010000_fix_request_accept_flow.sql
-- Description: Fix ambiguous column references (parcels.id, trips.id) and harden recipient resolution in transition_request_status

DROP FUNCTION IF EXISTS public.transition_request_status(uuid, public.request_status);
CREATE OR REPLACE FUNCTION public.transition_request_status(
  p_request_id uuid,
  p_next_status public.request_status
)
RETURNS TABLE (
  id uuid,
  parcel_id uuid,
  trip_id uuid,
  sender_id uuid,
  sender_name text,
  traveller_id uuid,
  traveller_name text,
  status public.request_status,
  price numeric,
  message text,
  created_at timestamptz,
  updated_at timestamptz,
  created_by uuid,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
#variable_conflict use_column
DECLARE
  v_actor_id uuid := auth.uid();
  v_request public.requests%rowtype;
  v_updated public.requests%rowtype;
  v_creator_id uuid;
  v_intended_recipient uuid;
  v_parcel public.parcels%rowtype;
  v_trip public.trips%rowtype;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Row-level lock to prevent concurrent races
  SELECT *
    INTO v_request
    FROM public.requests r
   WHERE r.id = p_request_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  -- Verify actor is involved in this request
  IF v_actor_id <> v_request.sender_id AND v_actor_id <> v_request.traveller_id THEN
    INSERT INTO public.security_audit_logs (event_type, resource_type, resource_id, actor_id, intended_recipient_id, reason, metadata)
    VALUES ('REQUEST_UNAUTHORIZED_ACCESS', 'request', v_request.id, v_actor_id, v_request.traveller_id, 'Actor is neither sender nor traveller', jsonb_build_object('next_status', p_next_status));
    RAISE EXCEPTION 'You are not authorized to update this request';
  END IF;

  -- Intended recipient is the counterparty to whoever created the request
  v_creator_id := coalesce(v_request.created_by, v_request.sender_id);
  v_intended_recipient := CASE
    WHEN v_creator_id = v_request.sender_id THEN v_request.traveller_id
    ELSE v_request.sender_id
  END;

  IF p_next_status = 'accepted' THEN
    IF v_request.status <> 'pending' THEN
      RAISE EXCEPTION 'Only pending requests can be accepted. Current status is %', v_request.status;
    END IF;

    IF v_request.expires_at IS NOT NULL AND v_request.expires_at < now() THEN
      RAISE EXCEPTION 'Request has expired and cannot be accepted';
    END IF;

    -- CRITICAL: Requester CANNOT accept their own request
    IF v_actor_id = v_creator_id THEN
      INSERT INTO public.security_audit_logs (event_type, resource_type, resource_id, actor_id, intended_recipient_id, reason, metadata)
      VALUES ('REQUEST_ACCEPT_DENIED', 'request', v_request.id, v_actor_id, v_intended_recipient, 'Requester attempted to accept own outgoing request', jsonb_build_object('created_by', v_creator_id));
      RAISE EXCEPTION 'You cannot accept your own request. Only the recipient can accept';
    END IF;

    -- CRITICAL: Only intended recipient can accept
    IF v_actor_id <> v_intended_recipient THEN
      INSERT INTO public.security_audit_logs (event_type, resource_type, resource_id, actor_id, intended_recipient_id, reason, metadata)
      VALUES ('REQUEST_ACCEPT_DENIED', 'request', v_request.id, v_actor_id, v_intended_recipient, 'Unauthorized user attempted to accept request', jsonb_build_object('intended_recipient', v_intended_recipient));
      RAISE EXCEPTION 'Only the intended recipient can accept this request';
    END IF;

    SELECT * INTO v_parcel FROM public.parcels p WHERE p.id = v_request.parcel_id FOR UPDATE;
    SELECT * INTO v_trip FROM public.trips t WHERE t.id = v_request.trip_id FOR UPDATE;

    IF v_parcel.status NOT IN ('open', 'matched') THEN
      RAISE EXCEPTION 'Parcel is no longer available';
    END IF;
    IF v_trip.status <> 'active' THEN
      RAISE EXCEPTION 'Trip is no longer active';
    END IF;

    IF EXISTS (
      SELECT 1
        FROM public.requests sibling
       WHERE sibling.parcel_id = v_request.parcel_id
         AND sibling.id <> v_request.id
         AND sibling.status = 'accepted'
    ) THEN
      RAISE EXCEPTION 'Another traveller has already been accepted for this parcel';
    END IF;

    UPDATE public.requests r2
       SET status = 'accepted',
           updated_at = now()
     WHERE r2.id = v_request.id
     RETURNING * INTO v_updated;

    UPDATE public.requests r3
       SET status = 'rejected',
           updated_at = now()
     WHERE r3.parcel_id = v_request.parcel_id
       AND r3.id <> v_request.id
       AND r3.status = 'pending';

    UPDATE public.parcels p
       SET status = 'matched',
           updated_at = now()
     WHERE p.id = v_request.parcel_id;

    INSERT INTO public.deliveries (request_id, otp_hash)
    VALUES (v_request.id, public.generate_delivery_otp_hash())
    ON CONFLICT (request_id) DO NOTHING;

    PERFORM public.emit_domain_event(
      v_actor_id,
      'request',
      v_updated.id,
      'request_accepted',
      'request.accepted',
      jsonb_build_object('request_id', v_updated.id, 'parcel_id', v_updated.parcel_id, 'trip_id', v_updated.trip_id)
    );

  ELSIF p_next_status = 'rejected' THEN
    IF v_request.status <> 'pending' THEN
      RAISE EXCEPTION 'Only pending requests can be rejected';
    END IF;

    IF v_actor_id = v_creator_id THEN
      RAISE EXCEPTION 'You cannot reject your own request. Use cancel instead';
    END IF;

    IF v_actor_id <> v_intended_recipient THEN
      INSERT INTO public.security_audit_logs (event_type, resource_type, resource_id, actor_id, intended_recipient_id, reason)
      VALUES ('REQUEST_REJECT_DENIED', 'request', v_request.id, v_actor_id, v_intended_recipient, 'Unauthorized user attempted to reject request');
      RAISE EXCEPTION 'Only the intended recipient can reject this request';
    END IF;

    UPDATE public.requests r2
       SET status = 'rejected',
           updated_at = now()
     WHERE r2.id = v_request.id
     RETURNING * INTO v_updated;

    PERFORM public.emit_domain_event(
      v_actor_id,
      'request',
      v_updated.id,
      'request_rejected',
      'request.rejected',
      jsonb_build_object('request_id', v_updated.id, 'parcel_id', v_updated.parcel_id, 'trip_id', v_updated.trip_id)
    );

  ELSIF p_next_status = 'cancelled' THEN
    IF v_request.status <> 'pending' THEN
      RAISE EXCEPTION 'Only pending requests can be cancelled';
    END IF;

    IF v_actor_id <> v_creator_id THEN
      INSERT INTO public.security_audit_logs (event_type, resource_type, resource_id, actor_id, intended_recipient_id, reason)
      VALUES ('REQUEST_CANCEL_DENIED', 'request', v_request.id, v_actor_id, v_creator_id, 'Non-creator attempted to cancel request');
      RAISE EXCEPTION 'Only the user who sent this request can cancel it';
    END IF;

    UPDATE public.requests r2
       SET status = 'cancelled',
           updated_at = now()
     WHERE r2.id = v_request.id
     RETURNING * INTO v_updated;

    PERFORM public.emit_domain_event(
      v_actor_id,
      'request',
      v_updated.id,
      'request_cancelled',
      'request.cancelled',
      jsonb_build_object('request_id', v_updated.id, 'parcel_id', v_updated.parcel_id, 'trip_id', v_updated.trip_id)
    );

  ELSIF p_next_status = 'completed' THEN
    IF v_request.status <> 'accepted' THEN
      RAISE EXCEPTION 'Only accepted requests can be completed';
    END IF;
    IF v_actor_id <> v_request.traveller_id THEN
      RAISE EXCEPTION 'Only the assigned traveller can complete this request';
    END IF;

    UPDATE public.requests r2
       SET status = 'completed',
           updated_at = now()
     WHERE r2.id = v_request.id
     RETURNING * INTO v_updated;

    UPDATE public.parcels p
       SET status = 'delivered'
     WHERE p.id = v_updated.parcel_id;

    UPDATE public.trips t
       SET available_capacity = greatest(0, t.available_capacity - (
         SELECT p2.weight FROM public.parcels p2 WHERE p2.id = v_updated.parcel_id
       ))
     WHERE t.id = v_updated.trip_id;

    PERFORM public.emit_domain_event(
      v_actor_id,
      'request',
      v_updated.id,
      'request_completed',
      'request.completed',
      jsonb_build_object('request_id', v_updated.id, 'parcel_id', v_updated.parcel_id, 'trip_id', v_updated.trip_id)
    );

  ELSIF p_next_status = 'failed' THEN
    IF v_request.status <> 'accepted' THEN
      RAISE EXCEPTION 'Only accepted requests can fail';
    END IF;
    IF v_actor_id <> v_request.sender_id AND v_actor_id <> v_request.traveller_id THEN
      RAISE EXCEPTION 'Only sender or traveller can mark this request as failed';
    END IF;

    UPDATE public.requests r2
       SET status = 'failed',
           updated_at = now()
     WHERE r2.id = v_request.id
     RETURNING * INTO v_updated;

    UPDATE public.parcels p
       SET status = 'open'
     WHERE p.id = v_updated.parcel_id;

    PERFORM public.emit_domain_event(
      v_actor_id,
      'request',
      v_updated.id,
      'request_failed',
      'request.failed',
      jsonb_build_object('request_id', v_updated.id, 'parcel_id', v_updated.parcel_id, 'trip_id', v_updated.trip_id)
    );

  ELSE
    RAISE EXCEPTION 'Unsupported request transition to %', p_next_status;
  END IF;

  RETURN QUERY
    SELECT
      v_updated.id,
      v_updated.parcel_id,
      v_updated.trip_id,
      v_updated.sender_id,
      v_updated.sender_name,
      v_updated.traveller_id,
      v_updated.traveller_name,
      v_updated.status,
      v_updated.price,
      v_updated.message,
      v_updated.created_at,
      v_updated.updated_at,
      v_updated.created_by,
      v_updated.expires_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transition_request_status(uuid, public.request_status) TO authenticated;
