-- CarryGo Migration: Delivery Pickup OTP & Traveller Trip Controls
-- Enables secure sender-side pickup OTP handoff and traveller trip progress updates.

alter table public.deliveries
  add column if not exists pickup_otp text,
  add column if not exists trip_status text,
  add column if not exists trip_note text,
  add column if not exists eta_text text;

-- Helper to generate a 4-digit numeric pickup code
create or replace function public.generate_pickup_otp()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_code text := '';
begin
  while length(v_code) < 4 loop
    v_code := v_code || (get_byte(gen_random_bytes(1), 0) % 10)::text;
  end loop;
  return left(v_code, 4);
end;
$$;

-- Allow sender to retrieve or generate their pickup OTP
create or replace function public.get_or_create_pickup_otp(p_delivery_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor_id uuid := auth.uid();
  v_delivery public.deliveries%rowtype;
  v_request public.requests%rowtype;
  v_new_code text;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_delivery from public.deliveries where id = p_delivery_id;
  if not found then
    raise exception 'Delivery not found';
  end if;

  select * into v_request from public.requests where id = v_delivery.request_id;
  if not found then
    raise exception 'Request not found';
  end if;

  -- Only sender is authorized to view or generate the pickup OTP to share with traveller
  if v_actor_id <> v_request.sender_id then
    raise exception 'Only the parcel sender can generate or view the pickup code';
  end if;

  if v_delivery.pickup_otp is not null and length(v_delivery.pickup_otp) = 4 then
    return v_delivery.pickup_otp;
  end if;

  v_new_code := public.generate_pickup_otp();

  update public.deliveries
  set pickup_otp = v_new_code,
      updated_at = now()
  where id = p_delivery_id;

  return v_new_code;
end;
$$;

-- Confirm pickup with 4-digit code provided by sender
create or replace function public.confirm_delivery_pickup_with_otp(p_delivery_id uuid, p_otp text)
returns table (
  id uuid,
  request_id uuid,
  pickup_confirmed boolean,
  pickup_confirmed_at timestamptz,
  delivery_confirmed boolean,
  delivery_confirmed_at timestamptz,
  status public.delivery_status,
  trip_status text,
  trip_note text,
  eta_text text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor_id uuid := auth.uid();
  v_delivery public.deliveries%rowtype;
  v_request public.requests%rowtype;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_delivery from public.deliveries where deliveries.id = p_delivery_id;
  if not found then
    raise exception 'Delivery not found';
  end if;

  select * into v_request from public.requests where requests.id = v_delivery.request_id;
  if not found then
    raise exception 'Request not found';
  end if;

  if v_actor_id <> v_request.traveller_id then
    raise exception 'Only the assigned traveller can confirm pickup';
  end if;
  if v_delivery.pickup_confirmed then
    raise exception 'Parcel pickup has already been confirmed';
  end if;

  -- Validate OTP code if one has been generated on the delivery
  if v_delivery.pickup_otp is not null and v_delivery.pickup_otp <> '' then
    if trim(p_otp) <> trim(v_delivery.pickup_otp) then
      raise exception 'Invalid pickup OTP. Ask sender for the 4-digit pickup code.';
    end if;
  end if;

  update public.deliveries
  set pickup_confirmed = true,
      pickup_confirmed_at = now(),
      status = 'in_transit',
      trip_status = coalesce(v_delivery.trip_status, 'Picked Up - On Journey'),
      updated_at = now()
  where deliveries.id = p_delivery_id
  returning * into v_delivery;

  perform public.emit_domain_event(
    v_actor_id,
    'delivery',
    v_delivery.id,
    'delivery_picked_up',
    'delivery.picked_up',
    jsonb_build_object(
      'delivery_id', v_delivery.id,
      'request_id', v_request.id,
      'sender_id', v_request.sender_id,
      'traveller_id', v_request.traveller_id
    )
  );

  return query
    select v_delivery.id, v_delivery.request_id, v_delivery.pickup_confirmed, v_delivery.pickup_confirmed_at,
           v_delivery.delivery_confirmed, v_delivery.delivery_confirmed_at, v_delivery.status,
           v_delivery.trip_status, v_delivery.trip_note, v_delivery.eta_text, v_delivery.created_at;
end;
$$;

-- Update traveller trip details / status / ETA
create or replace function public.update_delivery_trip_progress(
  p_delivery_id uuid,
  p_trip_status text,
  p_trip_note text default null,
  p_eta_text text default null
)
returns table (
  id uuid,
  request_id uuid,
  status public.delivery_status,
  trip_status text,
  trip_note text,
  eta_text text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor_id uuid := auth.uid();
  v_delivery public.deliveries%rowtype;
  v_request public.requests%rowtype;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_delivery from public.deliveries where deliveries.id = p_delivery_id;
  if not found then
    raise exception 'Delivery not found';
  end if;

  select * into v_request from public.requests where requests.id = v_delivery.request_id;
  if not found then
    raise exception 'Request not found';
  end if;

  if v_actor_id <> v_request.traveller_id then
    raise exception 'Only the assigned traveller can update trip progress';
  end if;

  update public.deliveries
  set trip_status = nullif(trim(p_trip_status), ''),
      trip_note = nullif(trim(p_trip_note), ''),
      eta_text = nullif(trim(p_eta_text), ''),
      updated_at = now()
  where deliveries.id = p_delivery_id
  returning * into v_delivery;

  return query
    select v_delivery.id, v_delivery.request_id, v_delivery.status,
           v_delivery.trip_status, v_delivery.trip_note, v_delivery.eta_text, v_delivery.updated_at;
end;
$$;
