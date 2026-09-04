-- Play Store Reviewer Account Setup and Verification Bypass

-- 1. Create Reviewer and Dummy users in auth.users if not exists
DO $$
BEGIN
  -- Insert Reviewer into auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'carrygo.reviewer@gmail.com') THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      confirmed_at,
      is_sso_user
    )
    VALUES (
      'a87ebde8-4984-40e2-8fe6-ecf0e6bca4ea',
      '00000000-0000-0000-0000-000000000000',
      'carrygo.reviewer@gmail.com',
      extensions.crypt('CarryGo@Review2026!', extensions.gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{}',
      FALSE,
      now(),
      now(),
      now(),
      FALSE
    );
  END IF;

  -- Insert Dummy into auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'carrygo.dummy@gmail.com') THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      confirmed_at,
      is_sso_user
    )
    VALUES (
      'd49bb77e-294b-4b16-928d-29177a641477',
      '00000000-0000-0000-0000-000000000000',
      'carrygo.dummy@gmail.com',
      extensions.crypt('CarryGo@Review2026!', extensions.gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{}',
      FALSE,
      now(),
      now(),
      now(),
      FALSE
    );
  END IF;
END $$;

-- 2. Create corresponding complete profiles in public.user_profiles
INSERT INTO public.user_profiles (
  id,
  email,
  username,
  full_name,
  phone,
  rating,
  total_deliveries,
  total_trips,
  verified,
  kyc_status,
  role,
  city,
  profile_completed_at
)
VALUES (
  'a87ebde8-4984-40e2-8fe6-ecf0e6bca4ea',
  'carrygo.reviewer@gmail.com',
  'carrygo_reviewer',
  'CarryGo Reviewer',
  '+919999999999',
  5.00,
  1,
  1,
  TRUE,
  'approved',
  'both'::public.user_role,
  'Mumbai',
  now()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'both'::public.user_role,
  kyc_status = 'approved',
  verified = TRUE,
  city = 'Mumbai',
  profile_completed_at = COALESCE(user_profiles.profile_completed_at, now());

INSERT INTO public.user_profiles (
  id,
  email,
  username,
  full_name,
  phone,
  rating,
  total_deliveries,
  total_trips,
  verified,
  kyc_status,
  role,
  city,
  profile_completed_at
)
VALUES (
  'd49bb77e-294b-4b16-928d-29177a641477',
  'carrygo.dummy@gmail.com',
  'carrygo_dummy',
  'CarryGo Dummy',
  '+918888888888',
  4.80,
  0,
  0,
  TRUE,
  'approved',
  'both'::public.user_role,
  'Delhi',
  now()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'both'::public.user_role,
  kyc_status = 'approved',
  verified = TRUE,
  city = 'Delhi',
  profile_completed_at = COALESCE(user_profiles.profile_completed_at, now());

-- 3. Seed traveler trips
-- Trip by Reviewer (Mumbai -> Delhi)
INSERT INTO public.trips (
  id,
  user_id,
  user_name,
  user_rating,
  from_city,
  to_city,
  date,
  time,
  vehicle_type,
  available_capacity,
  price_per_kg,
  status
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'a87ebde8-4984-40e2-8fe6-ecf0e6bca4ea',
  'CarryGo Reviewer',
  5.00,
  'Mumbai',
  'Delhi',
  (CURRENT_DATE + INTERVAL '5 days')::date,
  '14:00',
  'flight'::public.vehicle_type,
  10.00,
  250.00,
  'active'::public.trip_status
)
ON CONFLICT (id) DO NOTHING;

-- Trip by Dummy (Mumbai -> Bengaluru)
INSERT INTO public.trips (
  id,
  user_id,
  user_name,
  user_rating,
  from_city,
  to_city,
  date,
  time,
  vehicle_type,
  available_capacity,
  price_per_kg,
  status
)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'd49bb77e-294b-4b16-928d-29177a641477',
  'CarryGo Dummy',
  4.80,
  'Mumbai',
  'Bengaluru',
  (CURRENT_DATE + INTERVAL '3 days')::date,
  '09:00',
  'flight'::public.vehicle_type,
  15.00,
  200.00,
  'active'::public.trip_status
)
ON CONFLICT (id) DO NOTHING;

-- 4. Seed parcel requests
-- Parcel by Reviewer (Mumbai -> Bengaluru)
INSERT INTO public.parcels (
  id,
  user_id,
  user_name,
  from_city,
  to_city,
  category,
  description,
  weight,
  price_offer,
  status
)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'a87ebde8-4984-40e2-8fe6-ecf0e6bca4ea',
  'CarryGo Reviewer',
  'Mumbai',
  'Bengaluru',
  'electronics'::public.parcel_category,
  'Reviewer test iPad Pro with accessories',
  2.50,
  500.00,
  'open'::public.parcel_status
)
ON CONFLICT (id) DO NOTHING;

-- Parcel by Dummy (Mumbai -> Delhi)
INSERT INTO public.parcels (
  id,
  user_id,
  user_name,
  from_city,
  to_city,
  category,
  description,
  weight,
  price_offer,
  status
)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  'd49bb77e-294b-4b16-928d-29177a641477',
  'CarryGo Dummy',
  'Mumbai',
  'Delhi',
  'documents'::public.parcel_category,
  'Reviewer test confidential business documents',
  1.00,
  300.00,
  'open'::public.parcel_status
)
ON CONFLICT (id) DO NOTHING;

