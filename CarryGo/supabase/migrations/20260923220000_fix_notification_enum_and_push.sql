-- Migration: 20260923220000_fix_notification_enum_and_push.sql
-- Description: Fix push notifications by adding missing notification_type enum values
-- and ensuring the dispatch pipeline can handle all notification types the app uses.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Add ALL missing notification_type enum values
-- ═══════════════════════════════════════════════════════════════════════════════
-- Current enum values: new_request, request_accepted, request_rejected,
-- delivery_otp, rating, general, route_match, chat_message
--
-- Missing values used by the TypeScript code:
do $$
begin
  -- Delivery lifecycle
  if not exists (select 1 from pg_enum e join pg_type t on e.enumtypid = t.oid where t.typname = 'notification_type' and e.enumlabel = 'delivery_pickup') then
    alter type public.notification_type add value 'delivery_pickup';
  end if;
  if not exists (select 1 from pg_enum e join pg_type t on e.enumtypid = t.oid where t.typname = 'notification_type' and e.enumlabel = 'delivery_completed') then
    alter type public.notification_type add value 'delivery_completed';
  end if;

  -- Trip lifecycle
  if not exists (select 1 from pg_enum e join pg_type t on e.enumtypid = t.oid where t.typname = 'notification_type' and e.enumlabel = 'trip_created') then
    alter type public.notification_type add value 'trip_created';
  end if;
  if not exists (select 1 from pg_enum e join pg_type t on e.enumtypid = t.oid where t.typname = 'notification_type' and e.enumlabel = 'trip_updated') then
    alter type public.notification_type add value 'trip_updated';
  end if;
  if not exists (select 1 from pg_enum e join pg_type t on e.enumtypid = t.oid where t.typname = 'notification_type' and e.enumlabel = 'trip_cancelled') then
    alter type public.notification_type add value 'trip_cancelled';
  end if;

  -- Parcel lifecycle
  if not exists (select 1 from pg_enum e join pg_type t on e.enumtypid = t.oid where t.typname = 'notification_type' and e.enumlabel = 'parcel_created') then
    alter type public.notification_type add value 'parcel_created';
  end if;
  if not exists (select 1 from pg_enum e join pg_type t on e.enumtypid = t.oid where t.typname = 'notification_type' and e.enumlabel = 'parcel_updated') then
    alter type public.notification_type add value 'parcel_updated';
  end if;
  if not exists (select 1 from pg_enum e join pg_type t on e.enumtypid = t.oid where t.typname = 'notification_type' and e.enumlabel = 'parcel_cancelled') then
    alter type public.notification_type add value 'parcel_cancelled';
  end if;

  -- Payment lifecycle
  if not exists (select 1 from pg_enum e join pg_type t on e.enumtypid = t.oid where t.typname = 'notification_type' and e.enumlabel = 'payment_locked') then
    alter type public.notification_type add value 'payment_locked';
  end if;
  if not exists (select 1 from pg_enum e join pg_type t on e.enumtypid = t.oid where t.typname = 'notification_type' and e.enumlabel = 'payment_released') then
    alter type public.notification_type add value 'payment_released';
  end if;
  if not exists (select 1 from pg_enum e join pg_type t on e.enumtypid = t.oid where t.typname = 'notification_type' and e.enumlabel = 'payment_refunded') then
    alter type public.notification_type add value 'payment_refunded';
  end if;

  -- Admin / System
  if not exists (select 1 from pg_enum e join pg_type t on e.enumtypid = t.oid where t.typname = 'notification_type' and e.enumlabel = 'admin_broadcast') then
    alter type public.notification_type add value 'admin_broadcast';
  end if;
  if not exists (select 1 from pg_enum e join pg_type t on e.enumtypid = t.oid where t.typname = 'notification_type' and e.enumlabel = 'promo') then
    alter type public.notification_type add value 'promo';
  end if;
  if not exists (select 1 from pg_enum e join pg_type t on e.enumtypid = t.oid where t.typname = 'notification_type' and e.enumlabel = 'system_alert') then
    alter type public.notification_type add value 'system_alert';
  end if;
