-- Reconciliation: mark stale Razorpay orders as failed so users can safely retry checkout.

create or replace function public.cleanup_stale_razorpay_orders(p_stale_after interval default interval '30 minutes')
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_updated_count integer := 0;
begin
  update public.razorpay_orders
  set status = 'failed'
  where status = 'created'
    and created_at < now() - p_stale_after;

  get diagnostics v_updated_count = row_count;
  return v_updated_count;
end;
$$;

revoke all on function public.cleanup_stale_razorpay_orders(interval) from public, anon, authenticated;
grant execute on function public.cleanup_stale_razorpay_orders(interval) to service_role;

-- Optional scheduler hook (enable when pg_cron is configured in the deployment):
-- select cron.schedule(
--   'cleanup-stale-razorpay-orders',
--   '*/15 * * * *',
--   $$select public.cleanup_stale_razorpay_orders(interval '30 minutes');$$
-- );
