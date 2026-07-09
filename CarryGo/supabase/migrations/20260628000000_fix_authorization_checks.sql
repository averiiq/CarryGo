-- Fix #1: Authorization logic bugs (OR → AND) in transition_request_status
-- Fix #2: Add FOR UPDATE row locks to prevent race conditions on acceptance

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

  select * into v_request from public.requests where requests.id = p_request_id for update;
  if not found then
    raise exception 'Request not found';
  end if;

  select * into v_parcel from public.parcels where parcels.id = v_request.parcel_id for update;
  select * into v_trip from public.trips where trips.id = v_request.trip_id for update;

  if p_next_status = 'accepted' then
    if v_request.status <> 'pending' then
      raise exception 'Only pending requests can be accepted';
    end if;
    if v_actor_id <> v_request.traveller_id and v_actor_id <> v_trip.user_id then
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
    if v_actor_id <> v_request.traveller_id and v_actor_id <> v_trip.user_id then
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
    if v_actor_id <> v_request.sender_id and v_actor_id <> v_parcel.user_id then
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

    -- Auto-release locked payment on delivery completion
    update public.payments
    set status = 'released',
        released_at = now()
    where request_id = v_request.id
      and status = 'locked';

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

    -- Auto-refund locked payment on delivery failure
    update public.payments
    set status = 'refunded'
    where request_id = v_request.id
      and status = 'locked';

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
