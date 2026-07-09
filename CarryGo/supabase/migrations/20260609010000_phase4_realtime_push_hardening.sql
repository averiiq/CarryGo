-- CarryGo phase 4 completion:
-- - multi-device push token storage
-- - server-authored route/chat/request notifications
-- - push delivery tracking foundations

create table public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  device_key text not null,
  expo_push_token text not null,
  platform text,
  app_version text,
  failure_count integer not null default 0 check (failure_count >= 0),
  invalidated_at timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_devices_user_device_key_unique unique (user_id, device_key)
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_device_id uuid not null references public.user_devices(id) on delete cascade,
  expo_ticket_id text,
  expo_receipt_id text,
  status text not null default 'pending'
    check (status in ('pending', 'ticketed', 'delivered', 'failed', 'invalid_token')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  sent_at timestamptz,
  delivered_at timestamptz,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_deliveries_notification_device_unique unique (notification_id, user_device_id)
);

create index user_devices_user_active_idx
  on public.user_devices (user_id, invalidated_at, last_seen_at desc);

create index user_devices_active_token_idx
  on public.user_devices (expo_push_token)
  where invalidated_at is null;

create index notification_deliveries_status_idx
  on public.notification_deliveries (status, created_at);

create index notification_deliveries_ticket_idx
  on public.notification_deliveries (expo_ticket_id)
  where expo_ticket_id is not null;

create trigger set_user_devices_updated_at
before update on public.user_devices
for each row execute function public.set_updated_at();

create trigger set_notification_deliveries_updated_at
before update on public.notification_deliveries
for each row execute function public.set_updated_at();

alter table public.user_devices enable row level security;
alter table public.notification_deliveries enable row level security;

create policy "user_devices_select_own"
on public.user_devices for select to authenticated
using (user_id = auth.uid());

create policy "user_devices_no_client_mutation"
on public.user_devices for all to authenticated
using (false) with check (false);

create policy "notification_deliveries_no_client_access"
on public.notification_deliveries for all to authenticated
using (false) with check (false);

