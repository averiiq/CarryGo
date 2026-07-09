-- Atomic payment release to prevent race conditions (double-release)
-- Uses SELECT FOR UPDATE to lock the row during the transaction

CREATE OR REPLACE FUNCTION public.release_payment_atomic(
  p_payment_id UUID,
  p_actor_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
BEGIN
  -- Lock the row for update to prevent concurrent releases
  SELECT id, traveller_id, status
  INTO v_payment
  FROM payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF v_payment IS NULL THEN
    RAISE EXCEPTION 'Payment not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_payment.status != 'locked' THEN
    RAISE EXCEPTION 'Payment not found or already processed' USING ERRCODE = 'P0002';
  END IF;

  IF v_payment.traveller_id != p_actor_id THEN
    RAISE EXCEPTION 'unauthorized: only the traveller can release' USING ERRCODE = 'P0003';
  END IF;

  UPDATE payments
  SET status = 'released',
      released_at = NOW()
  WHERE id = p_payment_id
    AND status = 'locked';

  RETURN TRUE;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.release_payment_atomic(UUID, UUID) TO authenticated;
