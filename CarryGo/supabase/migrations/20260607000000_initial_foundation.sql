-- CarryGo foundation schema and RLS baseline.
-- This migration favors safe defaults: client writes are scoped to the
-- authenticated user and sensitive provider flows remain server-owned.

create extension if not exists pgcrypto with schema extensions;

create type public.kyc_status as enum ('pending', 'submitted', 'approved', 'rejected');
create type public.vehicle_type as enum ('bike', 'car', 'bus', 'train', 'flight');
create type public.trip_status as enum ('active', 'completed', 'cancelled');
create type public.parcel_category as enum ('documents', 'electronics', 'clothing', 'food', 'medicine', 'other');
create type public.parcel_status as enum ('open', 'matched', 'in_transit', 'delivered', 'failed');
create type public.request_status as enum ('pending', 'accepted', 'rejected', 'cancelled', 'completed', 'failed');
create type public.delivery_status as enum ('awaiting_pickup', 'picked_up', 'in_transit', 'delivered', 'failed');
create type public.payment_status as enum ('locked', 'released', 'refunded');
create type public.notification_type as enum ('new_request', 'request_accepted', 'request_rejected', 'delivery_otp', 'rating', 'general', 'route_match');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text,
  full_name text,
  phone text,
  rating numeric(3,2) not null default 4.50 check (rating >= 0 and rating <= 5),
  total_deliveries integer not null default 0 check (total_deliveries >= 0),
  total_trips integer not null default 0 check (total_trips >= 0),
  verified boolean not null default false,
  push_token text,
  kyc_status public.kyc_status not null default 'pending',
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  user_name text not null,
  user_rating numeric(3,2) not null default 4.50,
  from_city text not null,
  to_city text not null,
  date date not null,
  time text not null,
  vehicle_type public.vehicle_type not null,
  available_capacity numeric(8,2) not null check (available_capacity > 0),
  price_per_kg numeric(10,2) not null check (price_per_kg >= 0),
  status public.trip_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_route_check check (from_city <> to_city)
);

create table public.parcels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  user_name text not null,
  from_city text not null,
  to_city text not null,
  category public.parcel_category not null,
  description text not null,
  weight numeric(8,2) not null check (weight > 0),
  price_offer numeric(10,2) not null check (price_offer >= 0),
  image_url text,
  status public.parcel_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parcels_route_check check (from_city <> to_city)
);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  parcel_id uuid not null references public.parcels(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  sender_id uuid not null references public.user_profiles(id) on delete cascade,
  sender_name text not null,
  traveller_id uuid not null references public.user_profiles(id) on delete cascade,
  traveller_name text not null,
  status public.request_status not null default 'pending',
  price numeric(10,2) not null check (price >= 0),
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint requests_distinct_users check (sender_id <> traveller_id),
  constraint requests_unique_pair unique (parcel_id, trip_id)
);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.requests(id) on delete cascade,
  otp_hash text,
  pickup_confirmed boolean not null default false,
  pickup_confirmed_at timestamptz,
  delivery_confirmed boolean not null default false,
  delivery_confirmed_at timestamptz,
  traveller_lat numeric(10,7),
  traveller_lng numeric(10,7),
  location_updated_at timestamptz,
  status public.delivery_status not null default 'awaiting_pickup',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.requests(id) on delete cascade,
  participant_ids uuid[] not null,
  participant_names jsonb not null default '{}'::jsonb,
  route text not null default '',
  parcel_description text not null default '',
  last_message_text text,
  last_message_sender_id uuid,
  last_message_at timestamptz,
  last_message_read boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.user_profiles(id) on delete cascade,
  sender_name text not null,
  text text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.requests(id) on delete cascade,
  sender_id uuid not null references public.user_profiles(id) on delete cascade,
  traveller_id uuid not null references public.user_profiles(id) on delete cascade,
  amount numeric(10,2) not null check (amount >= 0),
  status public.payment_status not null default 'locked',
  locked_at timestamptz not null default now(),
  released_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  title text not null,
  body text not null,
  type public.notification_type not null default 'general',
  related_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.user_profiles(id) on delete cascade,
  to_user_id uuid not null references public.user_profiles(id) on delete cascade,
  request_id uuid not null references public.requests(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  constraint ratings_distinct_users check (from_user_id <> to_user_id),
  constraint ratings_once_per_request unique (from_user_id, request_id)
);

