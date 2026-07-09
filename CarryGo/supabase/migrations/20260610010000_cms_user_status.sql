-- 1. Create account_status enum
create type public.account_status as enum ('active', 'banned');

-- 2. Add status column to user_profiles
alter table public.user_profiles
  add column status public.account_status not null default 'active'::public.account_status;

-- 3. We already have RLS allowing Admins to update user_profiles from the previous migration.
