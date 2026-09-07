-- Fix ambiguous column reference in send_chat_message_command
-- The RETURNS TABLE output parameter names (specifically `id`) conflict with
-- unqualified column names in `where id = v_actor_id` and `where id = v_conversation.id`.
-- Explicitly qualify all table column references.

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
  from public.conversations c
  where c.id = p_conversation_id;

  if not found then
    raise exception 'Conversation not found';
  end if;

  if not (v_actor_id = any(v_conversation.participant_ids)) then
    raise exception 'Only conversation participants can send messages';
  end if;

  select coalesce(nullif(trim(up.full_name), ''), nullif(trim(up.username), ''), split_part(up.email, '@', 1), 'User')
  into v_sender_name
  from public.user_profiles up
  where up.id = v_actor_id;

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

revoke all on function public.send_chat_message_command(uuid, text) from public;
grant execute on function public.send_chat_message_command(uuid, text) to authenticated;