create or replace function public.upsert_user_device(
  p_device_key text,
  p_expo_push_token text,
  p_platform text default null,
  p_app_version text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor_id uuid := auth.uid();
  v_device_id uuid;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  if nullif(trim(coalesce(p_device_key, '')), '') is null then
    raise exception 'Device key is required';
  end if;

  if nullif(trim(coalesce(p_expo_push_token, '')), '') is null then
    raise exception 'Expo push token is required';
  end if;

  insert into public.user_devices (
    user_id,
    device_key,
    expo_push_token,
    platform,
    app_version,
    invalidated_at,
    failure_count,
    last_seen_at
  )
  values (
    v_actor_id,
    trim(p_device_key),
    trim(p_expo_push_token),
    nullif(trim(coalesce(p_platform, '')), ''),
    nullif(trim(coalesce(p_app_version, '')), ''),
    null,
    0,
    now()
  )
  on conflict (user_id, device_key)
  do update set
    expo_push_token = excluded.expo_push_token,
    platform = excluded.platform,
    app_version = excluded.app_version,
    invalidated_at = null,
    failure_count = 0,
    last_seen_at = now()
  returning id into v_device_id;

  return v_device_id;
end;
$$;

create or replace function public.notify_route_subscribers(
  p_listing_type text,
  p_listing_id uuid,
  p_from_city text,
  p_to_city text,
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
  v_notified integer := 0;
  v_subscriber record;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  if nullif(trim(coalesce(p_listing_type, '')), '') is null then
    raise exception 'Listing type is required';
  end if;

  if p_listing_id is null then
    raise exception 'Listing id is required';
  end if;

  for v_subscriber in
    select rs.user_id
    from public.route_subscriptions rs
    where rs.active = true
      and lower(trim(rs.from_city)) = lower(trim(p_from_city))
      and lower(trim(rs.to_city)) = lower(trim(p_to_city))
      and rs.user_id <> v_actor_id
  loop
    perform public.emit_domain_event(
      v_actor_id,
      p_listing_type,
      p_listing_id,
      'route_match_notified',
      'route.match',
      jsonb_build_object(
        'recipient_id', v_subscriber.user_id,
        'title', p_title,
        'body', p_body,
        'related_id', p_listing_id,
        'listing_type', p_listing_type,
        'from_city', p_from_city,
        'to_city', p_to_city
      )
    );
    v_notified := v_notified + 1;
  end loop;

  return v_notified;
end;
$$;

create or replace function public.send_chat_message_command(
  p_conversation_id uuid,
  p_text text
)
returns table (
  id uuid,
  conversation_id uuid,
  sender_id uuid,
  sender_name text,
  text text,
  read boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor_id uuid := auth.uid();
  v_conversation public.conversations%rowtype;
  v_message public.messages%rowtype;
  v_sender_name text;
  v_recipient_id uuid;
  v_preview text;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  if nullif(trim(coalesce(p_text, '')), '') is null then
    raise exception 'Message text cannot be empty';
  end if;

  select * into v_conversation
  from public.conversations
  where conversations.id = p_conversation_id;

  if not found then
    raise exception 'Conversation not found';
  end if;

  if not (v_actor_id = any(v_conversation.participant_ids)) then
    raise exception 'Only conversation participants can send messages';
  end if;

  select coalesce(nullif(trim(full_name), ''), nullif(trim(username), ''), split_part(email, '@', 1), 'User')
  into v_sender_name
  from public.user_profiles
  where id = v_actor_id;

  insert into public.messages (
    conversation_id,
    sender_id,
    sender_name,
    text
  )
  values (
    v_conversation.id,
    v_actor_id,
    v_sender_name,
    trim(p_text)
  )
  returning * into v_message;

  update public.conversations
  set last_message_text = v_message.text,
      last_message_at = v_message.created_at,
      last_message_sender_id = v_actor_id,
      last_message_read = false
  where id = v_conversation.id;

  select participant_id
  into v_recipient_id
  from unnest(v_conversation.participant_ids) as participant_id
  where participant_id <> v_actor_id
  limit 1;

  if v_recipient_id is not null then
    v_preview := case
      when char_length(v_message.text) > 90 then left(v_message.text, 87) || '...'
      else v_message.text
    end;

    perform public.emit_domain_event(
      v_actor_id,
      'conversation',
      v_conversation.id,
      'chat_message_sent',
      'chat.message',
      jsonb_build_object(
        'recipient_id', v_recipient_id,
        'title', v_sender_name || ' sent a message',
        'body', v_preview,
        'related_id', v_conversation.id
      )
    );
  end if;

  return query
    select
      v_message.id,
      v_message.conversation_id,
      v_message.sender_id,
      v_message.sender_name,
      v_message.text,
      v_message.read,
      v_message.created_at;
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

    if v_event.topic = 'request.created' then
      insert into public.notifications (user_id, title, body, type, related_id)
      values (
        (v_payload ->> 'traveller_id')::uuid,
        'New Delivery Request!',
        'A sender wants to book space on your route. Review the request details in CarryGo.',
        'new_request',
        (v_payload ->> 'request_id')::uuid
      );
    elsif v_event.topic = 'request.accepted' then
      insert into public.notifications (user_id, title, body, type, related_id)
      values (
        (
          select sender_id
          from public.requests
          where id = (v_payload ->> 'request_id')::uuid
        ),
        'Request Accepted!',
        'Your traveller accepted the request. Open chat to coordinate pickup.',
        'request_accepted',
        (v_payload ->> 'request_id')::uuid
      );
    elsif v_event.topic = 'request.rejected' then
      insert into public.notifications (user_id, title, body, type, related_id)
      values (
        (
          select sender_id
          from public.requests
          where id = (v_payload ->> 'request_id')::uuid
        ),
        'Request Rejected',
        'The traveller declined this request. Browse other listings on the route.',
        'request_rejected',
        (v_payload ->> 'request_id')::uuid
      );
    elsif v_event.topic = 'request.cancelled' then
      insert into public.notifications (user_id, title, body, type, related_id)
      values (
        (
          select traveller_id
          from public.requests
          where id = (v_payload ->> 'request_id')::uuid
        ),
        'Request Cancelled',
        'The sender cancelled this delivery request.',
        'general',
        (v_payload ->> 'request_id')::uuid
      );
    elsif v_event.topic = 'route.match' then
      insert into public.notifications (user_id, title, body, type, related_id)
      values (
        (v_payload ->> 'recipient_id')::uuid,
        coalesce(v_payload ->> 'title', 'New Route Match'),
        coalesce(v_payload ->> 'body', 'A new listing matches one of your saved routes.'),
        'route_match',
        (v_payload ->> 'related_id')::uuid
      );
    elsif v_event.topic = 'chat.message' then
      insert into public.notifications (user_id, title, body, type, related_id)
      values (
        (v_payload ->> 'recipient_id')::uuid,
        coalesce(v_payload ->> 'title', 'New message'),
        coalesce(v_payload ->> 'body', 'You have a new chat message in CarryGo.'),
        'chat_message',
        (v_payload ->> 'related_id')::uuid
      );
    elsif v_event.topic = 'delivery.picked_up' then
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
