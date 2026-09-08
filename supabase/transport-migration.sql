-- Required once on the existing Supabase project.
alter table public.vehicles
  add column if not exists transport_eur numeric(12,2);

create index if not exists vehicles_transport_idx
  on public.vehicles(transport_eur);
