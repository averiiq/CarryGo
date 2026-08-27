create or replace function public.create_request_command(
  p_parcel_id uuid,
  p_trip_id uuid,
  p_price numeric,
  p_message text default null
)
returns table (
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
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor_id uuid := auth.uid();
  v_parcel public.parcels%rowtype;
  v_trip public.trips%rowtype;
  v_request public.requests%rowtype;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  if p_price is null or p_price < 0 then
    raise exception 'Price must be zero or greater';
  end if;

  select * into v_parcel from public.parcels where parcels.id = p_parcel_id;
  if not found then
    raise exception 'Parcel not found';
  end if;

  select * into v_trip from public.trips where trips.id = p_trip_id;
  if not found then
    raise exception 'Trip not found';
  end if;

  if v_actor_id <> v_parcel.user_id then
    raise exception 'Only the parcel owner can create a request';
  end if;

  if v_parcel.user_id = v_trip.user_id then
    raise exception 'You cannot create a request against your own listing';
  end if;

  if v_parcel.status <> 'open' then
    raise exception 'Parcel is no longer available for requests';
  end if;

  if v_trip.status <> 'active' then
    raise exception 'Trip is no longer active';
  end if;

  if lower(trim(v_parcel.from_city)) <> lower(trim(v_trip.from_city))
     or lower(trim(v_parcel.to_city)) <> lower(trim(v_trip.to_city)) then
    raise exception 'Parcel and trip routes no longer match';
  end if;

  if v_parcel.weight > v_trip.available_capacity then
    raise exception 'Trip does not have enough remaining capacity';
  end if;

  insert into public.requests (
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
  values (
    v_parcel.id,
    v_trip.id,
    v_parcel.user_id,
    v_parcel.user_name,
    v_trip.user_id,
    v_trip.user_name,
    'pending',
    p_price,
    nullif(trim(coalesce(p_message, '')), '')
  )
  returning * into v_request;

  perform public.emit_domain_event(
    v_actor_id,
    'request',
    v_request.id,
    'request_created',
    'request.created',
    jsonb_build_object(
      'request_id', v_request.id,
      'parcel_id', v_request.parcel_id,
      'trip_id', v_request.trip_id,
      'sender_id', v_request.sender_id,
      'traveller_id', v_request.traveller_id,
      'price', v_request.price
    )
  );

  return query
    select
      v_request.id,
      v_request.parcel_id,
      v_request.trip_id,
      v_request.sender_id,
      v_request.sender_name,
      v_request.traveller_id,
      v_request.traveller_name,
      v_request.status,
      v_request.price,
      v_request.message,
      v_request.created_at,
      v_request.updated_at;
end;
$$;