-- 5. Seed requests (matches)
-- Pending match: Reviewer parcel -> Dummy traveler
INSERT INTO public.requests (
  id,
  parcel_id,
  trip_id,
  sender_id,
  sender_name,
  traveller_id,
  traveller_name,
  status,
  price,
  message
)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  'a87ebde8-4984-40e2-8fe6-ecf0e6bca4ea',
  'CarryGo Reviewer',
  'd49bb77e-294b-4b16-928d-29177a641477',
  'CarryGo Dummy',
  'pending'::public.request_status,
  500.00,
  'Hi Traveler, please carry this parcel safely to Bangalore. Thanks!'
)
ON CONFLICT (id) DO NOTHING;

-- 6. Seed conversations and chat history
INSERT INTO public.conversations (
  id,
  request_id,
  participant_ids,
  participant_names,
  route,
  parcel_description,
  last_message_text,
  last_message_sender_id,
  last_message_at,
  last_message_read
)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '55555555-5555-5555-5555-555555555555',
  ARRAY['a87ebde8-4984-40e2-8fe6-ecf0e6bca4ea'::uuid, 'd49bb77e-294b-4b16-928d-29177a641477'::uuid],
  '{"a87ebde8-4984-40e2-8fe6-ecf0e6bca4ea": "CarryGo Reviewer", "d49bb77e-294b-4b16-928d-29177a641477": "CarryGo Dummy"}'::jsonb,
  'Mumbai to Bengaluru',
  'Reviewer test iPad Pro with accessories',
  'Hi Traveler, please carry this parcel safely to Bangalore. Thanks!',
  'a87ebde8-4984-40e2-8fe6-ecf0e6bca4ea',
  now(),
  TRUE
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.messages (
  id,
  conversation_id,
  sender_id,
  sender_name,
  text,
  read,
  created_at
)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'a87ebde8-4984-40e2-8fe6-ecf0e6bca4ea',
  'CarryGo Reviewer',
  'Hi Traveler, please carry this parcel safely to Bangalore. Thanks!',
  TRUE,
  now()
)
ON CONFLICT (id) DO NOTHING;

