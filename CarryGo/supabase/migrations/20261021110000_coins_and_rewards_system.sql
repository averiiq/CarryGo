-- Migration: Coins & Rewards System for Travelers and Senders
-- Migration: 20261021110000_coins_and_rewards_system.sql

BEGIN;

-- 1. Create user_coin_balances table
CREATE TABLE IF NOT EXISTS public.user_coin_balances (
  user_id uuid PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned integer NOT NULL DEFAULT 0 CHECK (total_earned >= 0),
  total_redeemed integer NOT NULL DEFAULT 0 CHECK (total_redeemed >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create coin_transactions table (Auditable Immutable Ledger)
CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (
    transaction_type IN (
      'delivery_reward',
      'parcel_credit_redemption',
      'coupon_redemption',
      'admin_adjustment'
    )
  ),
  amount integer NOT NULL, -- Positive for credits, negative for debits
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  reference_id text,       -- e.g. delivery_id or request_id
  reference_type text,     -- e.g. 'delivery', 'request', 'coupon', 'admin'
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Idempotency index: strictly prevent duplicate awards or double actions
CREATE UNIQUE INDEX IF NOT EXISTS idx_coin_tx_idempotency
ON public.coin_transactions (user_id, reference_id, transaction_type)
WHERE reference_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_coin_tx_user_created
ON public.coin_transactions (user_id, created_at DESC);

-- 4. Enable RLS
ALTER TABLE public.user_coin_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Balances: Users can read their own balance; system/admins can manage.
DROP POLICY IF EXISTS user_coin_balances_select_own ON public.user_coin_balances;
CREATE POLICY user_coin_balances_select_own ON public.user_coin_balances
  FOR SELECT USING (auth.uid() = user_id);

-- Transactions: Users can read their own transactions.
DROP POLICY IF EXISTS coin_transactions_select_own ON public.coin_transactions;
CREATE POLICY coin_transactions_select_own ON public.coin_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- 6. Insert default admin configuration for coin award if not present
INSERT INTO public.app_config (key, value, updated_at)
VALUES ('coin_award_per_delivery', '50', now())
ON CONFLICT (key) DO NOTHING;

-- 7. Internal function to credit coins to a user atomically
CREATE OR REPLACE FUNCTION public._credit_user_coins(
  p_user_id uuid,
  p_amount integer,
  p_tx_type text,
  p_ref_id text,
  p_ref_type text,
  p_description text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance integer := 0;
  v_new_balance integer := 0;
  v_inserted_id uuid;
BEGIN
  IF p_amount <= 0 THEN
    RETURN false;
  END IF;

  -- Ensure balance row exists with row-level lock
  INSERT INTO public.user_coin_balances (user_id, balance, total_earned, total_redeemed, updated_at)
  VALUES (p_user_id, 0, 0, 0, now())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO v_current_balance
  FROM public.user_coin_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_new_balance := coalesce(v_current_balance, 0) + p_amount;

  -- Attempt insert into transaction ledger with idempotency guard
  INSERT INTO public.coin_transactions (
    user_id, transaction_type, amount, balance_after,
    reference_id, reference_type, description, created_at
  )
  VALUES (
    p_user_id, p_tx_type, p_amount, v_new_balance,
    p_ref_id, p_ref_type, p_description, now()
  )
  ON CONFLICT (user_id, reference_id, transaction_type) WHERE reference_id IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_inserted_id;

  -- If conflict occurred (duplicate event), don't update balance
  IF v_inserted_id IS NULL THEN
    RETURN false;
  END IF;

  -- Update running balance
  UPDATE public.user_coin_balances
  SET balance = v_new_balance,
      total_earned = total_earned + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN true;
END;
$$;

-- 8. Main automated delivery award function
CREATE OR REPLACE FUNCTION public.award_delivery_coins(p_delivery_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery public.deliveries%rowtype;
  v_request public.requests%rowtype;
  v_coins_setting text;
  v_coins_amount integer := 50;
  v_traveller_credited boolean := false;
  v_sender_credited boolean := false;
BEGIN
  -- Lookup delivery
  SELECT * INTO v_delivery
  FROM public.deliveries
  WHERE id = p_delivery_id OR request_id = p_delivery_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Delivery not found');
  END IF;

  -- Must be confirmed delivered
  IF NOT (coalesce(v_delivery.delivery_confirmed, false) OR v_delivery.status = 'delivered') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Delivery is not completed');
  END IF;

  -- Lookup request
  SELECT * INTO v_request
  FROM public.requests
  WHERE id = v_delivery.request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Associated request not found');
  END IF;

  -- Read configured award amount from app_config
  SELECT value INTO v_coins_setting
  FROM public.app_config
  WHERE key = 'coin_award_per_delivery';

  IF v_coins_setting IS NOT NULL AND v_coins_setting ~ '^[0-9]+$' THEN
    v_coins_amount := v_coins_setting::integer;
  END IF;

  -- If configured amount is 0, nothing to award
  IF v_coins_amount <= 0 THEN
    RETURN jsonb_build_object('success', true, 'awarded', 0, 'message', 'Awards disabled');
  END IF;

  -- Credit Traveler
  IF v_request.traveller_id IS NOT NULL THEN
    v_traveller_credited := public._credit_user_coins(
      v_request.traveller_id,
      v_coins_amount,
      'delivery_reward',
      v_delivery.id::text,
      'delivery',
      'Delivery reward for completed parcel handover #' || substr(v_delivery.id::text, 1, 8)
    );
  END IF;

  -- Credit Sender
  IF v_request.sender_id IS NOT NULL THEN
    v_sender_credited := public._credit_user_coins(
      v_request.sender_id,
      v_coins_amount,
      'delivery_reward',
      v_delivery.id::text,
      'delivery',
      'Sender reward for completed parcel delivery #' || substr(v_delivery.id::text, 1, 8)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'coins_per_user', v_coins_amount,
    'traveller_credited', v_traveller_credited,
    'sender_credited', v_sender_credited
  );
END;
$$;

-- 9. Sender coin redemption for parcel sending credit (10 coins = Rs 1)
CREATE OR REPLACE FUNCTION public.redeem_sender_coins_for_credit(
  p_coins integer,
  p_request_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_balance_row public.user_coin_balances%rowtype;
  v_rupee_credit numeric(10, 2);
  v_new_balance integer;
  v_ref_id text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_coins IS NULL OR p_coins < 10 THEN
    RAISE EXCEPTION 'Minimum redemption is 10 coins (10 coins = ₹1)';
  END IF;

  -- Enforce integer multiple of 10 coins to eliminate fractional paise rounding
  IF p_coins % 10 <> 0 THEN
    RAISE EXCEPTION 'Coins must be redeemed in multiples of 10 (e.g. 10, 20, 50, 100)';
  END IF;

  -- Calculate exact rupee value: 10 coins = Rs 1.00
  v_rupee_credit := (p_coins / 10.0)::numeric(10, 2);

  -- Lock balance row for update
  SELECT * INTO v_balance_row
  FROM public.user_coin_balances
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_balance_row.balance < p_coins THEN
    RAISE EXCEPTION 'Insufficient coin balance. You have % coins, attempted to redeem % coins.',
      coalesce(v_balance_row.balance, 0), p_coins;
  END IF;

  v_new_balance := v_balance_row.balance - p_coins;
  v_ref_id := coalesce(p_request_id::text, 'credit_' || gen_random_uuid()::text);

  -- Deduct from balance
  UPDATE public.user_coin_balances
  SET balance = v_new_balance,
      total_redeemed = total_redeemed + p_coins,
      updated_at = now()
  WHERE user_id = v_user_id;

  -- Record redemption in ledger
  INSERT INTO public.coin_transactions (
    user_id, transaction_type, amount, balance_after,
    reference_id, reference_type, description, metadata, created_at
  )
  VALUES (
    v_user_id,
    'parcel_credit_redemption',
    -p_coins,
    v_new_balance,
    v_ref_id,
    CASE WHEN p_request_id IS NOT NULL THEN 'request' ELSE 'credit' END,
    'Redeemed ' || p_coins || ' coins for ₹' || v_rupee_credit || ' parcel sending credit',
    jsonb_build_object(
      'coins_spent', p_coins,
      'rupee_credit', v_rupee_credit,
      'conversion_rate', '10_coins_per_rupee',
      'request_id', p_request_id
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'coins_redeemed', p_coins,
    'rupee_credit', v_rupee_credit,
    'new_balance', v_new_balance
  );
END;
$$;

-- 10. Helper function to fetch summary for active user
CREATE OR REPLACE FUNCTION public.get_user_coin_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_balance integer := 0;
  v_earned integer := 0;
  v_redeemed integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'balance', 0,
      'total_earned', 0,
      'total_redeemed', 0,
      'rupee_value', 0.00
    );
  END IF;

  SELECT balance, total_earned, total_redeemed
  INTO v_balance, v_earned, v_redeemed
  FROM public.user_coin_balances
  WHERE user_id = v_user_id;

  v_balance := coalesce(v_balance, 0);
  v_earned := coalesce(v_earned, 0);
  v_redeemed := coalesce(v_redeemed, 0);

  RETURN jsonb_build_object(
    'balance', v_balance,
    'total_earned', v_earned,
    'total_redeemed', v_redeemed,
    'rupee_value', (v_balance / 10.0)::numeric(10, 2)
  );
END;
$$;

-- 11. Hook into complete_delivery_command to trigger automated coin award
-- Redefine complete_delivery_command with the award trigger
CREATE OR REPLACE FUNCTION public.complete_delivery_command(p_delivery_id uuid, p_otp text)
RETURNS TABLE (
  id uuid,
  request_id uuid,
  pickup_confirmed boolean,
  pickup_confirmed_at timestamptz,
  delivery_confirmed boolean,
  delivery_confirmed_at timestamptz,
  status public.delivery_status,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_delivery public.deliveries%rowtype;
  v_request public.requests%rowtype;
  v_clean_otp text := trim(coalesce(p_otp, ''));
  v_matched boolean := false;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_delivery
  FROM public.deliveries
  WHERE deliveries.id = p_delivery_id OR deliveries.request_id = p_delivery_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery not found';
  END IF;

  SELECT * INTO v_request FROM public.requests WHERE requests.id = v_delivery.request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_actor_id <> v_request.traveller_id THEN
    RAISE EXCEPTION 'Only the assigned traveller can complete delivery';
  END IF;

  -- Ensure parcel was actually picked up before it can be delivered
  IF NOT coalesce(v_delivery.pickup_confirmed, false) THEN
    RAISE EXCEPTION 'Cannot complete delivery before parcel pickup is confirmed';
  END IF;

  -- If already delivered, return current record idempotently
  IF v_delivery.delivery_confirmed AND v_delivery.status = 'delivered' THEN
    UPDATE public.requests
    SET status = 'completed', updated_at = now()
    WHERE requests.id = v_request.id AND requests.status <> 'completed';

    -- Ensure coins were awarded even on idempotent repeat
    PERFORM public.award_delivery_coins(v_delivery.id);

    RETURN QUERY
      SELECT d.id, d.request_id, d.pickup_confirmed, d.pickup_confirmed_at,
             d.delivery_confirmed, d.delivery_confirmed_at, d.status, d.created_at
      FROM public.deliveries d
      WHERE d.id = v_delivery.id;
    RETURN;
  END IF;

  -- Check brute-force lockout
  IF v_delivery.otp_locked_until IS NOT NULL AND v_delivery.otp_locked_until > now() THEN
    RAISE EXCEPTION 'Delivery code verification locked due to too many failed attempts. Please try again in % minutes.',
      ceil(extract(epoch from (v_delivery.otp_locked_until - now())) / 60);
  END IF;

  -- Strict OTP validation
  IF v_delivery.delivery_otp IS NOT NULL AND v_clean_otp = trim(v_delivery.delivery_otp) THEN
    v_matched := true;
  ELSIF v_delivery.otp_hash IS NOT NULL AND extensions.crypt(v_clean_otp, v_delivery.otp_hash) = v_delivery.otp_hash THEN
    v_matched := true;
  END IF;

  IF NOT v_matched THEN
    UPDATE public.deliveries
    SET otp_attempt_count = coalesce(otp_attempt_count, 0) + 1,
        otp_locked_until = CASE WHEN coalesce(otp_attempt_count, 0) + 1 >= 5 THEN now() + interval '15 minutes' ELSE NULL END,
        updated_at = now()
    WHERE deliveries.id = v_delivery.id;

    RAISE EXCEPTION 'Invalid delivery code. Please check with the recipient.';
  END IF;

  -- Mark delivery completed and reset lockout
  UPDATE public.deliveries
  SET delivery_confirmed = true,
      delivery_confirmed_at = now(),
      status = 'delivered',
      delivery_otp = coalesce(v_delivery.delivery_otp, v_clean_otp),
      trip_status = 'Delivered',
      otp_attempt_count = 0,
      otp_locked_until = NULL,
      updated_at = now()
  WHERE deliveries.id = v_delivery.id
  RETURNING * INTO v_delivery;

  -- Mark request completed
  UPDATE public.requests
  SET status = 'completed',
      updated_at = now()
  WHERE requests.id = v_request.id;

  -- Automatically release payment if escrow was locked
  UPDATE public.payments
  SET status = 'released',
      released_at = now()
  WHERE request_id = v_request.id AND status = 'locked';

  -- Mark parcel delivered
  IF v_request.parcel_id IS NOT NULL THEN
    UPDATE public.parcels
    SET status = 'delivered',
        updated_at = now()
    WHERE parcels.id = v_request.parcel_id;
  END IF;

  -- Mark trip completed
  IF v_request.trip_id IS NOT NULL THEN
    UPDATE public.trips
    SET status = 'completed',
        updated_at = now()
    WHERE trips.id = v_request.trip_id;
  END IF;

  -- Increment traveller delivery count safely
  BEGIN
    UPDATE public.user_profiles
    SET total_deliveries = coalesce(total_deliveries, 0) + 1,
        updated_at = now()
    WHERE user_profiles.id = v_request.traveller_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- AUTOMATED COIN AWARD: Credit admin-configured coins to Traveler and Sender idempotently
  BEGIN
    PERFORM public.award_delivery_coins(v_delivery.id);
  EXCEPTION WHEN OTHERS THEN
    -- Prevent transaction abort if coin award errors
    NULL;
  END;

  -- Emit domain event
  PERFORM public.emit_domain_event(
    v_actor_id,
    'delivery',
    v_delivery.id,
    'delivery_completed',
    'delivery.completed',
    jsonb_build_object(
      'delivery_id', v_delivery.id,
      'request_id', v_request.id,
      'sender_id', v_request.sender_id,
      'traveller_id', v_request.traveller_id
    )
  );

  RETURN QUERY
    SELECT d.id, d.request_id, d.pickup_confirmed, d.pickup_confirmed_at,
           d.delivery_confirmed, d.delivery_confirmed_at, d.status, d.created_at
    FROM public.deliveries d
    WHERE d.id = v_delivery.id;
END;
$$;

COMMIT;
