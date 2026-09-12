-- Migration: Delivery Handover Resilience & Sender Creation Access
-- Ensures both Sender and Traveller can create/access deliveries and manage OTP handover codes

-- 1. Allow either participant (traveller or sender) of an accepted request to create/initialize the delivery
create or replace function public.create_delivery(p_request_id uuid)
returns table (
  id uuid,
  request_id uuid,
  pickup_confirmed boolean,
  pickup_confirmed_at timestamptz,
  delivery_confirmed boolean,
  delivery_confirmed_at timestamptz,
  status public.delivery_status,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_request public.requests%rowtype;
begin
  select * into v_request from public.requests where requests.id = p_request_id;
  if not found then
    raise exception 'Request not found';
  end if;

  -- Allow either assigned traveller or sender to create/retrieve the delivery record
  if v_request.traveller_id <> auth.uid() and v_request.sender_id <> auth.uid() then
    raise exception 'Only the assigned traveller or sender can initialize a delivery';
  end if;

  if v_request.status <> 'accepted' then
    raise exception 'A delivery can only be created for an accepted request';
  end if;

  insert into public.deliveries (request_id, otp_hash)
  values (p_request_id, public.generate_delivery_otp_hash())
  on conflict (request_id) do nothing;

  return query
    select d.id, d.request_id, d.pickup_confirmed, d.pickup_confirmed_at,
           d.delivery_confirmed, d.delivery_confirmed_at, d.status, d.created_at
    from public.deliveries d
    where d.request_id = p_request_id;
end;
$$;

-- 2. Resilient Pickup OTP retrieval/creation by delivery ID or request ID
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

  -- Lookup delivery by either deliveries.id or deliveries.request_id
  select * into v_delivery
  from public.deliveries
  where deliveries.id = p_delivery_id or deliveries.request_id = p_delivery_id
  limit 1;

  -- If not found yet in deliveries table, check if it exists as an accepted request
  if not found then
    select * into v_request from public.requests where requests.id = p_delivery_id;
    if found and (v_request.sender_id = v_actor_id or v_request.traveller_id = v_actor_id) and v_request.status = 'accepted' then
      -- Auto-create delivery record
      insert into public.deliveries (request_id, otp_hash)
      values (v_request.id, public.generate_delivery_otp_hash())
      on conflict (request_id) do nothing;

      select * into v_delivery from public.deliveries where deliveries.request_id = v_request.id;
    else
      raise exception 'Delivery not found';
    end if;
  else
    select * into v_request from public.requests where requests.id = v_delivery.request_id;
  end if;

  if not found then
    raise exception 'Request not found';
  end if;

  -- Only sender is authorized to view or generate the pickup OTP
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
  where deliveries.id = v_delivery.id;

  return v_new_code;
end;
$$;

-- 3. Resilient Confirm Pickup with OTP by delivery ID or request ID
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

  select * into v_delivery
  from public.deliveries
  where deliveries.id = p_delivery_id or deliveries.request_id = p_delivery_id
  limit 1;

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
  where deliveries.id = v_delivery.id
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

-- 4. Resilient Issue Delivery OTP by delivery ID or request ID
create or replace function public.issue_delivery_otp(p_delivery_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_delivery public.deliveries%rowtype;
  v_request public.requests%rowtype;
  v_bytes bytea;
  v_code text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into v_delivery
  from public.deliveries
  where deliveries.id = p_delivery_id or deliveries.request_id = p_delivery_id
  for update;

  if not found then raise exception 'Delivery not found'; end if;
  select * into v_request from public.requests where id = v_delivery.request_id;
  if v_request.sender_id is distinct from auth.uid() then
    raise exception 'Only the sender can issue the delivery code';
  end if;
  if v_delivery.status <> 'in_transit' then
    raise exception 'Delivery code is available only while the parcel is in transit';
  end if;

  v_bytes := gen_random_bytes(4);
  v_code := lpad(((get_byte(v_bytes, 0) * 16777216 + get_byte(v_bytes, 1) * 65536 + get_byte(v_bytes, 2) * 256 + get_byte(v_bytes, 3)) % 1000000)::text, 6, '0');

  update public.deliveries
    set otp_hash = crypt(v_code, gen_salt('bf')), otp_attempt_count = 0, otp_locked_until = null
    where id = v_delivery.id;

  return v_code;
end;
$$;

-- 5. Resilient Complete Delivery Command by delivery ID or request ID
create or replace function public.complete_delivery_command(p_delivery_id uuid, p_otp text)
returns table (
  id uuid,
  request_id uuid,
  pickup_confirmed boolean,
  pickup_confirmed_at timestamptz,
  delivery_confirmed boolean,
  delivery_confirmed_at timestamptz,
  status public.delivery_status,
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

  select * into v_delivery
  from public.deliveries
  where deliveries.id = p_delivery_id or deliveries.request_id = p_delivery_id
  for update;

  if not found then
    raise exception 'Delivery not found';
  end if;

  select * into v_request from public.requests where requests.id = v_delivery.request_id;
  if not found then
    raise exception 'Request not found';
  end if;

  if v_actor_id <> v_request.traveller_id then
    raise exception 'Only the assigned traveller can confirm final delivery';
  end if;

  if v_delivery.delivery_confirmed then
    raise exception 'Delivery has already been confirmed';
  end if;

  if v_delivery.otp_locked_until is not null and v_delivery.otp_locked_until > now() then
    raise exception 'Too many invalid attempts. Try again later.';
  end if;

  if v_delivery.otp_hash is null or v_delivery.otp_hash <> crypt(p_otp, v_delivery.otp_hash) then
    update public.deliveries
    set otp_attempt_count = coalesce(otp_attempt_count, 0) + 1,
        otp_locked_until = case when coalesce(otp_attempt_count, 0) + 1 >= 5 then now() + interval '15 minutes' else null end
    where deliveries.id = v_delivery.id;
    raise exception 'Invalid delivery code';
  end if;

  update public.deliveries
  set delivery_confirmed = true,
      delivery_confirmed_at = now(),
      status = 'delivered',
      updated_at = now()
  where deliveries.id = v_delivery.id
  returning * into v_delivery;

  -- Complete associated request and increment delivery counters
  update public.requests
  set status = 'completed',
      updated_at = now()
  where requests.id = v_request.id;

  update public.users
  set total_deliveries = coalesce(total_deliveries, 0) + 1,
      updated_at = now()
  where users.id = v_request.traveller_id;

  perform public.emit_domain_event(
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

  return query
    select v_delivery.id, v_delivery.request_id, v_delivery.pickup_confirmed, v_delivery.pickup_confirmed_at,
           v_delivery.delivery_confirmed, v_delivery.delivery_confirmed_at, v_delivery.status, v_delivery.created_at;
end;
$$;

-- Grant execute permissions to authenticated and anon
grant execute on function public.create_delivery(uuid) to authenticated, anon;
grant execute on function public.get_or_create_pickup_otp(uuid) to authenticated, anon;
grant execute on function public.confirm_delivery_pickup_with_otp(uuid, text) to authenticated, anon;
grant execute on function public.issue_delivery_otp(uuid) to authenticated, anon;
grant execute on function public.complete_delivery_command(uuid, text) to authenticated, anon;
