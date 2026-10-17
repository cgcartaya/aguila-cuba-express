-- Managed ShareAPP accounts remain independent from administrative profiles.
alter table public.shareapp_members add column email text;
create table public.shareapp_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_store_id uuid not null references public.stores(id),
  created_by uuid references auth.users(id) on delete set null,
  email text not null,
  full_name text not null,
  password_pending boolean not null default true,
  temporary_password_digest text,
  setup_token_hash text unique check (setup_token_hash ~ '^[a-f0-9]{64}$'),
  setup_expires_at timestamptz,
  setup_claimed_at timestamptz,
  created_at timestamptz not null default now()
);
create index shareapp_accounts_store_idx on public.shareapp_accounts(created_store_id);
alter table public.shareapp_accounts enable row level security;
revoke all on public.shareapp_accounts from public,anon,authenticated;
grant all on public.shareapp_accounts to service_role;
