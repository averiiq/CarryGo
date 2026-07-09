do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'notification_type'
      and e.enumlabel = 'chat_message'
  ) then
    alter type public.notification_type add value 'chat_message';
  end if;
end $$;
