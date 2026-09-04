create or replace function public.expire_stale_unmatched_listings(
  p_cutoff timestamptz default (now() - interval '24 hours')
)
returns table(expired_trips integer, expired_parcels integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expired_trips integer := 0;
  v_expired_parcels integer := 0;
begin
  with updated_trips as (
    update public.trips t
       set status = 'cancelled'
     where t.status = 'active'
       and t.created_at < p_cutoff
       and not exists (
         select 1
           from public.requests r
          where r.trip_id = t.id
            and r.status in ('pending', 'accepted', 'completed')
       )
    returning t.id
  )
  select count(*)::integer into v_expired_trips from updated_trips;

  with updated_parcels as (
    update public.parcels p
       set status = 'cancelled'
     where p.status = 'open'
       and p.created_at < p_cutoff
       and not exists (
         select 1
           from public.requests r
          where r.parcel_id = p.id
            and r.status in ('pending', 'accepted', 'completed')
       )
    returning p.id
  )
  select count(*)::integer into v_expired_parcels from updated_parcels;

  return query select v_expired_trips, v_expired_parcels;
end;
$$;

grant execute on function public.expire_stale_unmatched_listings(timestamptz) to authenticated;
