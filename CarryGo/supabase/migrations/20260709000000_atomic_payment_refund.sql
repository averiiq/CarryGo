-- Atomic payment refund to prevent race conditions (double-refund)
-- Uses SELECT FOR UPDATE to lock the row during the transaction

CREATE OR REPLACE FUNCTION public.refund_payment_atomic(
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
  SELECT id, sender_id, status
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

  IF v_payment.sender_id != p_actor_id THEN
    RAISE EXCEPTION 'unauthorized: only the sender can refund' USING ERRCODE = 'P0003';
  END IF;

  UPDATE payments
  SET status = 'refunded'
  WHERE id = p_payment_id
    AND status = 'locked';

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refund_payment_atomic(UUID, UUID) TO authenticated;
