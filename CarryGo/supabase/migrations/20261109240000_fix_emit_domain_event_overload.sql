-- Migration: 20261109240000_fix_emit_domain_event_overload.sql
-- Description: Add overload for public.emit_domain_event to support 3-argument calls and ensure create_request_command resilience.

CREATE OR REPLACE FUNCTION public.emit_domain_event(
  p_actor_id uuid,
  p_event_type text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM public.emit_domain_event(
    p_actor_id,
    'domain_event',
    COALESCE((p_payload->>'request_id')::uuid, (p_payload->>'id')::uuid, p_actor_id),
    p_event_type,
    p_event_type,
    p_payload
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.emit_domain_event(uuid, text, jsonb) TO authenticated, service_role;