create table public.route_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  from_city text not null,
  to_city text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint route_subscriptions_route_check check (from_city <> to_city),
  constraint route_subscriptions_unique_route unique (user_id, from_city, to_city)
);

create table public.kyc_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  full_name text not null,
  id_type text not null,
  provider text not null default 'unconfigured',
  provider_session_id text,
  status public.kyc_status not null default 'submitted',
  created_at timestamptz not null default now()
);

create index trips_route_status_idx on public.trips (status, from_city, to_city, created_at desc);
create index parcels_route_status_idx on public.parcels (status, from_city, to_city, created_at desc);
create index requests_participants_idx on public.requests (sender_id, traveller_id, created_at desc);
create index messages_conversation_created_idx on public.messages (conversation_id, created_at);
create index notifications_user_read_idx on public.notifications (user_id, read, created_at desc);
create index route_subscriptions_route_idx on public.route_subscriptions (from_city, to_city, active);

create trigger set_user_profiles_updated_at before update on public.user_profiles for each row execute function public.set_updated_at();
create trigger set_trips_updated_at before update on public.trips for each row execute function public.set_updated_at();
create trigger set_parcels_updated_at before update on public.parcels for each row execute function public.set_updated_at();
create trigger set_requests_updated_at before update on public.requests for each row execute function public.set_updated_at();
create trigger set_deliveries_updated_at before update on public.deliveries for each row execute function public.set_updated_at();
create trigger set_conversations_updated_at before update on public.conversations for each row execute function public.set_updated_at();
create trigger set_route_subscriptions_updated_at before update on public.route_subscriptions for each row execute function public.set_updated_at();

alter table public.user_profiles enable row level security;
alter table public.trips enable row level security;
alter table public.parcels enable row level security;
alter table public.requests enable row level security;
alter table public.deliveries enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.ratings enable row level security;
alter table public.route_subscriptions enable row level security;
alter table public.kyc_sessions enable row level security;

create policy "user_profiles_select_own" on public.user_profiles for select to authenticated using (id = auth.uid());
create policy "user_profiles_insert_own" on public.user_profiles for insert to authenticated with check (id = auth.uid());
create policy "user_profiles_update_own" on public.user_profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "trips_select_active" on public.trips for select to authenticated using (status = 'active' or user_id = auth.uid());
create policy "trips_insert_own" on public.trips for insert to authenticated with check (user_id = auth.uid());
create policy "trips_update_own" on public.trips for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "parcels_select_open" on public.parcels for select to authenticated using (status in ('open', 'matched') or user_id = auth.uid());
create policy "parcels_insert_own" on public.parcels for insert to authenticated with check (user_id = auth.uid());
create policy "parcels_update_own" on public.parcels for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "requests_select_participant" on public.requests for select to authenticated using (sender_id = auth.uid() or traveller_id = auth.uid());
create policy "requests_insert_sender" on public.requests for insert to authenticated with check (sender_id = auth.uid());
create policy "requests_update_participant" on public.requests for update to authenticated using (sender_id = auth.uid() or traveller_id = auth.uid()) with check (sender_id = auth.uid() or traveller_id = auth.uid());

create policy "deliveries_select_participant" on public.deliveries for select to authenticated using (
  exists (
    select 1 from public.requests r
    where r.id = deliveries.request_id
      and (r.sender_id = auth.uid() or r.traveller_id = auth.uid())
  )
);
create policy "deliveries_update_participant" on public.deliveries for update to authenticated using (
  exists (
    select 1 from public.requests r
    where r.id = deliveries.request_id
      and (r.sender_id = auth.uid() or r.traveller_id = auth.uid())
  )
) with check (
  exists (
    select 1 from public.requests r
    where r.id = deliveries.request_id
      and (r.sender_id = auth.uid() or r.traveller_id = auth.uid())
  )
);

create policy "conversations_select_participant" on public.conversations for select to authenticated using (auth.uid() = any(participant_ids));
create policy "conversations_insert_participant" on public.conversations for insert to authenticated with check (auth.uid() = any(participant_ids));
create policy "conversations_update_participant" on public.conversations for update to authenticated using (auth.uid() = any(participant_ids)) with check (auth.uid() = any(participant_ids));

