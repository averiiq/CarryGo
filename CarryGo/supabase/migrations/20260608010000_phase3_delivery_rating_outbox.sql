-- CarryGo phase 3 completion: delivery state machine, rating authorization,
-- and basic outbox processing.

alter table public.deliveries
  add column otp_attempt_count integer not null default 0 check (otp_attempt_count >= 0),
  add column otp_locked_until timestamptz;

create or replace function public.generate_delivery_otp_hash()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_code text := '';
begin
  while length(v_code) < 6 loop
    v_code := v_code || (get_byte(gen_random_bytes(1), 0) % 10)::text;
  end loop;
  return crypt(left(v_code, 6), gen_salt('bf'));
end;
$$;

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
  if v_request.traveller_id <> auth.uid() then
    raise exception 'Only the assigned traveller can create a delivery';
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

create or replace function public.confirm_delivery_pickup(p_delivery_id uuid)
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
  if v_request.status <> 'accepted' then
    raise exception 'Pickup is only available for accepted requests';
  end if;
  if v_delivery.status <> 'awaiting_pickup' then
    raise exception 'Pickup has already been confirmed';
  end if;

  update public.deliveries
  set pickup_confirmed = true,
      pickup_confirmed_at = now(),
      status = 'in_transit'
  where id = p_delivery_id
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
           v_delivery.delivery_confirmed, v_delivery.delivery_confirmed_at, v_delivery.status, v_delivery.created_at;
end;
$$;

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
  v_limit integer := 5;
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
    raise exception 'Only the assigned traveller can confirm delivery';
  end if;
  if v_request.status <> 'accepted' then
    raise exception 'Only accepted requests can be delivered';
  end if;
  if v_delivery.status <> 'in_transit' then
    raise exception 'Delivery must be in transit before completion';
  end if;
  if p_otp is null or p_otp !~ '^[0-9]{6}$' then
    raise exception 'Delivery code must be 6 digits';
  end if;
  if v_delivery.otp_locked_until is not null and v_delivery.otp_locked_until > now() then
    raise exception 'Delivery code is temporarily locked. Please try again later.';
  end if;

  if v_delivery.otp_hash is null or crypt(p_otp, v_delivery.otp_hash) <> v_delivery.otp_hash then
    update public.deliveries
    set otp_attempt_count = otp_attempt_count + 1,
        otp_locked_until = case
          when otp_attempt_count + 1 >= v_limit then now() + interval '15 minutes'
          else otp_locked_until
        end
    where id = p_delivery_id
    returning * into v_delivery;
    raise exception 'Invalid delivery code';
  end if;

  update public.deliveries
  set delivery_confirmed = true,
      delivery_confirmed_at = now(),
      status = 'delivered',
      otp_attempt_count = 0,
      otp_locked_until = null
  where id = p_delivery_id
  returning * into v_delivery;

  perform public.transition_request_status(v_request.id, 'completed');

  update public.user_profiles
  set total_deliveries = total_deliveries + 1
  where id in (v_request.sender_id, v_request.traveller_id);

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

create or replace function public.submit_rating_command(
  p_request_id uuid,
  p_to_user_id uuid,
  p_rating integer,
  p_comment text default null
)
returns table (
  id uuid,
  from_user_id uuid,
  to_user_id uuid,
  request_id uuid,
  rating integer,
  comment text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor_id uuid := auth.uid();
  v_request public.requests%rowtype;
  v_rating public.ratings%rowtype;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5';
  end if;

  select * into v_request from public.requests where requests.id = p_request_id;
  if not found then
    raise exception 'Request not found';
  end if;
  if v_request.status <> 'completed' then
    raise exception 'Ratings are only allowed after a completed delivery';
  end if;
  if v_actor_id <> v_request.sender_id and v_actor_id <> v_request.traveller_id then
    raise exception 'Only request participants can submit a rating';
  end if;
  if p_to_user_id not in (v_request.sender_id, v_request.traveller_id) then
    raise exception 'Rating target must be a request participant';
  end if;
  if p_to_user_id = v_actor_id then
    raise exception 'You cannot rate yourself';
  end if;

  insert into public.ratings (
    from_user_id,
    to_user_id,
    request_id,
    rating,
    comment
  )
  values (
    v_actor_id,
    p_to_user_id,
    p_request_id,
    p_rating,
    nullif(trim(coalesce(p_comment, '')), '')
  )
  returning * into v_rating;

  update public.user_profiles profile
  set rating = round((
    select avg(r.rating)::numeric
    from public.ratings r
    where r.to_user_id = p_to_user_id
  )::numeric, 1)
  where profile.id = p_to_user_id;

  perform public.emit_domain_event(
    v_actor_id,
    'rating',
    v_rating.id,
    'rating_submitted',
    'rating.submitted',
    jsonb_build_object(
      'rating_id', v_rating.id,
      'request_id', p_request_id,
      'from_user_id', v_actor_id,
      'to_user_id', p_to_user_id,
      'rating', p_rating
    )
  );

  return query
    select v_rating.id, v_rating.from_user_id, v_rating.to_user_id, v_rating.request_id,
           v_rating.rating, v_rating.comment, v_rating.created_at;
exception
  when unique_violation then
    raise exception 'You have already rated this delivery';
end;
$$;

create or replace function public.process_outbox_events(p_limit integer default 50)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_event public.outbox_events%rowtype;
  v_processed integer := 0;
  v_payload jsonb;
begin
  for v_event in
    select *
    from public.outbox_events
    where status = 'pending'
      and available_at <= now()
    order by created_at
    limit greatest(coalesce(p_limit, 50), 1)
    for update skip locked
  loop
    v_payload := coalesce(v_event.payload, '{}'::jsonb);

    update public.outbox_events
    set status = 'processing',
        attempt_count = attempt_count + 1
    where id = v_event.id;

    if v_event.topic = 'delivery.picked_up' then
      insert into public.notifications (user_id, title, body, type, related_id)
      values (
        (v_payload ->> 'sender_id')::uuid,
        'Parcel Picked Up!',
        'The traveller has confirmed pickup and your parcel is on the way.',
        'general',
        (v_payload ->> 'request_id')::uuid
      );
    elsif v_event.topic = 'delivery.completed' then
      insert into public.notifications (user_id, title, body, type, related_id)
      values (
        (v_payload ->> 'sender_id')::uuid,
        'Parcel Delivered!',
        'Your delivery has been confirmed successfully.',
        'delivery_otp',
        (v_payload ->> 'request_id')::uuid
      );
    elsif v_event.topic = 'rating.submitted' then
      insert into public.notifications (user_id, title, body, type, related_id)
      values (
        (v_payload ->> 'to_user_id')::uuid,
        'New Rating Received',
        'A completed delivery has a new rating attached to it.',
        'rating',
        (v_payload ->> 'request_id')::uuid
      );
    end if;

    update public.outbox_events
    set status = 'processed',
        processed_at = now()
    where id = v_event.id;

    v_processed := v_processed + 1;
  end loop;

  return v_processed;
end;
$$;
