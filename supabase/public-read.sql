-- Public catalog read policies for the customer-facing website.
-- Run this once in Supabase SQL Editor if these policies are not already present.

alter table public.vehicles enable row level security;
alter table public.vehicle_images enable row level security;
alter table public.vehicle_equipment enable row level security;
alter table public.vehicle_damages enable row level security;
alter table public.vehicle_paint_thickness enable row level security;
alter table public.vehicle_service enable row level security;
alter table public.vehicle_price_history enable row level security;

drop policy if exists "public read active vehicles" on public.vehicles;
create policy "public read active vehicles"
on public.vehicles
for select to anon, authenticated
using (status = 'active');

drop policy if exists "public read vehicle images" on public.vehicle_images;
create policy "public read vehicle images"
on public.vehicle_images
for select to anon, authenticated
using (is_document = false);

drop policy if exists "public read vehicle equipment" on public.vehicle_equipment;
create policy "public read vehicle equipment"
on public.vehicle_equipment
for select to anon, authenticated
using (true);

drop policy if exists "public read vehicle damages" on public.vehicle_damages;
create policy "public read vehicle damages"
on public.vehicle_damages
for select to anon, authenticated
using (true);

drop policy if exists "public read vehicle paint thickness" on public.vehicle_paint_thickness;
create policy "public read vehicle paint thickness"
on public.vehicle_paint_thickness
for select to anon, authenticated
using (true);

drop policy if exists "public read vehicle service" on public.vehicle_service;
create policy "public read vehicle service"
on public.vehicle_service
for select to anon, authenticated
using (true);

drop policy if exists "public read vehicle price history" on public.vehicle_price_history;
create policy "public read vehicle price history"
on public.vehicle_price_history
for select to anon, authenticated
using (true);
