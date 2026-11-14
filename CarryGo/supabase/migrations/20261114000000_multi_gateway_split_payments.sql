-- Multi-gateway payment system with split payments
-- Supports Razorpay, PhonePe, PayU with CMS-configurable commission splits
-- All gateway credentials and commission rates managed via CMS (app_config + payment_gateway_credentials)

-- ============================================================
-- 1. Payment gateway credentials table (service_role only)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_gateway_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway TEXT NOT NULL UNIQUE CHECK (gateway IN ('razorpay', 'phonepe', 'payu')),
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_test_mode BOOLEAN NOT NULL DEFAULT true,
  -- Live credentials
  live_key_id TEXT DEFAULT '',
  live_key_secret TEXT DEFAULT '',
  live_merchant_id TEXT DEFAULT '',
  live_webhook_secret TEXT DEFAULT '',
  -- Test / sandbox credentials
  test_key_id TEXT DEFAULT '',
  test_key_secret TEXT DEFAULT '',
  test_merchant_id TEXT DEFAULT '',
  test_webhook_secret TEXT DEFAULT '',
  -- PhonePe specific fields
  salt_key TEXT DEFAULT '',
  salt_index TEXT DEFAULT '1',
  -- Arbitrary gateway-specific config (callback URLs, payout mode, etc.)
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Hard lock: only service_role can touch this table
REVOKE ALL ON public.payment_gateway_credentials FROM public, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_gateway_credentials TO service_role;

-- Seed rows so CMS always has something to render
INSERT INTO public.payment_gateway_credentials (gateway, is_active, is_test_mode)
VALUES
  ('razorpay', true,  true),
  ('phonepe',  false, true),
  ('payu',     false, true)
ON CONFLICT (gateway) DO NOTHING;

