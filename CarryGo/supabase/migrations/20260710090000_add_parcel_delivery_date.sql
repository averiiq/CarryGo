alter table public.parcels
  add column if not exists delivery_date date;
