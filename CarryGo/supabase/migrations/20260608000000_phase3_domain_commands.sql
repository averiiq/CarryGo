-- CarryGo phase 3 domain-command foundation.
-- Move request creation and request state transitions behind trusted SQL
-- functions so route capacity, parcel status, and event writes happen
-- atomically instead of through client-side multi-step flows.

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.user_profiles(id) on delete restrict,
  entity_type text not null,
  entity_id uuid not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.outbox_events (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  entity_type text not null,
  entity_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'processed', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  available_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index audit_events_entity_idx on public.audit_events (entity_type, entity_id, created_at desc);
create index outbox_events_status_available_idx on public.outbox_events (status, available_at, created_at);

alter table public.audit_events enable row level security;
alter table public.outbox_events enable row level security;

create policy "audit_events_no_client_access" on public.audit_events for all to authenticated using (false) with check (false);
create policy "outbox_events_no_client_access" on public.outbox_events for all to authenticated using (false) with check (false);

create or replace function public.emit_domain_event(
  p_actor_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_event_type text,
  p_topic text,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  insert into public.audit_events (actor_id, entity_type, entity_id, event_type, payload)
  values (p_actor_id, p_entity_type, p_entity_id, p_event_type, coalesce(p_payload, '{}'::jsonb));

  insert into public.outbox_events (topic, entity_type, entity_id, payload)
  values (p_topic, p_entity_type, p_entity_id, coalesce(p_payload, '{}'::jsonb));
end;
$$;

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

  if v_actor_id <> v_parcel.user_id and v_actor_id <> v_trip.user_id then
    raise exception 'Only the parcel owner or trip owner can create a request';
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

create or replace function public.transition_request_status(
  p_request_id uuid,
  p_next_status public.request_status
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
  v_request public.requests%rowtype;
  v_parcel public.parcels%rowtype;
  v_trip public.trips%rowtype;
  v_updated public.requests%rowtype;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_request from public.requests where requests.id = p_request_id;
  if not found then
    raise exception 'Request not found';
  end if;

  select * into v_parcel from public.parcels where parcels.id = v_request.parcel_id;
  select * into v_trip from public.trips where trips.id = v_request.trip_id;

  if p_next_status = 'accepted' then
    if v_request.status <> 'pending' then
      raise exception 'Only pending requests can be accepted';
    end if;
    if v_actor_id <> v_request.traveller_id or v_actor_id <> v_trip.user_id then
      raise exception 'Only the assigned traveller can accept this request';
    end if;
    if v_trip.status <> 'active' then
      raise exception 'Trip is no longer active';
    end if;
    if v_parcel.status <> 'open' then
      raise exception 'Parcel is no longer available';
    end if;
    if exists (
      select 1
      from public.requests sibling
      where sibling.parcel_id = v_request.parcel_id
        and sibling.id <> v_request.id
        and sibling.status = 'accepted'
    ) then
      raise exception 'Another traveller has already been accepted for this parcel';
    end if;
    if v_parcel.weight > v_trip.available_capacity then
      raise exception 'Trip does not have enough remaining capacity';
    end if;

    update public.trips
    set available_capacity = available_capacity - v_parcel.weight
    where id = v_trip.id;

    update public.parcels
    set status = 'matched'
    where id = v_parcel.id;

    update public.requests
    set status = 'accepted',
        updated_at = now()
    where id = v_request.id
    returning * into v_updated;

    update public.requests
    set status = 'rejected',
        updated_at = now()
    where parcel_id = v_request.parcel_id
      and id <> v_request.id
      and status = 'pending';

    perform public.emit_domain_event(
      v_actor_id,
      'request',
      v_updated.id,
      'request_accepted',
      'request.accepted',
      jsonb_build_object(
        'request_id', v_updated.id,
        'parcel_id', v_updated.parcel_id,
        'trip_id', v_updated.trip_id,
        'reserved_weight', v_parcel.weight,
        'remaining_capacity', greatest(v_trip.available_capacity - v_parcel.weight, 0)
      )
    );
  elsif p_next_status = 'rejected' then
    if v_request.status <> 'pending' then
      raise exception 'Only pending requests can be rejected';
    end if;
    if v_actor_id <> v_request.traveller_id or v_actor_id <> v_trip.user_id then
      raise exception 'Only the assigned traveller can reject this request';
    end if;

    update public.requests
    set status = 'rejected',
        updated_at = now()
    where id = v_request.id
    returning * into v_updated;

    perform public.emit_domain_event(
      v_actor_id,
      'request',
      v_updated.id,
      'request_rejected',
      'request.rejected',
      jsonb_build_object('request_id', v_updated.id, 'parcel_id', v_updated.parcel_id, 'trip_id', v_updated.trip_id)
    );
  elsif p_next_status = 'cancelled' then
    if v_request.status <> 'pending' then
      raise exception 'Only pending requests can be cancelled';
    end if;
    if v_actor_id <> v_request.sender_id or v_actor_id <> v_parcel.user_id then
      raise exception 'Only the sender can cancel this request';
    end if;

    update public.requests
    set status = 'cancelled',
        updated_at = now()
    where id = v_request.id
    returning * into v_updated;

    perform public.emit_domain_event(
      v_actor_id,
      'request',
      v_updated.id,
      'request_cancelled',
      'request.cancelled',
      jsonb_build_object('request_id', v_updated.id, 'parcel_id', v_updated.parcel_id, 'trip_id', v_updated.trip_id)
    );
  elsif p_next_status = 'completed' then
    if v_request.status <> 'accepted' then
      raise exception 'Only accepted requests can be completed';
    end if;
    if v_actor_id <> v_request.traveller_id then
      raise exception 'Only the assigned traveller can complete this request';
    end if;

    update public.requests
    set status = 'completed',
        updated_at = now()
    where id = v_request.id
    returning * into v_updated;

    update public.parcels
    set status = 'delivered'
    where id = v_parcel.id;

    perform public.emit_domain_event(
      v_actor_id,
      'request',
      v_updated.id,
      'request_completed',
      'request.completed',
      jsonb_build_object('request_id', v_updated.id, 'parcel_id', v_updated.parcel_id, 'trip_id', v_updated.trip_id)
    );
  elsif p_next_status = 'failed' then
    if v_request.status <> 'accepted' then
      raise exception 'Only accepted requests can fail';
    end if;
    if v_actor_id <> v_request.sender_id and v_actor_id <> v_request.traveller_id then
      raise exception 'Only a request participant can mark this request as failed';
    end if;

    update public.requests
    set status = 'failed',
        updated_at = now()
    where id = v_request.id
    returning * into v_updated;

    update public.trips
    set available_capacity = available_capacity + v_parcel.weight
    where id = v_trip.id;

    update public.parcels
    set status = 'open'
    where id = v_parcel.id;

    perform public.emit_domain_event(
      v_actor_id,
      'request',
      v_updated.id,
      'request_failed',
      'request.failed',
      jsonb_build_object('request_id', v_updated.id, 'parcel_id', v_updated.parcel_id, 'trip_id', v_updated.trip_id)
    );
  else
    raise exception 'Unsupported request transition to %', p_next_status;
  end if;

  return query
    select
      v_updated.id,
      v_updated.parcel_id,
      v_updated.trip_id,
      v_updated.sender_id,
      v_updated.sender_name,
      v_updated.traveller_id,
      v_updated.traveller_name,
      v_updated.status,
      v_updated.price,
      v_updated.message,
      v_updated.created_at,
      v_updated.updated_at;
end;
$$;
