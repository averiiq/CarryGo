-- Release hardening: preserve the reviewer login account while removing
-- privileged payment/delivery behavior and enforcing server-side invariants.

alter type public.parcel_status add value if not exists 'cancelled';

create table if not exists public.razorpay_orders (
  order_id text primary key,
  request_id uuid not null references public.requests(id) on delete cascade,
  sender_id uuid not null references public.user_profiles(id) on delete cascade,
  amount_paise bigint not null check (amount_paise > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  status text not null default 'created' check (status in ('created', 'verified', 'failed')),
  payment_id text unique,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

create index if not exists razorpay_orders_request_created_idx
  on public.razorpay_orders (request_id, created_at desc);

alter table public.razorpay_orders enable row level security;

create unique index if not exists payments_razorpay_payment_id_unique
  on public.payments (razorpay_payment_id)
  where razorpay_payment_id is not null;

drop policy if exists "requests_insert_sender" on public.requests;
drop policy if exists "requests_update_participant" on public.requests;
drop policy if exists "deliveries_update_participant" on public.deliveries;
drop policy if exists "payments_insert_sender" on public.payments;
drop policy if exists "payments_update_participant" on public.payments;
drop policy if exists "ratings_insert_from_user" on public.ratings;
drop policy if exists "conversations_insert_participant" on public.conversations;
drop policy if exists "conversations_update_participant" on public.conversations;
drop policy if exists "messages_insert_participant" on public.messages;
drop policy if exists "messages_update_participant" on public.messages;
drop policy if exists "messages_update_read_only" on public.messages;
drop policy if exists "notifications_insert_own" on public.notifications;

create or replace function public.guard_user_profile_write()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role public.system_role;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if v_actor_id is null or new.id is distinct from v_actor_id then
      raise exception 'Cannot create a profile for another user';
    end if;
    new.email := coalesce(nullif(auth.jwt() ->> 'email', ''), new.email);
    new.rating := 4.50;
    new.total_deliveries := 0;
    new.total_trips := 0;
    new.verified := false;
    new.kyc_status := 'pending';
    new.system_role := 'user';
    new.status := 'active';
    return new;
  end if;

  select public.get_system_role() into v_actor_role;
  if v_actor_role = 'admin' then
    return new;
  end if;
  if v_actor_id is null or old.id is distinct from v_actor_id or new.id is distinct from old.id then
    raise exception 'Cannot update another user profile';
  end if;
  if new.email is distinct from old.email
     or new.rating is distinct from old.rating
     or new.total_deliveries is distinct from old.total_deliveries
     or new.total_trips is distinct from old.total_trips
     or new.verified is distinct from old.verified
     or new.kyc_status is distinct from old.kyc_status
     or new.system_role is distinct from old.system_role
     or new.status is distinct from old.status
     or new.joined_at is distinct from old.joined_at
     or new.created_at is distinct from old.created_at then
    raise exception 'Protected profile fields can only be changed by trusted server operations';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_user_profile_write_trigger on public.user_profiles;
create trigger guard_user_profile_write_trigger
before insert or update on public.user_profiles
for each row execute function public.guard_user_profile_write();

create or replace function public.guard_listing_insert()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_name text;
  v_rating numeric;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if auth.uid() is null or new.user_id is distinct from auth.uid() then
    raise exception 'Cannot create a listing for another user';
  end if;
  select coalesce(nullif(trim(full_name), ''), nullif(trim(username), ''), split_part(email, '@', 1), 'User'), rating
    into v_name, v_rating
    from public.user_profiles where id = auth.uid();
  new.user_name := v_name;
  if tg_table_name = 'trips' then
    new.user_rating := coalesce(v_rating, 0);
    new.status := 'active';
  else
    new.status := 'open';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_trip_insert_trigger on public.trips;
create trigger guard_trip_insert_trigger before insert on public.trips
for each row execute function public.guard_listing_insert();
drop trigger if exists guard_parcel_insert_trigger on public.parcels;
create trigger guard_parcel_insert_trigger before insert on public.parcels
for each row execute function public.guard_listing_insert();

drop policy if exists "trips_update_own" on public.trips;
drop policy if exists "parcels_update_own" on public.parcels;

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
end;
$$;

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
end;
$$;

create or replace function public.update_delivery_location(
  p_delivery_id uuid,
  p_lat numeric,
  p_lng numeric
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_request public.requests%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Invalid location coordinates';
  end if;
  select r.* into v_request
    from public.deliveries d join public.requests r on r.id = d.request_id
    where d.id = p_delivery_id;
  if not found then raise exception 'Delivery not found'; end if;
  if v_request.traveller_id is distinct from auth.uid() then
    raise exception 'Only the assigned traveller can update location';
  end if;
  update public.deliveries
    set traveller_lat = p_lat, traveller_lng = p_lng, location_updated_at = now()
    where id = p_delivery_id and status in ('picked_up', 'in_transit');
  if not found then raise exception 'Location sharing is not active for this delivery'; end if;
end;
$$;

create or replace function public.create_conversation_for_request(p_request_id uuid)
returns setof public.conversations
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_request public.requests%rowtype;
  v_parcel public.parcels%rowtype;
  v_trip public.trips%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_request from public.requests where id = p_request_id;
  if not found then raise exception 'Request not found'; end if;
  if auth.uid() not in (v_request.sender_id, v_request.traveller_id) then
    raise exception 'Only request participants can create a conversation';
  end if;
  select * into v_parcel from public.parcels where id = v_request.parcel_id;
  select * into v_trip from public.trips where id = v_request.trip_id;
  return query
  insert into public.conversations (
    request_id, participant_ids, participant_names, route, parcel_description
  ) values (
    v_request.id,
    array[v_request.sender_id, v_request.traveller_id],
    jsonb_build_object(v_request.sender_id::text, v_request.sender_name, v_request.traveller_id::text, v_request.traveller_name),
    v_trip.from_city || ' to ' || v_trip.to_city,
    v_parcel.description
  )
  on conflict (request_id) do update set request_id = excluded.request_id
  returning public.conversations.*;
end;
$$;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor_id uuid := auth.uid();
  v_conversation public.conversations%rowtype;
begin
  if v_actor_id is null then raise exception 'Authentication required'; end if;
  select * into v_conversation from public.conversations where id = p_conversation_id;
  if not found or not (v_actor_id = any(v_conversation.participant_ids)) then
    raise exception 'Conversation not found';
  end if;
  update public.messages set read = true
    where conversation_id = p_conversation_id and sender_id <> v_actor_id;
  update public.conversations set last_message_read = true
    where id = p_conversation_id;
end;
$$;

create or replace function public.guard_notification_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if auth.uid() is null or old.user_id is distinct from auth.uid()
       or new.id is distinct from old.id
       or new.user_id is distinct from old.user_id
       or new.title is distinct from old.title
       or new.body is distinct from old.body
       or new.type is distinct from old.type
       or new.related_id is distinct from old.related_id
       or new.created_at is distinct from old.created_at
       or (old.read = true and new.read = false) then
      raise exception 'Only marking a notification as read is allowed';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_notification_update_trigger on public.notifications;
create trigger guard_notification_update_trigger before update on public.notifications
for each row execute function public.guard_notification_update();

drop policy if exists "kyc_documents_update_own_pending" on public.kyc_documents;
create policy "kyc_documents_update_own_pending" on public.kyc_documents
  for update to authenticated
  using (exists (
    select 1 from public.kyc_sessions s
    where s.id = kyc_documents.session_id and s.user_id = auth.uid() and s.status = 'pending'
  ))
  with check (exists (
    select 1 from public.kyc_sessions s
    where s.id = kyc_documents.session_id and s.user_id = auth.uid() and s.status = 'pending'
  ));

create or replace function public.guard_kyc_session_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if auth.uid() is null or new.user_id is distinct from auth.uid() then
      raise exception 'Cannot create a KYC session for another user';
    end if;
    new.status := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.rejection_reason := null;
    new.reviewer_notes := null;
    new.submission_attempt := 1;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_kyc_session_insert_trigger on public.kyc_sessions;
create trigger guard_kyc_session_insert_trigger before insert on public.kyc_sessions
for each row execute function public.guard_kyc_session_insert();

create or replace function public.guard_kyc_document_write()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_owner_id uuid;
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  select user_id into v_owner_id from public.kyc_sessions where id = new.session_id;
  if v_owner_id is distinct from auth.uid() then raise exception 'KYC session not found'; end if;
  if new.storage_path not like ('kyc-documents/' || auth.uid()::text || '/%') then
    raise exception 'Invalid KYC document path';
  end if;
  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.session_id is distinct from old.session_id
    or new.document_type is distinct from old.document_type
    or new.uploaded_at is distinct from old.uploaded_at
  ) then
    raise exception 'KYC document identity fields are immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_kyc_document_write_trigger on public.kyc_documents;
create trigger guard_kyc_document_write_trigger before insert or update on public.kyc_documents
for each row execute function public.guard_kyc_document_write();

create or replace function public.submit_kyc_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor_id uuid := auth.uid();
  v_session public.kyc_sessions%rowtype;
  v_document_count integer;
begin
  if v_actor_id is null then raise exception 'Authentication required'; end if;
  select * into v_session from public.kyc_sessions where id = p_session_id for update;
  if not found or v_session.user_id is distinct from v_actor_id then raise exception 'KYC session not found'; end if;
  if v_session.status <> 'pending' then raise exception 'KYC session cannot be submitted'; end if;
  select count(distinct document_type) into v_document_count
    from public.kyc_documents
    where session_id = p_session_id
      and document_type in ('id_front', 'id_back', 'selfie', 'address_proof');
  if v_document_count <> 4 then raise exception 'All required documents must be uploaded'; end if;
  update public.kyc_sessions set status = 'submitted' where id = p_session_id;
  update public.user_profiles set kyc_status = 'submitted' where id = v_actor_id;
end;
$$;

create or replace function public.complete_delivery_command(p_delivery_id uuid, p_otp text)
returns table (
  id uuid,
  request_id uuid,
  pickup_confirmed boolean,
  pickup_confirmed_at timestamptz,
  delivery_confirmed boolean,
  delivery_confirmed_at timestamptz,
  status public.delivery_status,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor_id uuid := auth.uid();
  v_delivery public.deliveries%rowtype;
  v_request public.requests%rowtype;
  v_limit integer := 5;
begin
  if v_actor_id is null then raise exception 'Authentication required'; end if;
  select * into v_delivery from public.deliveries where deliveries.id = p_delivery_id for update;
  if not found then raise exception 'Delivery not found'; end if;
  select * into v_request from public.requests where requests.id = v_delivery.request_id;
  if not found then raise exception 'Request not found'; end if;
  if v_actor_id is distinct from v_request.traveller_id then
    raise exception 'Only the assigned traveller can confirm delivery';
  end if;
  if v_request.status <> 'accepted' then raise exception 'Only accepted requests can be delivered'; end if;
  if v_delivery.status <> 'in_transit' then raise exception 'Delivery must be in transit before completion'; end if;
  if p_otp is null or p_otp !~ '^[0-9]{6}$' then raise exception 'Delivery code must be 6 digits'; end if;
  if v_delivery.otp_locked_until is not null and v_delivery.otp_locked_until > now() then
    raise exception 'Delivery code is temporarily locked. Please try again later.';
  end if;

  if v_delivery.otp_hash is null or crypt(p_otp, v_delivery.otp_hash) <> v_delivery.otp_hash then
    update public.deliveries
      set otp_attempt_count = otp_attempt_count + 1,
          otp_locked_until = case
            when otp_attempt_count + 1 >= v_limit then now() + interval '15 minutes'
            else otp_locked_until
          end
      where deliveries.id = p_delivery_id;
    return;
  end if;

  update public.deliveries
    set delivery_confirmed = true,
        delivery_confirmed_at = now(),
        status = 'delivered',
        otp_attempt_count = 0,
        otp_locked_until = null
    where deliveries.id = p_delivery_id
    returning * into v_delivery;

  perform public.transition_request_status(v_request.id, 'completed');
  update public.user_profiles
    set total_deliveries = total_deliveries + 1
    where user_profiles.id in (v_request.sender_id, v_request.traveller_id);
  perform public.emit_domain_event(
    v_actor_id,
    'delivery',
    v_delivery.id,
    'delivery_completed',
    'delivery.completed',
    jsonb_build_object(
      'delivery_id', v_delivery.id,
      'request_id', v_request.id,
      'sender_id', v_request.sender_id,
      'traveller_id', v_request.traveller_id
    )
  );

  return query
    select v_delivery.id, v_delivery.request_id, v_delivery.pickup_confirmed, v_delivery.pickup_confirmed_at,
           v_delivery.delivery_confirmed, v_delivery.delivery_confirmed_at, v_delivery.status, v_delivery.created_at;
end;
$$;

-- PostgreSQL cannot change a function's return type with CREATE OR REPLACE.
-- Some deployed environments have this legacy RPC with a non-void return type,
-- so remove that exact overload before installing the hardened compatibility RPC.
drop function if exists public.verify_delivery_otp(uuid, text);

create function public.verify_delivery_otp(p_delivery_id uuid, p_otp text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_delivery public.deliveries%rowtype;
  v_request public.requests%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_delivery from public.deliveries where id = p_delivery_id;
  if not found then raise exception 'Delivery not found'; end if;
  select * into v_request from public.requests where id = v_delivery.request_id;
  if v_request.traveller_id is distinct from auth.uid() then
    raise exception 'Only the assigned traveller can confirm delivery';
  end if;
  if p_otp is null or p_otp !~ '^[0-9]{6}$' then raise exception 'Delivery code must be 6 digits'; end if;
  if v_delivery.otp_hash is null or crypt(p_otp, v_delivery.otp_hash) <> v_delivery.otp_hash then
    raise exception 'Invalid delivery code';
  end if;
  update public.deliveries
    set delivery_confirmed = true, delivery_confirmed_at = now(), status = 'delivered'
    where id = p_delivery_id;
end;
$$;

create or replace function public.issue_delivery_otp(p_delivery_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_delivery public.deliveries%rowtype;
  v_request public.requests%rowtype;
  v_bytes bytea;
  v_code text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_delivery from public.deliveries where id = p_delivery_id for update;
  if not found then raise exception 'Delivery not found'; end if;
  select * into v_request from public.requests where id = v_delivery.request_id;
  if v_request.sender_id is distinct from auth.uid() then
    raise exception 'Only the sender can issue the delivery code';
  end if;
  if v_delivery.status <> 'in_transit' then
    raise exception 'Delivery code is available only while the parcel is in transit';
  end if;
  v_bytes := gen_random_bytes(4);
  v_code := lpad(((get_byte(v_bytes, 0) * 16777216 + get_byte(v_bytes, 1) * 65536 + get_byte(v_bytes, 2) * 256 + get_byte(v_bytes, 3)) % 1000000)::text, 6, '0');
  update public.deliveries
    set otp_hash = crypt(v_code, gen_salt('bf')), otp_attempt_count = 0, otp_locked_until = null
    where id = p_delivery_id;
  return v_code;
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
  v_from_city text;
  v_to_city text;
  v_title text;
  v_body text;
  v_count integer;
begin
  if v_actor_id is null then raise exception 'Authentication required'; end if;
  if p_listing_type = 'trip' then
    select from_city, to_city into v_from_city, v_to_city
      from public.trips where id = p_listing_id and user_id = v_actor_id and status = 'active';
    v_title := 'New trip on your route';
    v_body := 'A traveller added a trip from ' || coalesce(v_from_city, '') || ' to ' || coalesce(v_to_city, '') || '.';
  elsif p_listing_type = 'parcel' then
    select from_city, to_city into v_from_city, v_to_city
      from public.parcels where id = p_listing_id and user_id = v_actor_id and status = 'open';
    v_title := 'New parcel on your route';
    v_body := 'A sender added a parcel from ' || coalesce(v_from_city, '') || ' to ' || coalesce(v_to_city, '') || '.';
  else
    raise exception 'Invalid listing type';
  end if;
  if v_from_city is null or v_to_city is null then raise exception 'Listing not found'; end if;
  with inserted as (
    insert into public.notifications (user_id, title, body, type, related_id)
    select distinct rs.user_id, v_title, v_body, 'route_match', p_listing_id
      from public.route_subscriptions rs
      where rs.active = true
        and lower(trim(rs.from_city)) = lower(trim(v_from_city))
        and lower(trim(rs.to_city)) = lower(trim(v_to_city))
        and rs.user_id <> v_actor_id
    returning 1
  ) select count(*) into v_count from inserted;
  return v_count;
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
  v_request public.requests%rowtype;
  v_recipient uuid;
  v_title text;
  v_body text;
  v_type public.notification_type;
  v_processed integer := 0;
begin
  for v_event in
    select * from public.outbox_events
      where status in ('pending', 'failed') and attempt_count < max_attempts and available_at <= now()
      order by created_at limit least(greatest(coalesce(p_limit, 50), 1), 100)
      for update skip locked
  loop
    begin
      v_recipient := null;
      v_title := null;
      v_body := null;
      v_type := 'general';

      if v_event.topic like 'request.%' then
        select * into v_request from public.requests where id = coalesce((v_event.payload ->> 'request_id')::uuid, v_event.entity_id);
        if found then
          if v_event.topic = 'request.created' then
            v_recipient := v_request.traveller_id; v_title := 'New delivery request'; v_body := 'A sender requested space on your route.'; v_type := 'new_request';
          elsif v_event.topic = 'request.accepted' then
            v_recipient := v_request.sender_id; v_title := 'Request accepted'; v_body := 'Your traveller accepted the delivery request.'; v_type := 'request_accepted';
          elsif v_event.topic = 'request.rejected' then
            v_recipient := v_request.sender_id; v_title := 'Request rejected'; v_body := 'The traveller declined your delivery request.'; v_type := 'request_rejected';
          elsif v_event.topic = 'request.cancelled' then
            v_recipient := v_request.traveller_id; v_title := 'Request cancelled'; v_body := 'The sender cancelled the delivery request.';
          elsif v_event.topic in ('request.completed', 'request.failed') then
            v_recipient := case when v_event.topic = 'request.completed' then v_request.sender_id else v_request.traveller_id end;
            v_title := case when v_event.topic = 'request.completed' then 'Delivery completed' else 'Delivery issue reported' end;
            v_body := case when v_event.topic = 'request.completed' then 'The delivery was completed successfully.' else 'The delivery request was marked as failed.' end;
          end if;
        end if;
      elsif v_event.topic = 'delivery.picked_up' then
        v_recipient := (v_event.payload ->> 'sender_id')::uuid; v_title := 'Parcel picked up'; v_body := 'Your parcel is now in transit.';
      elsif v_event.topic = 'delivery.completed' then
        v_recipient := (v_event.payload ->> 'sender_id')::uuid; v_title := 'Delivery confirmed'; v_body := 'Your parcel has been delivered.';
      elsif v_event.topic = 'rating.submitted' then
        v_recipient := (v_event.payload ->> 'to_user_id')::uuid; v_title := 'New rating received'; v_body := 'A delivery participant left you a rating.'; v_type := 'rating';
      elsif v_event.topic = 'chat.message' then
        v_recipient := (v_event.payload ->> 'recipient_id')::uuid;
        v_title := left(coalesce(v_event.payload ->> 'title', 'New message'), 100);
        v_body := left(coalesce(v_event.payload ->> 'body', 'You received a new message.'), 500);
        v_type := 'chat_message';
      end if;

      if v_recipient is not null and v_title is not null and v_body is not null then
        insert into public.notifications (user_id, title, body, type, related_id)
        values (v_recipient, v_title, v_body, v_type, v_event.entity_id);
      end if;
      update public.outbox_events set status = 'processed', processed_at = now(), last_error = null where id = v_event.id;
      v_processed := v_processed + 1;
    exception when others then
      update public.outbox_events
        set status = 'failed', attempt_count = attempt_count + 1, last_error = sqlerrm,
            available_at = now() + (power(4, attempt_count) * interval '30 seconds')
        where id = v_event.id;
    end;
  end loop;
  return v_processed;
end;
$$;

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
  return v_payment;
end;
$$;

do $$
declare
  v_function record;
begin
  for v_function in
    select p.oid::regprocedure as signature
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    execute format('revoke all on function %s from public, anon, authenticated', v_function.signature);
  end loop;
end;
$$;

grant execute on function public.get_system_role() to authenticated;
grant execute on function public.check_username_available(text, uuid) to authenticated;
grant execute on function public.create_request_command(uuid, uuid, numeric, text) to authenticated;
grant execute on function public.transition_request_status(uuid, public.request_status) to authenticated;
grant execute on function public.create_delivery(uuid) to authenticated;
grant execute on function public.confirm_delivery_pickup(uuid) to authenticated;
grant execute on function public.complete_delivery_command(uuid, text) to authenticated;
grant execute on function public.issue_delivery_otp(uuid) to authenticated;
grant execute on function public.submit_rating_command(uuid, uuid, integer, text) to authenticated;
grant execute on function public.upsert_user_device(text, text, text, text) to authenticated;
grant execute on function public.send_chat_message_command(uuid, text) to authenticated;
grant execute on function public.release_payment_atomic(uuid, uuid) to authenticated;
grant execute on function public.refund_payment_atomic(uuid, uuid) to authenticated;
grant execute on function public.enforce_rate_limit(uuid, text) to authenticated;
grant execute on function public.create_kyc_session(uuid, text, text) to authenticated;
grant execute on function public.submit_kyc_session(uuid) to authenticated;
grant execute on function public.set_trip_status(uuid, public.trip_status) to authenticated;
grant execute on function public.set_parcel_status(uuid, public.parcel_status) to authenticated;
grant execute on function public.update_delivery_location(uuid, numeric, numeric) to authenticated;
grant execute on function public.create_conversation_for_request(uuid) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.notify_route_subscribers(text, uuid, text, text, text, text) to authenticated;

grant execute on function public.emit_domain_event(uuid, text, uuid, text, text, jsonb) to service_role;
grant execute on function public.process_outbox_events(integer) to service_role;
do $$
begin
  if to_regprocedure('public.sweep_dead_outbox_events()') is not null then
    grant execute on function public.sweep_dead_outbox_events() to service_role;
  end if;
end;
$$;
grant execute on function public.check_auth_rate_limit(text, text) to service_role;
grant execute on function public.record_auth_attempt(text, text, boolean) to service_role;
grant execute on function public.cleanup_auth_rate_limits() to service_role;
grant execute on function public.finalize_razorpay_payment(text, text) to service_role;
