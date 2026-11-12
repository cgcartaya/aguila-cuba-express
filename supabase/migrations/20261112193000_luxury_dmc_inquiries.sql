create table public.dmc_inquiries (
  store_id uuid not null references public.stores(id) on delete cascade,
  id uuid not null,
  kind text not null check (kind in ('event', 'services', 'destination')),
  locale text not null check (locale in ('en', 'es')),
  details jsonb not null check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  primary key (store_id, id)
);
alter table public.dmc_inquiries enable row level security;
revoke all on public.dmc_inquiries from public, anon, authenticated;
grant select, insert, update on public.dmc_inquiries to service_role;
