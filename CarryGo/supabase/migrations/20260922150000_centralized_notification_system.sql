-- Migration: 20260922150000_centralized_notification_system.sql
-- Description: Centralized notification architecture, preferences, admin broadcasts, and event processing

-- 1. Upgrade public.notifications table with rich metadata columns
alter table public.notifications
  add column if not exists category text default 'general',
  add column if not exists priority text default 'normal',
  add column if not exists data jsonb default '{}'::jsonb,
  add column if not exists deep_link text,
  add column if not exists image_url text,
  add column if not exists idempotency_key text,
  add column if not exists expires_at timestamptz,
  add column if not exists read_at timestamptz;

-- Ensure idempotency key has unique index if provided
create unique index if not exists notifications_idempotency_key_idx
  on public.notifications (idempotency_key)
  where idempotency_key is not null;

create index if not exists notifications_user_category_idx
  on public.notifications (user_id, category, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, read, created_at desc);

-- 2. User Notification Preferences Table
create table if not exists public.user_notification_preferences (
  user_id uuid primary key references public.user_profiles(id) on delete cascade,
  enable_matches boolean not null default true,
  enable_trip_updates boolean not null default true,
  enable_parcel_updates boolean not null default true,
  enable_chat boolean not null default true,
  enable_payments boolean not null default true,
  enable_promotions boolean not null default true,
  enable_city_alerts boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_notification_preferences enable row level security;

drop policy if exists "user_prefs_select_own" on public.user_notification_preferences;
create policy "user_prefs_select_own"
  on public.user_notification_preferences
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "user_prefs_insert_own" on public.user_notification_preferences;
create policy "user_prefs_insert_own"
  on public.user_notification_preferences
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "user_prefs_update_own" on public.user_notification_preferences;
create policy "user_prefs_update_own"
  on public.user_notification_preferences
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Function to get or initialize user notification preferences
create or replace function public.get_or_create_notification_preferences(p_user_id uuid default null)
returns public.user_notification_preferences
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_target_id uuid := coalesce(p_user_id, auth.uid());
  v_prefs public.user_notification_preferences%rowtype;
begin
  if v_target_id is null then
    raise exception 'User ID is required';
  end if;

  select * into v_prefs
  from public.user_notification_preferences
  where user_id = v_target_id;

  if not found then
    insert into public.user_notification_preferences (user_id)
    values (v_target_id)
    on conflict (user_id) do nothing
    returning * into v_prefs;

    if v_prefs.user_id is null then
      select * into v_prefs from public.user_notification_preferences where user_id = v_target_id;
    end if;
  end if;

  return v_prefs;
end;
$$;

grant execute on function public.get_or_create_notification_preferences(uuid) to authenticated, service_role;

-- Function to upsert user notification preferences
create or replace function public.upsert_user_notification_preferences(
  p_enable_matches boolean default true,
  p_enable_trip_updates boolean default true,
  p_enable_parcel_updates boolean default true,
  p_enable_chat boolean default true,
  p_enable_payments boolean default true,
  p_enable_promotions boolean default true,
  p_enable_city_alerts boolean default true
)
returns public.user_notification_preferences
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_prefs public.user_notification_preferences%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.user_notification_preferences (
    user_id,
    enable_matches,
    enable_trip_updates,
    enable_parcel_updates,
    enable_chat,
    enable_payments,
    enable_promotions,
    enable_city_alerts,
    updated_at
  )
  values (
    v_user_id,
    coalesce(p_enable_matches, true),
    coalesce(p_enable_trip_updates, true),
    coalesce(p_enable_parcel_updates, true),
    coalesce(p_enable_chat, true),
    coalesce(p_enable_payments, true),
    coalesce(p_enable_promotions, true),
    coalesce(p_enable_city_alerts, true),
    now()
  )
  on conflict (user_id) do update set
    enable_matches = excluded.enable_matches,
    enable_trip_updates = excluded.enable_trip_updates,
    enable_parcel_updates = excluded.enable_parcel_updates,
    enable_chat = excluded.enable_chat,
    enable_payments = excluded.enable_payments,
    enable_promotions = excluded.enable_promotions,
    enable_city_alerts = excluded.enable_city_alerts,
    updated_at = now()
  returning * into v_prefs;

  return v_prefs;
end;
$$;

grant execute on function public.upsert_user_notification_preferences(boolean, boolean, boolean, boolean, boolean, boolean, boolean) to authenticated;

-- 3. Admin Broadcasts Table
create table if not exists public.admin_broadcasts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.user_profiles(id),
  title text not null,
  body text not null,
  image_url text,
  deep_link text,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'critical')),
  category text not null default 'broadcast' check (category in ('broadcast', 'promotion', 'system_alert')),
  target_audience jsonb not null default '{"type":"all"}'::jsonb,
  scheduled_at timestamptz,
  sent_at timestamptz,
  total_targeted integer not null default 0,
  total_sent integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.admin_broadcasts enable row level security;

