create table public.virtual_locker_prealerts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  locker_id uuid not null,
  tracking text not null,
  merchant text not null,
  contents text not null,
  declared_value numeric(12,2) not null check (declared_value >= 0),
  created_at timestamptz not null default now(),
  foreign key (store_id, locker_id) references public.virtual_lockers(store_id, id),
  unique (store_id, tracking)
);
alter table public.virtual_locker_prealerts enable row level security;
revoke all on public.virtual_locker_prealerts from public, anon, authenticated;
grant select, insert on public.virtual_locker_prealerts to service_role;
create index virtual_locker_prealerts_locker on public.virtual_locker_prealerts(store_id, locker_id, created_at desc);