create policy "messages_select_participant" on public.messages for select to authenticated using (
  exists (select 1 from public.conversations c where c.id = messages.conversation_id and auth.uid() = any(c.participant_ids))
);
create policy "messages_insert_participant" on public.messages for insert to authenticated with check (
  sender_id = auth.uid()
  and exists (select 1 from public.conversations c where c.id = messages.conversation_id and auth.uid() = any(c.participant_ids))
);
create policy "messages_update_participant" on public.messages for update to authenticated using (
  exists (select 1 from public.conversations c where c.id = messages.conversation_id and auth.uid() = any(c.participant_ids))
) with check (
  exists (select 1 from public.conversations c where c.id = messages.conversation_id and auth.uid() = any(c.participant_ids))
);

create policy "payments_select_participant" on public.payments for select to authenticated using (sender_id = auth.uid() or traveller_id = auth.uid());
create policy "payments_insert_sender" on public.payments for insert to authenticated with check (sender_id = auth.uid());
create policy "payments_update_participant" on public.payments for update to authenticated using (sender_id = auth.uid() or traveller_id = auth.uid()) with check (sender_id = auth.uid() or traveller_id = auth.uid());

create policy "notifications_select_own" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications_insert_own" on public.notifications for insert to authenticated with check (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "ratings_select_involved" on public.ratings for select to authenticated using (from_user_id = auth.uid() or to_user_id = auth.uid());
create policy "ratings_insert_from_user" on public.ratings for insert to authenticated with check (from_user_id = auth.uid());

create policy "route_subscriptions_select_own" on public.route_subscriptions for select to authenticated using (user_id = auth.uid());
create policy "route_subscriptions_insert_own" on public.route_subscriptions for insert to authenticated with check (user_id = auth.uid());
create policy "route_subscriptions_update_own" on public.route_subscriptions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "route_subscriptions_delete_own" on public.route_subscriptions for delete to authenticated using (user_id = auth.uid());

create policy "kyc_sessions_select_own" on public.kyc_sessions for select to authenticated using (user_id = auth.uid());
create policy "kyc_sessions_insert_own" on public.kyc_sessions for insert to authenticated with check (user_id = auth.uid());

create or replace function public.create_delivery(p_request_id uuid)
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
  v_request public.requests%rowtype;
  v_code text;
begin
  select * into v_request from public.requests where requests.id = p_request_id;
  if not found then
    raise exception 'Request not found';
  end if;
  if v_request.traveller_id <> auth.uid() then
    raise exception 'Only the assigned traveller can create a delivery';
  end if;

  v_code := lpad(floor(random() * 1000000)::text, 6, '0');

  insert into public.deliveries (request_id, otp_hash)
  values (p_request_id, crypt(v_code, gen_salt('bf')))
  on conflict (request_id) do nothing;

  return query
    select d.id, d.request_id, d.pickup_confirmed, d.pickup_confirmed_at,
           d.delivery_confirmed, d.delivery_confirmed_at, d.status, d.created_at
    from public.deliveries d
    where d.request_id = p_request_id;
end;
$$;

create or replace function public.verify_delivery_otp(p_delivery_id uuid, p_otp text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_delivery public.deliveries%rowtype;
  v_request public.requests%rowtype;
begin
  select * into v_delivery from public.deliveries where deliveries.id = p_delivery_id;
  if not found then
    raise exception 'Delivery not found';
  end if;

  select * into v_request from public.requests where requests.id = v_delivery.request_id;
  if v_request.traveller_id <> auth.uid() then
    raise exception 'Only the assigned traveller can confirm delivery';
  end if;

  if p_otp is null or p_otp !~ '^[0-9]{6}$' then
    raise exception 'Delivery code must be 6 digits';
  end if;

  if v_delivery.otp_hash is null or crypt(p_otp, v_delivery.otp_hash) <> v_delivery.otp_hash then
    raise exception 'Invalid delivery code';
  end if;

  update public.deliveries
  set delivery_confirmed = true,
      delivery_confirmed_at = now(),
      status = 'delivered'
  where deliveries.id = p_delivery_id;
end;
$$;

create or replace function public.create_kyc_session(p_user_id uuid, p_full_name text, p_id_type text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id <> auth.uid() then
    raise exception 'Cannot create a KYC session for another user';
  end if;

  insert into public.kyc_sessions (user_id, full_name, id_type)
  values (p_user_id, p_full_name, p_id_type);

  update public.user_profiles
  set full_name = p_full_name,
      kyc_status = 'submitted'
  where id = p_user_id;
end;
$$;