drop policy if exists "admin_broadcasts_admin_only" on public.admin_broadcasts;
create policy "admin_broadcasts_admin_only"
  on public.admin_broadcasts
  for all
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid() and up.system_role = 'admin'
    )
  );

-- 4. Mark notifications read with read_at timestamp
create or replace function public.mark_notification_read_v2(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  update public.notifications
  set read = true,
      read_at = now()
  where id = p_notification_id
    and user_id = v_actor_id
    and read = false;

  return found;
end;
$$;

grant execute on function public.mark_notification_read_v2(uuid) to authenticated;

create or replace function public.mark_all_notifications_read_v2()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor_id uuid := auth.uid();
  v_count integer;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  update public.notifications
  set read = true,
      read_at = now()
  where user_id = v_actor_id
    and read = false;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.mark_all_notifications_read_v2() to authenticated;

-- 5. Helper function to check if a user wants a notification category
create or replace function public.is_notification_allowed(p_user_id uuid, p_category text, p_priority text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_prefs public.user_notification_preferences%rowtype;
begin
  -- Critical priority notifications always bypass preferences (e.g. security alerts, emergency cancellations)
  if p_priority = 'critical' then
    return true;
  end if;

  select * into v_prefs
  from public.user_notification_preferences
  where user_id = p_user_id;

  -- Default to true if no preference record exists yet
  if not found then
    return true;
  end if;

  case p_category
    when 'matching' then return v_prefs.enable_matches;
    when 'trip_update' then return v_prefs.enable_trip_updates;
    when 'parcel_update' then return v_prefs.enable_parcel_updates;
    when 'message' then return v_prefs.enable_chat;
    when 'payment' then return v_prefs.enable_payments;
    when 'promotion' then return v_prefs.enable_promotions;
    when 'city_alert' then return v_prefs.enable_city_alerts;
    else return true;
  end case;
end;
$$;

grant execute on function public.is_notification_allowed(uuid, text, text) to authenticated, service_role;

-- 6. Central Outbox Event Processor supporting all lifecycle events
create or replace function public.process_outbox_events(p_limit integer default 50)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_event public.outbox_events%rowtype;
  v_request public.requests%rowtype;
  v_trip public.trips%rowtype;
  v_parcel public.parcels%rowtype;
  v_recipient uuid;
  v_title text;
  v_body text;
  v_type text;
  v_category text;
  v_priority text;
  v_deep_link text;
  v_data jsonb;
  v_idempotency_key text;
  v_payload jsonb;
  v_processed integer := 0;
  v_allowed boolean;
begin
  for v_event in
    select * from public.outbox_events
    where status in ('pending', 'failed')
      and attempt_count < max_attempts
      and available_at <= now()
    order by created_at
    limit least(greatest(coalesce(p_limit, 50), 1), 100)
    for update skip locked
  loop
    begin
      v_payload := coalesce(v_event.payload, '{}'::jsonb);
      v_recipient := null;
      v_title := null;
      v_body := null;
      v_type := 'general';
      v_category := 'general';
      v_priority := 'normal';
      v_deep_link := null;
      v_data := v_payload;
      v_idempotency_key := v_event.id::text;

      -- =========================================================================
      -- 1. REQUEST & DELIVERY LIFECYCLE
      -- =========================================================================
      if v_event.topic like 'request.%' then
        select * into v_request
        from public.requests
        where id = coalesce((v_payload ->> 'request_id')::uuid, v_event.entity_id);

        if found then
          if v_event.topic = 'request.created' then
            v_recipient := v_request.traveller_id;
            v_title := '📦 New Delivery Request!';
            v_body := coalesce(v_request.sender_name, 'A sender') || ' requested space on your route (₹' || round(v_request.price)::text || ').';
            v_type := 'new_request';
            v_category := 'matching';
            v_priority := 'high';
            v_deep_link := '/(tabs)/requests';
            v_idempotency_key := 'req_created_' || v_request.id;

          elsif v_event.topic = 'request.accepted' then
            v_recipient := v_request.sender_id;
            v_title := '✅ Request Accepted!';
            v_body := coalesce(v_request.traveller_name, 'The traveller') || ' accepted your delivery request. Tap to coordinate.';
            v_type := 'request_accepted';
            v_category := 'trip_update';
            v_priority := 'high';
            v_deep_link := '/(tabs)/requests';
            v_idempotency_key := 'req_acc_' || v_request.id;

          elsif v_event.topic = 'request.rejected' then
            v_recipient := v_request.sender_id;
            v_title := '❌ Request Declined';
            v_body := coalesce(v_request.traveller_name, 'The traveller') || ' was unable to accept your request. Explore other routes!';
            v_type := 'request_rejected';
            v_category := 'trip_update';
            v_priority := 'normal';
            v_deep_link := '/(tabs)/requests';
            v_idempotency_key := 'req_rej_' || v_request.id;

          elsif v_event.topic = 'request.cancelled' then
            v_recipient := case
              when (v_payload ->> 'cancelled_by')::uuid = v_request.sender_id then v_request.traveller_id
              else v_request.sender_id
            end;
            v_title := '⚠️ Request Cancelled';
            v_body := 'Delivery request has been cancelled.';
            v_type := 'general';
            v_category := 'trip_update';
            v_priority := 'high';
            v_deep_link := '/(tabs)/requests';
            v_idempotency_key := 'req_canc_' || v_request.id;

          elsif v_event.topic = 'request.completed' then
            v_recipient := v_request.sender_id;
            v_title := '🎉 Delivery Completed!';
            v_body := 'Your parcel was successfully delivered. Please leave a rating!';
            v_type := 'delivery_otp';
            v_category := 'parcel_update';
            v_priority := 'high';
            v_deep_link := '/(tabs)/requests';
            v_idempotency_key := 'req_comp_' || v_request.id;

          elsif v_event.topic = 'request.failed' then
            v_recipient := v_request.sender_id;
            v_title := '⚠️ Delivery Issue Reported';
            v_body := 'An issue was recorded for your delivery. Support is reviewing.';
            v_type := 'general';
            v_category := 'parcel_update';
            v_priority := 'critical';
            v_deep_link := '/support';
            v_idempotency_key := 'req_fail_' || v_request.id;
          end if;
        end if;

      elsif v_event.topic = 'delivery.picked_up' then
        v_recipient := (v_payload ->> 'sender_id')::uuid;
        v_title := '🚗 Parcel Picked Up!';
        v_body := 'The traveller verified pickup. Your parcel is now in transit!';
        v_type := 'general';
        v_category := 'parcel_update';
        v_priority := 'high';
        v_deep_link := '/delivery/' || coalesce(v_payload ->> 'delivery_id', v_event.entity_id::text);
        v_idempotency_key := 'del_pickup_' || coalesce(v_payload ->> 'delivery_id', v_event.entity_id::text);

      elsif v_event.topic = 'delivery.completed' then
        v_recipient := (v_payload ->> 'sender_id')::uuid;
        v_title := '🎉 Delivery Confirmed!';
        v_body := 'Your delivery has been confirmed. Thank you for using CarryGo!';
        v_type := 'delivery_otp';
        v_category := 'parcel_update';
        v_priority := 'high';
        v_deep_link := '/delivery/' || coalesce(v_payload ->> 'delivery_id', v_event.entity_id::text);
        v_idempotency_key := 'del_comp_' || coalesce(v_payload ->> 'delivery_id', v_event.entity_id::text);

      -- =========================================================================
      -- 2. TRIP UPDATES (Notifies Senders associated with that trip)
      -- =========================================================================
      elsif v_event.topic like 'trip.%' then
        if v_event.topic = 'trip.updated' then
          -- Notify all senders with active requests for this trip
          for v_request in
            select * from public.requests
            where trip_id = v_event.entity_id and status in ('accepted', 'pending')
          loop
            v_recipient := v_request.sender_id;
            v_title := '📍 Trip Schedule Updated';
            v_body := 'Your traveller updated details for ' || coalesce(v_payload ->> 'from_city', 'origin') || ' → ' || coalesce(v_payload ->> 'to_city', 'destination') || '.';
            v_type := 'general';
            v_category := 'trip_update';
            v_priority := 'high';
            v_deep_link := '/(tabs)/requests';
            v_idempotency_key := 'trip_upd_' || v_event.entity_id || '_' || v_request.id || '_' || v_event.id;

            if public.is_notification_allowed(v_recipient, v_category, v_priority) then
              insert into public.notifications (
                user_id, title, body, type, category, priority, deep_link, data, idempotency_key, related_id
              ) values (
                v_recipient, v_title, v_body, v_type::public.notification_type, v_category, v_priority, v_deep_link, v_data, v_idempotency_key, v_event.entity_id
              ) on conflict (idempotency_key) do nothing;
            end if;
          end loop;
          v_recipient := null; -- Handled via loop

        elsif v_event.topic = 'trip.cancelled' then
          for v_request in
            select * from public.requests
            where trip_id = v_event.entity_id and status in ('accepted', 'pending')
          loop
            v_recipient := v_request.sender_id;
            v_title := '❌ Trip Cancelled by Traveller';
            v_body := 'A traveller cancelled their trip. Any held escrow payment will be refunded.';
            v_type := 'general';
            v_category := 'trip_update';
            v_priority := 'critical';
            v_deep_link := '/(tabs)/requests';
            v_idempotency_key := 'trip_canc_' || v_event.entity_id || '_' || v_request.id;

            if public.is_notification_allowed(v_recipient, v_category, v_priority) then
              insert into public.notifications (
                user_id, title, body, type, category, priority, deep_link, data, idempotency_key, related_id
              ) values (
                v_recipient, v_title, v_body, v_type::public.notification_type, v_category, v_priority, v_deep_link, v_data, v_idempotency_key, v_event.entity_id
              ) on conflict (idempotency_key) do nothing;
            end if;
          end loop;
          v_recipient := null;
        end if;

      -- =========================================================================
      -- 3. PARCEL UPDATES (Notifies Traveller associated with that parcel)
      -- =========================================================================
      elsif v_event.topic like 'parcel.%' then
        if v_event.topic = 'parcel.cancelled' then
          for v_request in
            select * from public.requests
            where parcel_id = v_event.entity_id and status in ('accepted', 'pending')
          loop
            v_recipient := v_request.traveller_id;
            v_title := '❌ Parcel Cancelled by Sender';
            v_body := 'The sender cancelled parcel request: ' || coalesce(v_payload ->> 'title', 'parcel') || '.';
            v_type := 'general';
            v_category := 'parcel_update';
            v_priority := 'high';
            v_deep_link := '/(tabs)/requests';
            v_idempotency_key := 'parcel_canc_' || v_event.entity_id || '_' || v_request.id;

            if public.is_notification_allowed(v_recipient, v_category, v_priority) then
              insert into public.notifications (
                user_id, title, body, type, category, priority, deep_link, data, idempotency_key, related_id
              ) values (
                v_recipient, v_title, v_body, v_type::public.notification_type, v_category, v_priority, v_deep_link, v_data, v_idempotency_key, v_event.entity_id
              ) on conflict (idempotency_key) do nothing;
            end if;
          end loop;
          v_recipient := null;
        end if;

      -- =========================================================================
      -- 4. PAYMENT & ESCROW EVENTS
      -- =========================================================================
      elsif v_event.topic like 'payment.%' then
        v_category := 'payment';
        if v_event.topic = 'payment.locked' then
          -- Notify Traveller that payment is secured in escrow
          v_recipient := (v_payload ->> 'traveller_id')::uuid;
          v_title := '🔒 Payment Secured in Escrow';
          v_body := '₹' || round((v_payload ->> 'amount')::numeric)::text || ' is reserved in escrow for delivery. Coordinate pickup now!';
          v_type := 'general';
          v_priority := 'high';
          v_deep_link := '/(tabs)/requests';
          v_idempotency_key := 'pay_lock_trav_' || v_event.entity_id;

          -- Also notify Sender of confirmation
          if public.is_notification_allowed(v_recipient, v_category, v_priority) then
            insert into public.notifications (
              user_id, title, body, type, category, priority, deep_link, data, idempotency_key, related_id
            ) values (
              v_recipient, v_title, v_body, v_type::public.notification_type, v_category, v_priority, v_deep_link, v_data, v_idempotency_key, v_event.entity_id
            ) on conflict (idempotency_key) do nothing;
          end if;

          v_recipient := (v_payload ->> 'sender_id')::uuid;
          v_title := '✅ Payment Successful';
          v_body := 'Payment of ₹' || round((v_payload ->> 'amount')::numeric)::text || ' is safely held in escrow until parcel delivery.';
          v_idempotency_key := 'pay_lock_send_' || v_event.entity_id;

        elsif v_event.topic = 'payment.released' then
          v_recipient := (v_payload ->> 'traveller_id')::uuid;
          v_title := '💰 Payment Released!';
          v_body := '₹' || round((v_payload ->> 'amount')::numeric)::text || ' has been transferred for your completed delivery. Great work!';
          v_type := 'general';
          v_priority := 'high';
          v_deep_link := '/transactions';
          v_idempotency_key := 'pay_rel_' || v_event.entity_id;

        elsif v_event.topic = 'payment.refunded' then
          v_recipient := (v_payload ->> 'sender_id')::uuid;
          v_title := '↩️ Payment Refunded';
          v_body := 'Refund of ₹' || round((v_payload ->> 'amount')::numeric)::text || ' has been initiated to your original payment method.';
          v_type := 'general';
          v_priority := 'high';
          v_deep_link := '/transactions';
          v_idempotency_key := 'pay_ref_' || v_event.entity_id;
        end if;

      -- =========================================================================
      -- 5. CHAT MESSAGING
      -- =========================================================================
      elsif v_event.topic = 'chat.message' then
        v_recipient := (v_payload ->> 'recipient_id')::uuid;
        v_title := left(coalesce(v_payload ->> 'title', 'New message'), 100);
        v_body := left(coalesce(v_payload ->> 'body', 'You received a message.'), 500);
        v_type := 'chat_message';
        v_category := 'message';
        v_priority := 'high';
        v_deep_link := '/chat/' || coalesce(v_payload ->> 'related_id', v_event.entity_id::text);
        v_idempotency_key := 'chat_msg_' || coalesce(v_payload ->> 'message_id', v_event.id::text);

      -- =========================================================================
      -- 6. ROUTE & CITY MATCHING
      -- =========================================================================
      elsif v_event.topic = 'route.match' then
        v_recipient := (v_payload ->> 'recipient_id')::uuid;
        v_title := coalesce(v_payload ->> 'title', '🗺️ Route Match Found!');
        v_body := coalesce(v_payload ->> 'body', 'A traveler or sender matches your saved corridor.');
        v_type := 'route_match';
        v_category := 'matching';
        v_priority := 'normal';
        v_deep_link := '/subscriptions';
        v_idempotency_key := 'route_match_' || v_recipient || '_' || coalesce(v_payload ->> 'related_id', v_event.entity_id::text);

      elsif v_event.topic = 'city.activity' then
        v_recipient := (v_payload ->> 'recipient_id')::uuid;
        v_title := coalesce(v_payload ->> 'title', '📍 New Activity in Your City');
        v_body := coalesce(v_payload ->> 'body', 'A new travel route was posted near you.');
        v_type := 'general';
        v_category := 'city_alert';
        v_priority := 'low';
        v_deep_link := '/(tabs)';
        v_idempotency_key := 'city_act_' || v_recipient || '_' || (v_payload ->> 'city') || '_' || to_char(now(), 'YYYY-MM-DD');

      -- =========================================================================
      -- 7. RATINGS
      -- =========================================================================
      elsif v_event.topic = 'rating.submitted' then
        v_recipient := (v_payload ->> 'to_user_id')::uuid;
        v_title := '⭐ New Rating Received';
        v_body := coalesce(v_payload ->> 'from_user_name', 'A participant') || ' gave you a rating for completed delivery.';
        v_type := 'rating';
        v_category := 'general';
        v_priority := 'normal';
        v_deep_link := '/(tabs)/profile';
        v_idempotency_key := 'rating_' || v_event.entity_id;

      -- =========================================================================
      -- 8. ADMIN BROADCASTS & PROMOTIONS
      -- =========================================================================
      elsif v_event.topic = 'admin.broadcast' then
        v_recipient := (v_payload ->> 'recipient_id')::uuid;
        v_title := coalesce(v_payload ->> 'title', 'CarryGo Announcement');
        v_body := coalesce(v_payload ->> 'body', '');
        v_type := 'general';
        v_category := coalesce(v_payload ->> 'category', 'broadcast');
        v_priority := coalesce(v_payload ->> 'priority', 'normal');
        v_deep_link := v_payload ->> 'deep_link';
        v_idempotency_key := 'broadcast_' || (v_payload ->> 'broadcast_id') || '_' || v_recipient;

      end if;

      -- Final permission & insertion check
      if v_recipient is not null and v_title is not null and v_body is not null then
        v_allowed := public.is_notification_allowed(v_recipient, v_category, v_priority);

        if v_allowed then
          insert into public.notifications (
            user_id,
            title,
            body,
            type,
            category,
            priority,
            deep_link,
            data,
            idempotency_key,
            related_id
          ) values (
            v_recipient,
            v_title,
            v_body,
            v_type::public.notification_type,
            v_category,
            v_priority,
            v_deep_link,
            v_data,
            v_idempotency_key,
            v_event.entity_id
          ) on conflict (idempotency_key) do nothing;
        end if;
      end if;

      update public.outbox_events
      set status = 'processed',
          processed_at = now(),
          last_error = null
      where id = v_event.id;

      v_processed := v_processed + 1;

    exception when others then
      update public.outbox_events
      set status = 'failed',
          attempt_count = attempt_count + 1,
          last_error = sqlerrm,
          available_at = now() + (power(4, attempt_count) * interval '30 seconds')
      where id = v_event.id;
    end;
  end loop;

  return v_processed;
end;
$$;

grant execute on function public.process_outbox_events(integer) to service_role;

-- 7. Update set_trip_status to emit trip.cancelled outbox event
create or replace function public.set_trip_status(p_trip_id uuid, p_status public.trip_status)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_trip public.trips%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_trip from public.trips where id = p_trip_id for update;
  if not found then raise exception 'Trip not found'; end if;
  if v_trip.user_id is distinct from auth.uid() then raise exception 'Only the owner can update this trip'; end if;
  if v_trip.status <> 'active' or p_status not in ('completed', 'cancelled') then
    raise exception 'Invalid trip status transition';
  end if;

  update public.trips set status = p_status, updated_at = now() where id = p_trip_id;

  if p_status = 'cancelled' then
    perform public.emit_domain_event(
      auth.uid(),
      'trip',
      p_trip_id,
      'trip_cancelled',
      'trip.cancelled',
      jsonb_build_object(
        'trip_id', p_trip_id,
        'from_city', v_trip.from_city,
        'to_city', v_trip.to_city,
        'date', v_trip.date
      )
    );
  end if;
end;
$$;

grant execute on function public.set_trip_status(uuid, public.trip_status) to authenticated;

-- 8. Update set_parcel_status to emit parcel.cancelled outbox event
create or replace function public.set_parcel_status(p_parcel_id uuid, p_status public.parcel_status)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_parcel public.parcels%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_parcel from public.parcels where id = p_parcel_id for update;
  if not found then raise exception 'Parcel not found'; end if;
  if v_parcel.user_id is distinct from auth.uid() then raise exception 'Only the owner can update this parcel'; end if;
  if v_parcel.status <> 'open' or p_status not in ('failed', 'cancelled') then
    raise exception 'Invalid parcel status transition';
  end if;

  update public.parcels set status = p_status, updated_at = now() where id = p_parcel_id;

  if p_status = 'cancelled' then
    perform public.emit_domain_event(
      auth.uid(),
      'parcel',
      p_parcel_id,
      'parcel_cancelled',
      'parcel.cancelled',
      jsonb_build_object(
        'parcel_id', p_parcel_id,
        'title', v_parcel.title,
        'from_city', v_parcel.from_city,
        'to_city', v_parcel.to_city
      )
    );
  end if;
end;
$$;

grant execute on function public.set_parcel_status(uuid, public.parcel_status) to authenticated;

-- 9. Update finalize_razorpay_payment to emit payment.locked event
create or replace function public.finalize_razorpay_payment(p_order_id text, p_payment_id text)
returns public.payments
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_order public.razorpay_orders%rowtype;
  v_request public.requests%rowtype;
  v_payment public.payments%rowtype;
begin
  select * into v_order from public.razorpay_orders where order_id = p_order_id for update;
  if not found then raise exception 'Payment order not found'; end if;
  if v_order.status = 'verified' then
    select * into v_payment from public.payments where razorpay_order_id = p_order_id;
    if found and v_payment.razorpay_payment_id = p_payment_id then return v_payment; end if;
    raise exception 'Payment order has already been used';
  end if;
  select * into v_request from public.requests where id = v_order.request_id for update;
  if not found or v_request.sender_id is distinct from v_order.sender_id then
    raise exception 'Payment request is invalid';
  end if;
  if v_request.status <> 'accepted' or round(v_request.price * 100)::bigint <> v_order.amount_paise then
    raise exception 'Payment amount or request status changed';
  end if;

  insert into public.payments (
    request_id, sender_id, traveller_id, amount, status, razorpay_order_id, razorpay_payment_id
  ) values (
    v_request.id, v_request.sender_id, v_request.traveller_id, v_request.price, 'locked', p_order_id, p_payment_id
  ) returning * into v_payment;

  update public.razorpay_orders
    set status = 'verified', payment_id = p_payment_id, verified_at = now()
    where order_id = p_order_id;

  -- Emit payment.locked domain event
  perform public.emit_domain_event(
    v_request.sender_id,
    'payment',
    v_payment.id,
    'payment_locked',
    'payment.locked',
    jsonb_build_object(
      'payment_id', v_payment.id,
      'request_id', v_request.id,
      'sender_id', v_request.sender_id,
      'traveller_id', v_request.traveller_id,
      'amount', v_payment.amount
    )
  );

  return v_payment;
end;
$$;

grant execute on function public.finalize_razorpay_payment(text, text) to service_role;

-- 10. Update release_payment_atomic to emit payment.released event
create or replace function public.release_payment_atomic(
  p_payment_id uuid,
  p_actor_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
begin
  select *
  into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment not found' using errcode = 'P0002';
  end if;

  if v_payment.status != 'locked' then
    raise exception 'Payment not found or already processed' using errcode = 'P0002';
  end if;

  if v_payment.traveller_id != p_actor_id then
    raise exception 'unauthorized: only the traveller can release' using errcode = 'P0003';
  end if;

  update public.payments
  set status = 'released',
      released_at = now()
  where id = p_payment_id
    and status = 'locked';

  perform public.emit_domain_event(
    p_actor_id,
    'payment',
    p_payment_id,
    'payment_released',
    'payment.released',
    jsonb_build_object(
      'payment_id', p_payment_id,
      'sender_id', v_payment.sender_id,
      'traveller_id', v_payment.traveller_id,
      'amount', v_payment.amount
    )
  );

  return true;
end;
$$;

grant execute on function public.release_payment_atomic(uuid, uuid) to authenticated;

-- 11. Update refund_payment_atomic to emit payment.refunded event
create or replace function public.refund_payment_atomic(
  p_payment_id uuid,
  p_actor_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
begin
  select *
  into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment not found' using errcode = 'P0002';
  end if;

  if v_payment.status != 'locked' then
    raise exception 'Payment not in locked state' using errcode = 'P0002';
  end if;

  if v_payment.sender_id != p_actor_id and v_payment.traveller_id != p_actor_id then
    raise exception 'Unauthorized' using errcode = 'P0003';
  end if;

  update public.payments
  set status = 'refunded',
      refunded_at = now()
  where id = p_payment_id
    and status = 'locked';

  perform public.emit_domain_event(
    p_actor_id,
    'payment',
    p_payment_id,
    'payment_refunded',
    'payment.refunded',
    jsonb_build_object(
      'payment_id', p_payment_id,
      'sender_id', v_payment.sender_id,
      'traveller_id', v_payment.traveller_id,
      'amount', v_payment.amount
    )
  );

  return true;
end;
$$;

grant execute on function public.refund_payment_atomic(uuid, uuid) to authenticated;

-- 12. City-based Discovery Notifications with anti-spam rate limiting
create or replace function public.notify_city_activity(
  p_activity_type text, -- 'new_trip' or 'new_parcel'
  p_city text,
  p_title text,
  p_body text
)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor_id uuid := auth.uid();
  v_user record;
  v_notified integer := 0;
  v_target_role text;
begin
  if v_actor_id is null then raise exception 'Authentication required'; end if;
  if nullif(trim(p_city), '') is null then return 0; end if;

  -- For new trip, target senders; for new parcel, target travelers
  v_target_role := case when p_activity_type = 'new_trip' then 'sender' else 'traveler' end;

  for v_user in
    select up.id
    from public.user_profiles up
    where up.id <> v_actor_id
      and lower(trim(coalesce(up.city, up.current_city, ''))) = lower(trim(p_city))
      and (up.role = v_target_role or up.role is null)
      and up.is_deleted = false
    limit 50 -- Maximum 50 per city broadcast to prevent flooding
  loop
    perform public.emit_domain_event(
      v_actor_id,
      'city',
      v_user.id,
      'city_activity_notified',
      'city.activity',
      jsonb_build_object(
        'recipient_id', v_user.id,
        'city', p_city,
        'title', p_title,
        'body', p_body
      )
    );
    v_notified := v_notified + 1;
  end loop;

  return v_notified;
end;
$$;

grant execute on function public.notify_city_activity(text, text, text, text) to authenticated;

-- 13. Admin Broadcast Dispatcher RPC
create or replace function public.cms_send_broadcast(
  p_actor_id uuid,
  p_title text,
  p_body text,
  p_category text default 'broadcast',
  p_priority text default 'normal',
  p_deep_link text default null,
  p_audience_type text default 'all', -- 'all', 'travelers', 'senders', 'city', 'users'
  p_audience_filter text default null  -- city name, or comma-separated user IDs
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_is_admin boolean;
  v_broadcast_id uuid;
  v_recipient record;
  v_targeted integer := 0;
  v_user_ids uuid[];
begin
  -- Check admin permission
  select (system_role = 'admin') into v_is_admin
  from public.user_profiles
  where id = p_actor_id;

  if not coalesce(v_is_admin, false) then
    raise exception 'Unauthorized: Administrator access required';
  end if;

  if nullif(trim(p_title), '') is null or nullif(trim(p_body), '') is null then
    raise exception 'Title and body are required';
  end if;

  insert into public.admin_broadcasts (
    created_by,
    title,
    body,
    category,
    priority,
    deep_link,
    target_audience,
    sent_at
  ) values (
    p_actor_id,
    trim(p_title),
    trim(p_body),
    coalesce(p_category, 'broadcast'),
    coalesce(p_priority, 'normal'),
    nullif(trim(p_deep_link), ''),
    jsonb_build_object('type', p_audience_type, 'filter', p_audience_filter),
    now()
  ) returning id into v_broadcast_id;

  -- Fan out based on audience type
  for v_recipient in
    select id
    from public.user_profiles
    where is_deleted = false
      and (
        p_audience_type = 'all'
        or (p_audience_type = 'travelers' and role = 'traveler')
        or (p_audience_type = 'senders' and role = 'sender')
        or (p_audience_type = 'city' and lower(trim(coalesce(city, current_city, ''))) = lower(trim(p_audience_filter)))
        or (p_audience_type = 'users' and id::text = any(string_to_array(p_audience_filter, ',')))
      )
  loop
    perform public.emit_domain_event(
      p_actor_id,
      'admin_broadcast',
      v_broadcast_id,
      'broadcast_sent',
      'admin.broadcast',
      jsonb_build_object(
        'broadcast_id', v_broadcast_id,
        'recipient_id', v_recipient.id,
        'title', p_title,
        'body', p_body,
        'category', p_category,
        'priority', p_priority,
        'deep_link', p_deep_link
      )
    );
    v_targeted := v_targeted + 1;
  end loop;

  update public.admin_broadcasts
  set total_targeted = v_targeted,
      total_sent = v_targeted
  where id = v_broadcast_id;

  return v_broadcast_id;
end;
$$;

grant execute on function public.cms_send_broadcast(uuid, text, text, text, text, text, text, text) to service_role, authenticated;
