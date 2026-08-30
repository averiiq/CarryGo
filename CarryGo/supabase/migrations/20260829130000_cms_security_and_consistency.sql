-- CMS authorization, durable throttling, and atomic administrative workflows.

alter type public.kyc_status add value if not exists 'under_review';

create or replace function public.assert_cms_admin(p_actor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.user_profiles
    where id = p_actor_id
      and system_role = 'admin'
      and status = 'active'
  ) then
    raise exception 'Admin access required';
  end if;
end;
$$;

create table if not exists public.cms_login_rate_limits (
  key_hash text not null,
  attempted_at timestamptz not null default now()
);

create index if not exists cms_login_rate_limits_key_time_idx
  on public.cms_login_rate_limits (key_hash, attempted_at desc);

alter table public.cms_login_rate_limits enable row level security;

create or replace function public.consume_cms_login_attempt(p_key text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_key_hash text;
  v_count integer;
begin
  if p_key is null or length(trim(p_key)) = 0 then
    return false;
  end if;

  v_key_hash := encode(digest(trim(p_key), 'sha256'), 'hex');
  perform pg_advisory_xact_lock(hashtextextended(v_key_hash, 0));

  delete from public.cms_login_rate_limits
  where attempted_at < now() - interval '24 hours';

  select count(*) into v_count
  from public.cms_login_rate_limits
  where key_hash = v_key_hash
    and attempted_at > now() - interval '1 minute';

  if v_count >= 5 then return false; end if;

  insert into public.cms_login_rate_limits (key_hash) values (v_key_hash);
  return true;
end;
$$;

create or replace function public.cms_review_kyc(
  p_actor_id uuid,
  p_session_id uuid,
  p_action text,
  p_reason text default null,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.kyc_sessions%rowtype;
  v_missing_documents text[];
begin
  perform public.assert_cms_admin(p_actor_id);
  select * into v_session from public.kyc_sessions where id = p_session_id for update;
  if not found then raise exception 'KYC session not found'; end if;

  if p_action = 'approved' then
    select array_agg(required_type) into v_missing_documents
    from unnest(array['id_front', 'selfie']) required_type
    where not exists (
      select 1 from public.kyc_documents
      where session_id = p_session_id and document_type = required_type
    );
    if coalesce(array_length(v_missing_documents, 1), 0) > 0 then
      raise exception 'Missing required documents: %', array_to_string(v_missing_documents, ', ');
    end if;
    update public.kyc_sessions set status = 'approved', rejection_reason = null,
      reviewed_by = p_actor_id, reviewed_at = now() where id = p_session_id;
    update public.user_profiles set kyc_status = 'approved', verified = true where id = v_session.user_id;
  elsif p_action = 'rejected' then
    if length(trim(coalesce(p_reason, ''))) < 10 then raise exception 'Rejection reason must be at least 10 characters'; end if;
    update public.kyc_sessions set status = 'rejected', rejection_reason = p_reason,
      reviewed_by = p_actor_id, reviewed_at = now() where id = p_session_id;
    update public.user_profiles set kyc_status = 'rejected', verified = false where id = v_session.user_id;
  elsif p_action = 'requested_resubmission' then
    if length(trim(coalesce(p_reason, ''))) < 10 then raise exception 'Reason must be at least 10 characters'; end if;
    update public.kyc_sessions set status = 'pending', rejection_reason = p_reason,
      submission_attempt = coalesce(submission_attempt, 1) + 1,
      reviewed_by = p_actor_id, reviewed_at = now() where id = p_session_id;
    update public.user_profiles set kyc_status = 'pending', verified = false where id = v_session.user_id;
  elsif p_action = 'note_added' then
    if length(trim(coalesce(p_note, ''))) = 0 then raise exception 'Note cannot be empty'; end if;
    update public.kyc_sessions set reviewer_notes = p_note where id = p_session_id;
  else
    raise exception 'Invalid KYC review action';
  end if;

  insert into public.kyc_review_history (session_id, reviewer_id, action, reason, notes)
  values (p_session_id, p_actor_id, p_action, p_reason, p_note);

  insert into public.audit_events (actor_id, entity_type, entity_id, event_type, payload)
  values (p_actor_id, 'kyc_session', p_session_id, 'kyc.' || p_action,
    jsonb_build_object('user_id', v_session.user_id, 'reason', p_reason));
end;
$$;

create or replace function public.cms_bulk_approve_kyc(p_actor_id uuid, p_user_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  perform public.assert_cms_admin(p_actor_id);
  if coalesce(array_length(p_user_ids, 1), 0) = 0 or array_length(p_user_ids, 1) > 100 then
    raise exception 'Invalid batch size';
  end if;

  with eligible as (
    select distinct on (s.user_id) s.id, s.user_id
    from public.kyc_sessions s
    where s.user_id = any(p_user_ids)
      and s.status = 'submitted'
      and exists (select 1 from public.kyc_documents d where d.session_id = s.id and d.document_type = 'id_front')
      and exists (select 1 from public.kyc_documents d where d.session_id = s.id and d.document_type = 'selfie')
    order by s.user_id, s.created_at desc
  ), updated_sessions as (
    update public.kyc_sessions s
    set status = 'approved', reviewed_by = p_actor_id, reviewed_at = now(), rejection_reason = null
    from eligible e where s.id = e.id
    returning s.id, s.user_id
  ), updated_profiles as (
    update public.user_profiles p
    set kyc_status = 'approved', verified = true
    where p.id in (select user_id from updated_sessions)
    returning p.id
  ), history as (
    insert into public.kyc_review_history (session_id, reviewer_id, action)
    select id, p_actor_id, 'approved' from updated_sessions
    returning 1
  )
  select count(*) into v_count from updated_profiles;

  if v_count = 0 then raise exception 'No eligible KYC sessions found'; end if;
  insert into public.audit_events (actor_id, entity_type, entity_id, event_type, payload)
  values (p_actor_id, 'admin_action', p_actor_id, 'bulk_verify_users', jsonb_build_object('count', v_count));
  return v_count;
end;
$$;

create or replace function public.cms_resolve_dispute(
  p_actor_id uuid,
  p_request_id uuid,
  p_resolution text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.requests%rowtype;
  v_payment_status public.payment_status;
begin
  perform public.assert_cms_admin(p_actor_id);
  if p_resolution not in ('refund_sender', 'pay_traveller') then
    raise exception 'Unsupported dispute resolution';
  end if;

  select * into v_request from public.requests where id = p_request_id for update;
  if not found then raise exception 'Request not found'; end if;
  if v_request.status <> 'failed' then raise exception 'Only failed requests can be resolved'; end if;

  v_payment_status := case when p_resolution = 'refund_sender' then 'refunded' else 'released' end;
  update public.payments
  set status = v_payment_status,
      released_at = case when v_payment_status = 'released' then now() else released_at end
  where request_id = p_request_id and status = 'locked';

  if not found then raise exception 'Locked payment not found'; end if;

  update public.requests
  set status = case when p_resolution = 'refund_sender' then 'cancelled' else 'completed' end,
      message = case when p_note is null then '[RESOLVED: ' || p_resolution || ']'
        else '[RESOLVED: ' || p_resolution || '] ' || p_note end,
      updated_at = now()
  where id = p_request_id;

  insert into public.audit_events (actor_id, entity_type, entity_id, event_type, payload)
  values (p_actor_id, 'request', p_request_id, 'resolve_dispute',
    jsonb_build_object('resolution', p_resolution, 'note', p_note));
end;
$$;

create or replace function public.cms_payment_totals(p_actor_id uuid)
returns table (released numeric, locked numeric, refunded numeric)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_cms_admin(p_actor_id);
  return query select
    coalesce(sum(amount) filter (where status = 'released'), 0),
    coalesce(sum(amount) filter (where status = 'locked'), 0),
    coalesce(sum(amount) filter (where status = 'refunded'), 0)
  from public.payments;
end;
$$;

revoke all on function public.assert_cms_admin(uuid) from public, anon, authenticated;
revoke all on function public.consume_cms_login_attempt(text) from public, anon, authenticated;
revoke all on function public.cms_review_kyc(uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.cms_bulk_approve_kyc(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.cms_resolve_dispute(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.cms_payment_totals(uuid) from public, anon, authenticated;

grant execute on function public.consume_cms_login_attempt(text) to service_role;
grant execute on function public.cms_review_kyc(uuid, uuid, text, text, text) to service_role;
grant execute on function public.cms_bulk_approve_kyc(uuid, uuid[]) to service_role;
grant execute on function public.cms_resolve_dispute(uuid, uuid, text, text) to service_role;
grant execute on function public.cms_payment_totals(uuid) to service_role;
