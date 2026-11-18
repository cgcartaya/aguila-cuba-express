create table public.store_square_settings (
  store_id uuid primary key references public.stores(id) on delete cascade,
  environment text not null check (environment in ('sandbox', 'production')),
  merchant_id text not null,
  merchant_name text,
  location_id text,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  token_expires_at timestamptz not null,
  connected_at timestamptz not null default now(),
  last_verified_at timestamptz not null default now(),
  unique (environment, merchant_id)
);

create table public.square_oauth_states (
  state_hash text primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null,
  environment text not null check (environment in ('sandbox', 'production')),
  expires_at timestamptz not null
);

alter table public.store_square_settings enable row level security;
alter table public.square_oauth_states enable row level security;
revoke all on public.store_square_settings, public.square_oauth_states from public, anon, authenticated;
grant select, insert, update, delete on public.store_square_settings, public.square_oauth_states to service_role;
