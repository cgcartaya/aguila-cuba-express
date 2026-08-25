-- Entrega por distancia, optativa por tienda.
-- Ejecutar en Supabase SQL Editor antes de activar el modo "distance".

alter table public.checkout_settings
  add column if not exists delivery_origin_address text not null default '',
  add column if not exists delivery_origin_latitude double precision,
  add column if not exists delivery_origin_longitude double precision,
  add column if not exists distance_base_km numeric(10,3) not null default 1,
  add column if not exists distance_base_fee numeric(12,2) not null default 200,
  add column if not exists distance_additional_fee_per_km numeric(12,2) not null default 100,
  add column if not exists max_delivery_distance_km numeric(10,3);

-- Sustituye el CHECK anterior sin depender del nombre que tenga en cada
-- instalación. Solo elimina checks que mencionen delivery_address_mode.
do $$
declare constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'checkout_settings'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%delivery_address_mode%'
  loop
    execute format('alter table public.checkout_settings drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.checkout_settings
  add constraint checkout_settings_delivery_address_mode_check
  check (delivery_address_mode in ('free', 'zones', 'distance'));

alter table public.checkout_settings
  drop constraint if exists checkout_distance_origin_lat_check,
  drop constraint if exists checkout_distance_origin_lng_check,
  drop constraint if exists checkout_distance_values_check;

alter table public.checkout_settings
  add constraint checkout_distance_origin_lat_check
    check (delivery_origin_latitude is null or delivery_origin_latitude between -90 and 90),
  add constraint checkout_distance_origin_lng_check
    check (delivery_origin_longitude is null or delivery_origin_longitude between -180 and 180),
  add constraint checkout_distance_values_check
    check (
      distance_base_km >= 0 and distance_base_fee >= 0 and
      distance_additional_fee_per_km >= 0 and
      (max_delivery_distance_km is null or max_delivery_distance_km > 0)
    );

alter table public.orders
  add column if not exists delivery_latitude double precision,
  add column if not exists delivery_longitude double precision,
  add column if not exists delivery_distance_meters integer,
  add column if not exists delivery_route_provider text,
  add column if not exists delivery_formatted_address text;

create table if not exists public.delivery_address_catalog (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  normalized_address text not null,
  display_address text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  source text not null default 'manual' check (source in ('manual', 'confirmed_order', 'csv', 'osm')),
  use_count integer not null default 1 check (use_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, normalized_address)
);

create index if not exists delivery_address_catalog_store_search_idx
  on public.delivery_address_catalog (store_id, normalized_address);

alter table public.delivery_address_catalog enable row level security;

-- No se crean políticas para anon/authenticated: el catálogo contiene
-- ubicaciones confirmadas y solo se consulta mediante endpoints del servidor.
revoke all on table public.delivery_address_catalog from anon, authenticated;

comment on table public.delivery_address_catalog is
  'Catálogo privado por tienda para sugerir direcciones ya confirmadas sin depender siempre de geocodificadores externos.';
