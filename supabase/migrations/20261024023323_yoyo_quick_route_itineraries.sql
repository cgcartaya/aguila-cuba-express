-- Public announcements are independent of customer pickup stops.
alter table public.pickup_routes
  add column public_itinerary jsonb not null default '[]'::jsonb,
  add column poster_image_url text;
alter table public.pickup_routes add constraint pickup_routes_itinerary_array
  check (jsonb_typeof(public_itinerary) = 'array' and jsonb_array_length(public_itinerary) <= 40);

create table public.pickup_route_templates (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  zone_id uuid references public.pickup_zones(id) on delete set null,
  itinerary jsonb not null check (jsonb_typeof(itinerary) = 'array'),
  created_at timestamptz not null default now()
);
create index pickup_route_templates_store_idx on public.pickup_route_templates(store_id);
alter table public.pickup_route_templates enable row level security;
revoke all on public.pickup_route_templates from public, anon, authenticated;
grant all on public.pickup_route_templates to service_role;

-- Server-only cache and daily usage cap for image interpretation; never store image bytes.
create table public.pickup_route_image_imports (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  image_hash text not null,
  result jsonb,
  created_at timestamptz not null default now()
);
create index pickup_route_image_imports_store_date_idx on public.pickup_route_image_imports(store_id,created_at desc);
alter table public.pickup_route_image_imports enable row level security;
revoke all on public.pickup_route_image_imports from public, anon, authenticated;
grant all on public.pickup_route_image_imports to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('pickup-route-posters','pickup-route-posters',true,3145728,array['image/jpeg'])
on conflict(id) do nothing;