end
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Change notifications.related_id from uuid to text
-- ═══════════════════════════════════════════════════════════════════════════════
-- The app sometimes passes non-UUID related IDs (conversation IDs, etc.)
-- and the dispatch RPC parameter is text, causing type mismatch errors.
alter table public.notifications
  alter column related_id type text using related_id::text;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. Re-create dispatch_notification_command with robust type handling
-- ═══════════════════════════════════════════════════════════════════════════════
-- The original function casts p_type::notification_type which crashes if the
-- type string isn't in the enum. This version falls back to 'general' for
-- unknown types to prevent notification delivery failures.
create or replace function public.dispatch_notification_command(
  p_recipient_id uuid,
  p_title text,
  p_body text,
  p_type text,
  p_related_id text default null,
  p_deep_link text default null,
  p_data jsonb default '{}'::jsonb
)
returns table (
  notification_id uuid,
  push_tokens text[]
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor_id uuid := auth.uid();
  v_notif_id uuid;
  v_tokens text[];
  v_category text := 'general';
  v_priority text := 'normal';
  v_idempotency_key text;
  v_safe_type public.notification_type;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;
  if p_recipient_id is null then
    raise exception 'Recipient ID is required';
  end if;

  -- Safely cast the type string to the enum, falling back to 'general'
  begin
    v_safe_type := p_type::public.notification_type;
  exception when invalid_text_representation then
    v_safe_type := 'general'::public.notification_type;
  end;

  -- Determine category and priority based on type
  if p_type = 'chat_message' then
    v_category := 'message';
    v_priority := 'high';
    v_idempotency_key := 'chat_' || coalesce(p_data ->> 'messageId', gen_random_uuid()::text);
  elsif p_type like 'delivery_%' then
    v_category := 'parcel_update';
    v_priority := 'high';
  elsif p_type like 'request_%' or p_type = 'new_request' then
    v_category := 'matching';
    v_priority := 'high';
  elsif p_type like 'payment_%' then
    v_category := 'payment';
    v_priority := 'high';
  elsif p_type like 'trip_%' then
    v_category := 'trip_update';
    v_priority := 'normal';
  elsif p_type like 'parcel_%' then
    v_category := 'parcel_update';
    v_priority := 'normal';
  end if;

  -- Insert the notification record
  insert into public.notifications (
    user_id,
    title,
    body,
    type,
    category,
    priority,
    deep_link,
    data,
    related_id,
    idempotency_key
  ) values (
    p_recipient_id,
    trim(p_title),
    trim(p_body),
    v_safe_type,
    v_category,
    v_priority,
    p_deep_link,
    p_data,
    p_related_id,
    v_idempotency_key
  )
  on conflict (idempotency_key) do update
    set title = excluded.title,
        body = excluded.body,
        data = excluded.data
  returning id into v_notif_id;

  -- Fetch the recipient's push tokens
  select coalesce(public.get_user_push_tokens(p_recipient_id), array[]::text[])
  into v_tokens;

  return query
    select coalesce(v_notif_id, gen_random_uuid()), coalesce(v_tokens, array[]::text[]);
end;
$$;

-- Grant execute to authenticated users
grant execute on function public.dispatch_notification_command(uuid, text, text, text, text, text, jsonb) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. Ensure get_user_push_tokens is properly created and granted
-- ═══════════════════════════════════════════════════════════════════════════════
create or replace function public.get_user_push_tokens(p_user_id uuid)
returns text[]
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_tokens text[];
begin
  select array_agg(distinct t.token)
  into v_tokens
  from (
    select expo_push_token as token
    from public.user_devices
    where user_id = p_user_id
      and invalidated_at is null
      and expo_push_token is not null
    union
    select push_token as token
    from public.user_profiles
    where id = p_user_id
      and push_token is not null
  ) t
  where t.token is not null and t.token <> '';

  return coalesce(v_tokens, array[]::text[]);
end;
$$;

grant execute on function public.get_user_push_tokens(uuid) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. Ensure notifications table has full replica identity for realtime
-- ═══════════════════════════════════════════════════════════════════════════════
alter table public.notifications replica identity full;
