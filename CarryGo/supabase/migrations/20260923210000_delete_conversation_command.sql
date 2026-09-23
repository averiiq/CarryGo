-- =============================================================================
-- Migration: 20260923210000_delete_conversation_command.sql
-- Description:
-- 1. Creates delete_conversation_command RPC allowing participants to delete
--    a completed delivery conversation (and all its cascade-deleted messages).
-- 2. Grants DELETE on public.conversations with RLS policy for participants.
-- =============================================================================

-- 1. Create delete_conversation_command RPC
create or replace function public.delete_conversation_command(
  p_conversation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor_id uuid := auth.uid();
  v_conversation public.conversations%rowtype;
  v_request public.requests%rowtype;
  v_is_delivered boolean := false;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
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

  -- Verify delivery completion
  select *
  into v_request
  from public.requests req
  where req.id = v_conversation.request_id;

  select (del.delivery_confirmed = true or del.status = 'delivered')
  into v_is_delivered
  from public.deliveries del
  where del.request_id = v_conversation.request_id
  limit 1;

  if coalesce(v_request.status, '') <> 'completed' and not coalesce(v_is_delivered, false) then
    raise exception 'Chats can only be deleted after the delivery is completed';
  end if;

  -- Delete conversation. All messages cascade delete automatically.
  delete from public.conversations where id = p_conversation_id;

  -- Clean up in-app notifications tied to this conversation
  begin
    delete from public.notifications
    where user_id = v_actor_id
      and (related_id = p_conversation_id or deep_link = '/chat/' || p_conversation_id::text);
  exception when others then
    null;
  end;

  -- Emit domain event for audit & analytics tracking
  perform public.emit_domain_event(
    v_actor_id,
    'conversation',
    p_conversation_id,
    'conversation_deleted',
    'conversation.deleted',
    jsonb_build_object(
      'conversation_id', p_conversation_id,
      'deleted_by', v_actor_id,
      'request_id', v_conversation.request_id
    )
  );

  return true;
end;
$$;

grant execute on function public.delete_conversation_command(uuid) to authenticated;

-- 2. Grant DELETE on public.conversations with RLS policy for authenticated participants
grant delete on public.conversations to authenticated;
drop policy if exists "conversations_delete_participant" on public.conversations;
create policy "conversations_delete_participant" on public.conversations
  for delete to authenticated
  using (auth.uid() = any(participant_ids));
