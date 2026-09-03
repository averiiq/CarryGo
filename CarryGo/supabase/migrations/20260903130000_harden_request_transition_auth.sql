-- Harden request status authorization and block direct table updates.
-- This enforces that request transitions only happen through the RPC
-- and only by the correct participant for each status.

-- 1) Block direct client-side UPDATEs on requests.
drop policy if exists "requests_update_participant" on public.requests;
drop policy if exists "requests_update_own" on public.requests;
drop policy if exists "requests_update_sender_or_traveller" on public.requests;

-- 2) Recreate transition function with explicit actor/participant checks.
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
  v_updated public.requests%rowtype;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  select *
    into v_request
    from public.requests r
   where r.id = p_request_id
   for update;

  if not found then
    raise exception 'Request not found';
  end if;

  if v_actor_id <> v_request.sender_id and v_actor_id <> v_request.traveller_id then
    raise exception 'Only request participants can update request status';
  end if;

  if p_next_status = 'accepted' then
    if v_request.status <> 'pending' then
      raise exception 'Only pending requests can be accepted';
    end if;
    if v_actor_id <> v_request.traveller_id then
      raise exception 'Only the assigned traveller can accept this request';
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

    update public.requests r2
       set status = 'accepted',
           updated_at = now()
     where r2.id = v_request.id
     returning * into v_updated;

    update public.requests r3
       set status = 'rejected',
           updated_at = now()
     where r3.parcel_id = v_request.parcel_id
       and r3.id <> v_request.id
       and r3.status = 'pending';

    perform public.emit_domain_event(
      v_actor_id,
      'request',
      v_updated.id,
      'request_accepted',
      'request.accepted',
      jsonb_build_object('request_id', v_updated.id, 'parcel_id', v_updated.parcel_id, 'trip_id', v_updated.trip_id)
    );

  elsif p_next_status = 'rejected' then
    if v_request.status <> 'pending' then
      raise exception 'Only pending requests can be rejected';
    end if;
    if v_actor_id <> v_request.traveller_id then
      raise exception 'Only the assigned traveller can reject this request';
    end if;

    update public.requests r2
       set status = 'rejected',
           updated_at = now()
     where r2.id = v_request.id
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
    if v_actor_id <> v_request.sender_id then
      raise exception 'Only the parcel sender can cancel this request';
    end if;

    update public.requests r2
       set status = 'cancelled',
           updated_at = now()
     where r2.id = v_request.id
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

    update public.requests r2
       set status = 'completed',
           updated_at = now()
     where r2.id = v_request.id
     returning * into v_updated;

    update public.parcels
       set status = 'delivered'
     where id = v_updated.parcel_id;

    update public.trips
       set available_capacity = greatest(0, available_capacity - (
         select p.weight from public.parcels p where p.id = v_updated.parcel_id
       ))
     where id = v_updated.trip_id;

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
      raise exception 'Only sender or traveller can mark this request as failed';
    end if;

    update public.requests r2
       set status = 'failed',
           updated_at = now()
     where r2.id = v_request.id
     returning * into v_updated;

    update public.parcels
       set status = 'open'
     where id = v_updated.parcel_id;

    update public.payments
       set status = 'locked'
     where request_id = v_updated.id
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
