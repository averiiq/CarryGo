create or replace function public.check_username_available(check_username text, exclude_user_id uuid default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  is_taken boolean;
begin
  if exclude_user_id is not null then
    select exists(
      select 1 from public.user_profiles 
      where lower(username) = lower(check_username) 
      and id != exclude_user_id
    ) into is_taken;
  else
    select exists(
      select 1 from public.user_profiles 
      where lower(username) = lower(check_username)
    ) into is_taken;
  end if;
  
  return not is_taken;
end;
$$;
