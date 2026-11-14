-- Payout settlement flow
-- Updates release_payment_atomic to set payout_status = 'processing'
-- Adds admin payout management functions

-- ============================================================
-- 1. Update release_payment_atomic to set payout_status on release
--    Preserves existing auth.uid() check, delivery verification, and domain event
-- ============================================================
CREATE OR REPLACE FUNCTION public.release_payment_atomic(
  p_payment_id uuid,
  p_actor_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_payment public.payments%rowtype;
  v_delivery public.deliveries%rowtype;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = 'P0003';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found' USING errcode = 'P0002';
  END IF;

  IF v_payment.status <> 'locked' THEN
    RAISE EXCEPTION 'Payment not found or already processed' USING errcode = 'P0002';
  END IF;

  -- Only assigned traveller can release funds
  IF v_payment.traveller_id <> v_actor_id THEN
    RAISE EXCEPTION 'unauthorized: only the assigned traveller can release' USING errcode = 'P0003';
  END IF;

  -- Ensure delivery is actually completed and verified
  SELECT * INTO v_delivery
  FROM public.deliveries
  WHERE request_id = v_payment.request_id;

  IF NOT FOUND OR NOT v_delivery.delivery_confirmed OR v_delivery.status <> 'delivered' THEN
    RAISE EXCEPTION 'Payment cannot be released until delivery confirmation is verified' USING errcode = 'P0001';
  END IF;

  UPDATE public.payments
  SET status = 'released',
      released_at = now(),
      payout_status = 'processing'
  WHERE id = p_payment_id
    AND status = 'locked';

  PERFORM public.emit_domain_event(
    v_actor_id,
    'payment',
    p_payment_id,
    'payment_released',
    'payment.released',
    jsonb_build_object(
      'payment_id', p_payment_id,
      'sender_id', v_payment.sender_id,
      'traveller_id', v_payment.traveller_id,
      'amount', v_payment.amount
    )
  );

  RETURN true;
END;
$$;

-- ============================================================
-- 2. Admin: mark payout completed (after manual transfer or gateway confirmation)
-- ============================================================
CREATE OR REPLACE FUNCTION public.mark_payout_completed(
  p_payment_id UUID,
  p_payout_reference TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE payments
  SET payout_status = 'completed',
      payout_reference = COALESCE(p_payout_reference, payout_reference),
      payout_completed_at = NOW()
  WHERE id = p_payment_id
    AND status = 'released'
    AND payout_status IN ('pending', 'processing', 'failed');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found or not eligible for payout completion';
  END IF;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_payout_completed(UUID, TEXT) TO service_role;

-- ============================================================
-- 3. Admin: mark payout failed (for retry)
-- ============================================================
CREATE OR REPLACE FUNCTION public.mark_payout_failed(
  p_payment_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE payments
  SET payout_status = 'failed',
      payout_reference = COALESCE(p_reason, payout_reference)
  WHERE id = p_payment_id
    AND status = 'released'
    AND payout_status IN ('processing', 'pending');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found or not eligible for failure marking';
  END IF;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_payout_failed(UUID, TEXT) TO service_role;

-- ============================================================
-- 4. Admin: retry payout (reset to processing)
-- ============================================================
CREATE OR REPLACE FUNCTION public.retry_payout(
  p_payment_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE payments
  SET payout_status = 'processing',
      payout_reference = NULL
  WHERE id = p_payment_id
    AND status = 'released'
    AND payout_status = 'failed';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found or not eligible for payout retry';
  END IF;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.retry_payout(UUID) TO service_role;

-- ============================================================
-- 5. CMS helper: payout summary stats
-- ============================================================
CREATE OR REPLACE FUNCTION public.cms_payout_summary()
RETURNS TABLE (
  total_pending    BIGINT,
  total_processing BIGINT,
  total_completed  BIGINT,
  total_failed     BIGINT,
  sum_pending      NUMERIC,
  sum_processing   NUMERIC,
  sum_completed    NUMERIC,
  sum_failed       NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE payout_status = 'pending')    AS total_pending,
    COUNT(*) FILTER (WHERE payout_status = 'processing') AS total_processing,
    COUNT(*) FILTER (WHERE payout_status = 'completed')  AS total_completed,
    COUNT(*) FILTER (WHERE payout_status = 'failed')     AS total_failed,
    COALESCE(SUM(traveler_payout) FILTER (WHERE payout_status = 'pending'),    0) AS sum_pending,
    COALESCE(SUM(traveler_payout) FILTER (WHERE payout_status = 'processing'), 0) AS sum_processing,
    COALESCE(SUM(traveler_payout) FILTER (WHERE payout_status = 'completed'),  0) AS sum_completed,
    COALESCE(SUM(traveler_payout) FILTER (WHERE payout_status = 'failed'),     0) AS sum_failed
  FROM payments
  WHERE status = 'released';
$$;

GRANT EXECUTE ON FUNCTION public.cms_payout_summary() TO service_role;
