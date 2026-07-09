-- Require complete signup profile before users enter the app.

do $$
begin
  create type public.user_role as enum ('sender', 'traveller', 'both');
exception
  when duplicate_object then null;
end;
$$;

alter table public.user_profiles
  add column if not exists role public.user_role,
  add column if not exists profile_completed_at timestamptz;

create unique index if not exists user_profiles_completed_username_unique
  on public.user_profiles (lower(username))
  where profile_completed_at is not null;

do $$
begin
  alter table public.user_profiles
    add constraint user_profiles_username_format_check
    check (username is null or username ~ '^[a-z0-9_]{3,24}$') not valid;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter table public.user_profiles
    add constraint user_profiles_phone_e164_check
    check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$') not valid;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter table public.user_profiles
    add constraint user_profiles_completion_fields_check
    check (
      profile_completed_at is null
      or (
        username is not null
        and full_name is not null
        and length(trim(full_name)) >= 2
        and phone is not null
        and role is not null
      )
    ) not valid;
exception
  when duplicate_object then null;
end;
$$;