-- 7. Seed completed delivery
-- Parcel by Dummy -> Reviewer trip (Delivered)
INSERT INTO public.parcels (
  id,
  user_id,
  user_name,
  from_city,
  to_city,
  category,
  description,
  weight,
  price_offer,
  status
)
VALUES (
  '66666666-6666-6666-6666-666666666666',
  'd49bb77e-294b-4b16-928d-29177a641477',
  'CarryGo Dummy',
  'Mumbai',
  'Delhi',
  'clothing'::public.parcel_category,
  'Dummy user winter jacket and sneakers',
  3.00,
  450.00,
  'delivered'::public.parcel_status
)
ON CONFLICT (id) DO NOTHING;

-- Completed match request
INSERT INTO public.requests (
  id,
  parcel_id,
  trip_id,
  sender_id,
  sender_name,
  traveller_id,
  traveller_name,
  status,
  price,
  message
)
VALUES (
  '77777777-7777-7777-7777-777777777777',
  '66666666-6666-6666-6666-666666666666',
  '11111111-1111-1111-1111-111111111111',
  'd49bb77e-294b-4b16-928d-29177a641477',
  'CarryGo Dummy',
  'a87ebde8-4984-40e2-8fe6-ecf0e6bca4ea',
  'CarryGo Reviewer',
  'completed'::public.request_status,
  450.00,
  'Can you please deliver my jacket to Delhi?'
)
ON CONFLICT (id) DO NOTHING;

-- Delivered record
INSERT INTO public.deliveries (
  id,
  request_id,
  otp_hash,
  pickup_confirmed,
  pickup_confirmed_at,
  delivery_confirmed,
  delivery_confirmed_at,
  status
)
VALUES (
  '88888888-8888-8888-8888-888888888888',
  '77777777-7777-7777-7777-777777777777',
  extensions.crypt('202611', extensions.gen_salt('bf')),
  TRUE,
  now() - INTERVAL '1 day',
  TRUE,
  now(),
  'delivered'::public.delivery_status
)
ON CONFLICT (id) DO NOTHING;

-- Released payment
INSERT INTO public.payments (
  id,
  request_id,
  sender_id,
  traveller_id,
  amount,
  status,
  locked_at,
  released_at
)
VALUES (
  '99999999-9999-9999-9999-999999999999',
  '77777777-7777-7777-7777-777777777777',
  'd49bb77e-294b-4b16-928d-29177a641477',
  'a87ebde8-4984-40e2-8fe6-ecf0e6bca4ea',
  450.00,
  'released'::public.payment_status,
  now() - INTERVAL '1 day',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- 8. Redefine verify_delivery_otp to securely bypass verification for Reviewer
CREATE OR REPLACE FUNCTION public.verify_delivery_otp(p_delivery_id uuid, p_otp text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_delivery public.deliveries%rowtype;
  v_request public.requests%rowtype;
  v_is_reviewer boolean := false;
BEGIN
  SELECT * INTO v_delivery FROM public.deliveries WHERE deliveries.id = p_delivery_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery not found';
  END IF;

  SELECT * INTO v_request FROM public.requests WHERE requests.id = v_delivery.request_id;
  IF v_request.traveller_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the assigned traveller can confirm delivery';
  END IF;

  IF p_otp IS NULL OR p_otp !~ '^[0-9]{6}$' THEN
    RAISE EXCEPTION 'Delivery code must be 6 digits';
  END IF;

  -- Check if the traveller is the reviewer account
  SELECT EXISTS(
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND email = 'carrygo.reviewer@gmail.com'
  ) INTO v_is_reviewer;

  -- If traveller is reviewer, allow bypass. Otherwise, enforce crypt signature checks.
  IF NOT v_is_reviewer THEN
    IF v_delivery.otp_hash IS NULL OR crypt(p_otp, v_delivery.otp_hash) <> v_delivery.otp_hash THEN
      RAISE EXCEPTION 'Invalid delivery code';
    END IF;
  END IF;

  UPDATE public.deliveries
  SET delivery_confirmed = true,
      delivery_confirmed_at = now(),
      status = 'delivered'
  WHERE deliveries.id = p_delivery_id;
END;
$$;

