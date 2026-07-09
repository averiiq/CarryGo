-- 1. Create system_role enum
create type public.system_role as enum ('user', 'support_agent', 'admin');

-- 2. Add system_role column to user_profiles
alter table public.user_profiles
  add column system_role public.system_role not null default 'user'::public.system_role;

-- 3. Security Definer function to safely get user system_role without triggering RLS recursion
create or replace function public.get_system_role()
returns public.system_role
language sql
security definer
set search_path = public
stable
as $$
  select system_role from public.user_profiles where id = auth.uid();
$$;

-- 4. Create support_tickets table
create table public.support_tickets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  subject text not null,
  description text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to uuid references public.user_profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for support tickets
create index support_tickets_user_id_idx on public.support_tickets(user_id);
create index support_tickets_assigned_to_idx on public.support_tickets(assigned_to);
create index support_tickets_status_idx on public.support_tickets(status);

-- Trigger for updated_at
create trigger set_support_tickets_updated_at 
  before update on public.support_tickets 
  for each row execute function public.set_updated_at();

-- 5. Enable RLS
alter table public.support_tickets enable row level security;

-- 6. RLS Policies for user_profiles (Granting Admin/Support Read Access)
-- The existing policy "user_profiles_select_own" handles user's own profiles.
-- We add a new policy for admins and support to read ALL profiles.
create policy "user_profiles_select_admin_support" 
  on public.user_profiles 
  for select 
  to authenticated 
  using (
    public.get_system_role() in ('admin', 'support_agent')
  );

-- Admins can update any profile (e.g. banning, changing roles)
create policy "user_profiles_update_admin" 
  on public.user_profiles 
  for update 
  to authenticated 
  using (
    public.get_system_role() = 'admin'
  )
  with check (
    public.get_system_role() = 'admin'
  );

-- 7. RLS Policies for support_tickets
-- Users can create tickets
create policy "support_tickets_insert_user" 
  on public.support_tickets 
  for insert 
  to authenticated 
  with check (user_id = auth.uid());

-- Users can read their own tickets
create policy "support_tickets_select_user" 
  on public.support_tickets 
  for select 
  to authenticated 
  using (user_id = auth.uid());

-- Admins and Support Agents can read all tickets
create policy "support_tickets_select_admin_support" 
  on public.support_tickets 
  for select 
  to authenticated 
  using (
    public.get_system_role() in ('admin', 'support_agent')
  );

-- Admins and Support Agents can update tickets
create policy "support_tickets_update_admin_support" 
  on public.support_tickets 
  for update 
  to authenticated 
  using (
    public.get_system_role() in ('admin', 'support_agent')
  )
  with check (
    public.get_system_role() in ('admin', 'support_agent')
  );
