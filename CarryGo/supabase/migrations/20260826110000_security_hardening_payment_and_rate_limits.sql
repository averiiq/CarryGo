-- Security hardening: enforce server-derived identity in payment and rate-limit RPCs.

create or replace function public.release_payment_atomic(
  p_payment_id uuid,
  p_actor_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_payment public.payments%rowtype;
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = 'P0003';
  end if;

  select *
  into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment not found' using errcode = 'P0002';
  end if;

  if v_payment.status <> 'locked' then
    raise exception 'Payment not found or already processed' using errcode = 'P0002';
  end if;

  -- Ignore client-supplied actor id and trust auth.uid() only.
  if v_payment.traveller_id <> v_actor_id then
    raise exception 'unauthorized: only the traveller can release' using errcode = 'P0003';
  end if;

  update public.payments
  set status = 'released',
      released_at = now()
  where id = p_payment_id
    and status = 'locked';

  return true;
end;
$$;

create or replace function public.refund_payment_atomic(
  p_payment_id uuid,
  p_actor_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_payment public.payments%rowtype;
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = 'P0003';
  end if;

  select *
  into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment not found' using errcode = 'P0002';
  end if;

  if v_payment.status <> 'locked' then
    raise exception 'Payment not found or already processed' using errcode = 'P0002';
  end if;

  -- Ignore client-supplied actor id and trust auth.uid() only.
  if v_payment.sender_id <> v_actor_id then
    raise exception 'unauthorized: only the sender can refund' using errcode = 'P0003';
  end if;

  update public.payments
  set status = 'refunded'
  where id = p_payment_id
    and status = 'locked';

  return true;
end;
$$;

create or replace function public.check_api_rate_limit(
  p_user_id uuid,
  p_action text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_count integer;
  v_max integer;
  v_window interval;
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = 'P0003';
  end if;

  if p_user_id is distinct from v_actor_id then
    raise exception 'Unauthorized rate limit actor' using errcode = 'P0003';
  end if;

  case p_action
    when 'create_trip' then v_max := 5; v_window := '1 hour';
    when 'create_parcel' then v_max := 10; v_window := '1 hour';
    when 'create_request' then v_max := 20; v_window := '1 hour';
    when 'send_message' then v_max := 60; v_window := '5 minutes';
    when 'search' then v_max := 30; v_window := '1 minute';
    when 'create_payment' then v_max := 10; v_window := '1 hour';
    when 'release_payment' then v_max := 20; v_window := '1 hour';
    when 'refund_payment' then v_max := 20; v_window := '1 hour';
    else v_max := 30; v_window := '1 hour';
  end case;

  select count(*)
  into v_count
  from public.api_rate_limits
  where user_id = p_user_id
    and action = p_action
    and attempted_at > now() - v_window;

  return v_count < v_max;
end;
$$;

create or replace function public.record_api_action(
  p_user_id uuid,
  p_action text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = 'P0003';
  end if;

  if p_user_id is distinct from v_actor_id then
    raise exception 'Unauthorized rate limit actor' using errcode = 'P0003';
  end if;

  insert into public.api_rate_limits (user_id, action)
  values (p_user_id, p_action);
end;
$$;

create or replace function public.enforce_rate_limit(
  p_user_id uuid,
  p_action text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = 'P0003';
  end if;

  if p_user_id is distinct from v_actor_id then
    raise exception 'Unauthorized rate limit actor' using errcode = 'P0003';
  end if;

  if not public.check_api_rate_limit(p_user_id, p_action) then
    raise exception 'Rate limit exceeded for action: %', p_action
      using errcode = 'P0001';
  end if;

  perform public.record_api_action(p_user_id, p_action);
end;
$$;

revoke all on function public.release_payment_atomic(uuid, uuid) from public, anon;
grant execute on function public.release_payment_atomic(uuid, uuid) to authenticated;

revoke all on function public.refund_payment_atomic(uuid, uuid) from public, anon;
grant execute on function public.refund_payment_atomic(uuid, uuid) to authenticated;

revoke all on function public.check_api_rate_limit(uuid, text) from public, anon, authenticated;
revoke all on function public.record_api_action(uuid, text) from public, anon, authenticated;
revoke all on function public.enforce_rate_limit(uuid, text) from public, anon;
grant execute on function public.enforce_rate_limit(uuid, text) to authenticated;

create or replace function public.increment_counter(
  p_user_id uuid,
  p_column text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = 'P0003';
  end if;

  if p_user_id is distinct from v_actor_id then
    raise exception 'Cannot increment counters for another user' using errcode = 'P0003';
  end if;

  if p_column = 'total_trips' then
    update public.user_profiles
    set total_trips = coalesce(total_trips, 0) + 1
    where id = p_user_id;
  elsif p_column = 'total_deliveries' then
    update public.user_profiles
    set total_deliveries = coalesce(total_deliveries, 0) + 1
    where id = p_user_id;
  else
    raise exception 'Invalid column: %', p_column;
  end if;
end;
$$;

alter function public.check_auth_rate_limit(text, text)
  set search_path = public, extensions;

alter function public.record_auth_attempt(text, text, boolean)
  set search_path = public, extensions;

alter function public.cleanup_auth_rate_limits()
  set search_path = public, extensions;

alter function public.cleanup_api_rate_limits()
  set search_path = public, extensions;

alter function public.cleanup_old_notifications()
  set search_path = public, extensions;

alter function public.process_outbox_events(integer)
  set search_path = public, extensions;

alter function public.sweep_dead_outbox_events()
  set search_path = public, extensions;

alter function public.refresh_user_ratings()
  set search_path = public, extensions;

alter function public.notify_route_subscribers(text, uuid, text, text, text, text)
  set search_path = public, extensions;