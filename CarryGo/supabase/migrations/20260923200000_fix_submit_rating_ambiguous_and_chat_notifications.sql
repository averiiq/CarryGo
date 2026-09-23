-- =============================================================================
-- Migration: 20260923200000_fix_submit_rating_ambiguous_and_chat_notifications.sql
-- Description:
-- 1. Fixes PL/pgSQL column ambiguity in submit_rating_command (where deliveries.request_id = p_request_id).
-- 2. Restores resilient insert policy on public.ratings for authenticated users.
-- 3. Upgrades send_chat_message_command to immediately insert into public.notifications,
--    triggering real-time in-app notification alerts for the message recipient.
-- 4. Creates dispatch_notification_command and get_user_push_tokens helper RPCs
--    so client-side notification dispatches can bypass RLS securely and deliver push notifications.
-- 5. Ensures REPLICA IDENTITY FULL on public.notifications for realtime change subscriptions.
-- =============================================================================

-- 1. Fix submit_rating_command with fully qualified table aliases
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
  v_is_delivered boolean := false;
  v_actor_name text;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5';
  end if;

  select * into v_request
  from public.requests req
  where req.id = p_request_id;

  if not found then
    raise exception 'Request not found';
  end if;

  -- Fully qualify deliveries.request_id to prevent ambiguity with output parameter 'request_id'
  select (del.delivery_confirmed = true or del.status = 'delivered') into v_is_delivered
  from public.deliveries del
  where del.request_id = p_request_id
  limit 1;

  if v_request.status <> 'completed' and not coalesce(v_is_delivered, false) then
    raise exception 'Ratings are only allowed after a completed delivery';
  end if;

  -- Ensure request status is marked completed
  if v_request.status <> 'completed' then
    update public.requests req
    set status = 'completed', updated_at = now()
    where req.id = v_request.id;
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

  -- Safely update average rating in user_profiles
  begin
    update public.user_profiles profile
    set rating = round((
      select avg(r.rating)::numeric
      from public.ratings r
      where r.to_user_id = p_to_user_id
    )::numeric, 1),
    total_ratings = (
      select count(*)::integer
      from public.ratings r
      where r.to_user_id = p_to_user_id
    )
    where profile.id = p_to_user_id;
  exception when others then
    null;
  end;

  -- Fetch actor name for notification
  select coalesce(full_name, username, 'A user') into v_actor_name
  from public.user_profiles
  where public.user_profiles.id = v_actor_id;

  -- Directly insert notification for the rated participant so in-app center updates immediately
  begin
    insert into public.notifications (
      user_id,
      title,
      body,
      type,
      category,
      priority,
      deep_link,
      related_id,
      idempotency_key
    ) values (
      p_to_user_id,
      '⭐ New ' || p_rating || '-Star Rating!',
      coalesce(nullif(trim(coalesce(p_comment, '')), ''), v_actor_name || ' left you a rating for completed delivery.'),
      'rating',
      'general',
      'normal',
      '/(tabs)/profile',
      v_rating.id,
      'rating_' || v_rating.id
    ) on conflict (idempotency_key) do nothing;
  exception when others then
    null;
  end;

  -- Emit domain event for outbox audit
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
end;
$$;

grant execute on function public.submit_rating_command(uuid, uuid, integer, text) to authenticated, anon;

-- 2. Restores resilient direct INSERT policy on public.ratings
grant insert on public.ratings to authenticated;
drop policy if exists "ratings_insert_from_user" on public.ratings;
create policy "ratings_insert_from_user" on public.ratings
  for insert to authenticated
  with check (from_user_id = auth.uid());

-- 3. Upgrade send_chat_message_command to directly insert into public.notifications
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
  v_sender_name text;
  v_message public.messages%rowtype;
  v_clean_text text := trim(coalesce(p_text, ''));
  v_recipient_id uuid;
  v_preview text;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;
  if length(v_clean_text) = 0 then
    raise exception 'Message text cannot be empty';
  end if;
  if length(v_clean_text) > 1000 then
    raise exception 'Message text exceeds 1000 characters';
  end if;

  select *
  into v_conversation
  from public.conversations c
  where c.id = p_conversation_id;

  if not found then
    raise exception 'Conversation not found';
  end if;

  if not (v_actor_id = any(v_conversation.participant_ids)) then
    raise exception 'You are not a participant in this conversation';
  end if;

  select coalesce(up.full_name, up.username, 'User')
  into v_sender_name
  from public.user_profiles up
  where up.id = v_actor_id;

  v_sender_name := coalesce(v_sender_name, 'User');

  insert into public.messages (
    conversation_id,
    sender_id,
    sender_name,
    text,
    read
  )
  values (
    v_conversation.id,
    v_actor_id,
    v_sender_name,
    v_clean_text,
    false
  )
  returning * into v_message;

  update public.conversations c
  set last_message_text = v_message.text,
      last_message_at = v_message.created_at,
      last_message_sender_id = v_actor_id,
      last_message_read = false
  where c.id = v_conversation.id;

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

    -- Directly insert into public.notifications so recipient's Realtime channel
    -- immediately delivers the message notification banner in-app!
    begin
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
        v_recipient_id,
        '💬 ' || v_sender_name,
        v_preview,
        'chat_message',
        'message',
        'high',
        '/chat/' || v_conversation.id,
        jsonb_build_object(
          'conversationId', v_conversation.id,
          'senderId', v_actor_id,
          'senderName', v_sender_name,
          'messageId', v_message.id
        ),
        'chat_msg_' || v_message.id,
        v_conversation.id
      ) on conflict (idempotency_key) do nothing;
    exception when others then
      null;
    end;

    -- Emit domain event for outbox consistency
    perform public.emit_domain_event(
      v_actor_id,
      'conversation',
      v_conversation.id,
      'chat_message_sent',
      'chat.message',
      jsonb_build_object(
        'message_id', v_message.id,
        'recipient_id', v_recipient_id,
        'title', '💬 ' || v_sender_name,
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

revoke all on function public.send_chat_message_command(uuid, text) from public;
grant execute on function public.send_chat_message_command(uuid, text) to authenticated;

-- 4. Helper RPC to fetch user push tokens securely for push delivery
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

-- 5. Atomic dispatch_notification_command RPC for client notifications
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
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;
  if p_recipient_id is null then
    raise exception 'Recipient ID is required';
  end if;

  if p_type = 'chat_message' then
    v_category := 'message';
    v_priority := 'high';
    v_idempotency_key := 'chat_' || coalesce(p_data ->> 'messageId', gen_random_uuid()::text);
  elsif p_type like 'delivery_%' then
    v_category := 'parcel_update';
    v_priority := 'high';
  elsif p_type like 'request_%' then
    v_category := 'matching';
    v_priority := 'high';
  end if;

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
    p_type::public.notification_type,
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

  select coalesce(public.get_user_push_tokens(p_recipient_id), array[]::text[])
  into v_tokens;

  return query
    select coalesce(v_notif_id, gen_random_uuid()), coalesce(v_tokens, array[]::text[]);
end;
$$;

grant execute on function public.dispatch_notification_command(uuid, text, text, text, text, text, jsonb) to authenticated;

-- 6. Ensure full replica identity on public.notifications
alter table public.notifications replica identity full;