-- ============================================================
-- 2. Add split-payment & gateway-agnostic columns to payments
-- ============================================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS gateway_provider    TEXT         DEFAULT 'razorpay',
  ADD COLUMN IF NOT EXISTS gateway_order_id    TEXT,
  ADD COLUMN IF NOT EXISTS gateway_payment_id  TEXT,
  ADD COLUMN IF NOT EXISTS platform_fee        NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_amount          NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS traveler_payout     NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payout_status       TEXT         DEFAULT 'pending'
    CHECK (payout_status IN ('pending', 'processing', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS payout_reference    TEXT,
  ADD COLUMN IF NOT EXISTS payout_completed_at TIMESTAMPTZ;

-- Back-fill from legacy razorpay-specific columns
UPDATE public.payments
SET gateway_order_id   = razorpay_order_id,
    gateway_payment_id = razorpay_payment_id,
    gateway_provider   = 'razorpay'
WHERE razorpay_order_id IS NOT NULL
  AND gateway_order_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_payments_gateway_order
  ON public.payments (gateway_provider, gateway_order_id)
  WHERE gateway_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_payout_status
  ON public.payments (payout_status)
  WHERE payout_status IN ('pending', 'processing');

-- ============================================================
-- 3. Gateway-agnostic payment_orders table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         TEXT        NOT NULL,
  gateway          TEXT        NOT NULL CHECK (gateway IN ('razorpay', 'phonepe', 'payu')),
  request_id       UUID        NOT NULL,
  sender_id        UUID        NOT NULL,
  amount_paise     BIGINT      NOT NULL CHECK (amount_paise > 0),
  currency         TEXT        NOT NULL DEFAULT 'INR',
  status           TEXT        NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'verified', 'failed', 'expired')),
  -- Pre-computed split (in paise) so webhook can finalize without re-reading config
  platform_fee_paise     BIGINT DEFAULT 0,
  gst_paise              BIGINT DEFAULT 0,
  traveler_payout_paise  BIGINT DEFAULT 0,
  -- Raw gateway response for audit / debugging
  gateway_response JSONB       NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id, gateway)
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_request  ON public.payment_orders (request_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_sender   ON public.payment_orders (sender_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_created  ON public.payment_orders (status) WHERE status = 'created';

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_orders_service_all
  ON public.payment_orders FOR ALL TO service_role USING (true);

CREATE POLICY payment_orders_sender_select
  ON public.payment_orders FOR SELECT TO authenticated
  USING (sender_id = auth.uid());

-- ============================================================
-- 4. calculate_payment_split(amount) — reads app_config live
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_payment_split(p_amount NUMERIC)
RETURNS TABLE (
  total_amount    NUMERIC,
  platform_fee    NUMERIC,
  gst_amount      NUMERIC,
  traveler_payout NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commission_pct  NUMERIC;
  v_min_commission  NUMERIC;
  v_max_commission  NUMERIC;
  v_gst_pct         NUMERIC;
  v_raw_commission  NUMERIC;
  v_fee             NUMERIC;
  v_gst             NUMERIC;
BEGIN
  SELECT coalesce((SELECT value::NUMERIC FROM app_config WHERE key = 'platform_commission_percent'), 15) INTO v_commission_pct;
  SELECT coalesce((SELECT value::NUMERIC FROM app_config WHERE key = 'min_commission_amount'),        10) INTO v_min_commission;
  SELECT coalesce((SELECT value::NUMERIC FROM app_config WHERE key = 'max_commission_amount'),       500) INTO v_max_commission;
  SELECT coalesce((SELECT value::NUMERIC FROM app_config WHERE key = 'gst_percent'),                  18) INTO v_gst_pct;

  v_raw_commission := p_amount * v_commission_pct / 100;
  v_fee := GREATEST(v_min_commission, LEAST(v_max_commission, v_raw_commission));
  v_fee := ROUND(v_fee, 2);
  v_gst := ROUND(v_fee * v_gst_pct / 100, 2);

  RETURN QUERY SELECT
    p_amount,
    v_fee,
    v_gst,
    ROUND(p_amount - v_fee - v_gst, 2);
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_payment_split(NUMERIC) TO service_role;
-- Also grant to authenticated so the app can show the split preview
GRANT EXECUTE ON FUNCTION public.calculate_payment_split(NUMERIC) TO authenticated;

-- ============================================================
-- 5. finalize_gateway_payment — gateway-agnostic payment finalization
-- ============================================================
CREATE OR REPLACE FUNCTION public.finalize_gateway_payment(
  p_order_id   TEXT,
  p_payment_id TEXT,
  p_gateway    TEXT DEFAULT 'razorpay'
)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_order   public.payment_orders%rowtype;
  v_request public.requests%rowtype;
  v_payment public.payments%rowtype;
  v_split   RECORD;
  v_amount  NUMERIC;
BEGIN
  -- Lock the order row
  SELECT * INTO v_order
  FROM public.payment_orders
  WHERE order_id = p_order_id AND gateway = p_gateway
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Backward compat: fall through to legacy razorpay_orders table
    IF p_gateway = 'razorpay' THEN
      RETURN (SELECT public.finalize_razorpay_payment(p_order_id, p_payment_id));
    END IF;
    RAISE EXCEPTION 'Payment order not found';
  END IF;

  -- Idempotent: if already verified, return existing payment
  IF v_order.status = 'verified' THEN
    SELECT * INTO v_payment
    FROM public.payments
    WHERE gateway_order_id = p_order_id AND gateway_provider = p_gateway;
    IF FOUND AND v_payment.gateway_payment_id = p_payment_id THEN
      RETURN v_payment;
    END IF;
    RAISE EXCEPTION 'Payment order has already been used';
  END IF;

  IF v_order.status = 'failed' THEN
    RAISE EXCEPTION 'Payment order has been marked as failed';
  END IF;

  -- Validate request integrity
  SELECT * INTO v_request
  FROM public.requests
  WHERE id = v_order.request_id
  FOR UPDATE;

  IF NOT FOUND OR v_request.sender_id IS DISTINCT FROM v_order.sender_id THEN
    RAISE EXCEPTION 'Payment request is invalid';
  END IF;

  IF v_request.status <> 'accepted' THEN
    RAISE EXCEPTION 'Request is no longer in accepted state';
  END IF;

  IF ROUND(v_request.price * 100)::BIGINT <> v_order.amount_paise THEN
    RAISE EXCEPTION 'Payment amount does not match request price';
  END IF;

  -- Calculate split from live config
  v_amount := v_request.price;
  SELECT * INTO v_split FROM public.calculate_payment_split(v_amount);

  -- Insert payment row with full split details
  INSERT INTO public.payments (
    request_id, sender_id, traveller_id, amount, status,
    razorpay_order_id, razorpay_payment_id,
    gateway_provider, gateway_order_id, gateway_payment_id,
    platform_fee, gst_amount, traveler_payout, payout_status
  ) VALUES (
    v_request.id,
    v_request.sender_id,
    v_request.traveller_id,
    v_amount,
    'locked',
    CASE WHEN p_gateway = 'razorpay' THEN p_order_id   ELSE NULL END,
    CASE WHEN p_gateway = 'razorpay' THEN p_payment_id ELSE NULL END,
    p_gateway,
    p_order_id,
    p_payment_id,
    v_split.platform_fee,
    v_split.gst_amount,
    v_split.traveler_payout,
    'pending'
  ) RETURNING * INTO v_payment;

  -- Mark order verified and store computed splits
  UPDATE public.payment_orders
  SET status                = 'verified',
      platform_fee_paise    = ROUND(v_split.platform_fee    * 100)::BIGINT,
      gst_paise             = ROUND(v_split.gst_amount      * 100)::BIGINT,
      traveler_payout_paise = ROUND(v_split.traveler_payout * 100)::BIGINT,
      updated_at            = now()
  WHERE id = v_order.id;

  RETURN v_payment;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_gateway_payment(TEXT, TEXT, TEXT) TO service_role;

-- ============================================================
-- 6. Cleanup stale payment_orders (mirrors razorpay_orders cleanup)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_stale_payment_orders(
  p_stale_after INTERVAL DEFAULT interval '30 minutes'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  UPDATE public.payment_orders
  SET status = 'expired', updated_at = now()
  WHERE status = 'created'
    AND created_at < now() - p_stale_after;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_stale_payment_orders(INTERVAL) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_payment_orders(INTERVAL) TO service_role;

-- ============================================================
-- 7. CMS helper: fetch active gateway credentials
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_active_gateway()
RETURNS TABLE (
  gateway          TEXT,
  is_test_mode     BOOLEAN,
  key_id           TEXT,
  key_secret       TEXT,
  merchant_id      TEXT,
  webhook_secret   TEXT,
  salt_key         TEXT,
  salt_index       TEXT,
  config           JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cred public.payment_gateway_credentials%rowtype;
BEGIN
  SELECT * INTO v_cred
  FROM public.payment_gateway_credentials
  WHERE is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    -- Fallback to razorpay
    SELECT * INTO v_cred
    FROM public.payment_gateway_credentials
    WHERE gateway = 'razorpay'
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No payment gateway configured';
  END IF;

  RETURN QUERY SELECT
    v_cred.gateway,
    v_cred.is_test_mode,
    CASE WHEN v_cred.is_test_mode THEN v_cred.test_key_id       ELSE v_cred.live_key_id       END,
    CASE WHEN v_cred.is_test_mode THEN v_cred.test_key_secret   ELSE v_cred.live_key_secret   END,
    CASE WHEN v_cred.is_test_mode THEN v_cred.test_merchant_id  ELSE v_cred.live_merchant_id  END,
    CASE WHEN v_cred.is_test_mode THEN v_cred.test_webhook_secret ELSE v_cred.live_webhook_secret END,
    v_cred.salt_key,
    v_cred.salt_index,
    v_cred.config;
END;
$$;

REVOKE ALL ON FUNCTION public.get_active_gateway() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_gateway() TO service_role;

-- ============================================================
-- 8. app_config table + seed defaults
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Restrict to service_role (CMS / edge functions only)
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'app_config' AND policyname = 'app_config_service_all'
  ) THEN
    CREATE POLICY app_config_service_all ON public.app_config FOR ALL TO service_role USING (true);
  END IF;
END $$;

INSERT INTO public.app_config (key, value)
VALUES
  ('payment_gateway',             'razorpay'),
  ('platform_commission_percent', '15'),
  ('min_commission_amount',       '10'),
  ('max_commission_amount',       '500'),
  ('gst_percent',                 '18'),
  ('auto_release_hours',          '48')
ON CONFLICT (key) DO NOTHING;
