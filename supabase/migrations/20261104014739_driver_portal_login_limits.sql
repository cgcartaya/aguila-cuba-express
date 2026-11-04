-- Web credentials never leave the server. No grants or policies for browser roles.
create table public.driver_portal_sessions (
  token_hash text primary key check (length(token_hash) = 64),
  account_id uuid not null,
  account_source text not null check (account_source in ('staff','legacy')),
  store_id uuid not null references public.stores(id) on delete cascade,
  credential_fingerprint text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index driver_portal_sessions_expiry on public.driver_portal_sessions(expires_at);
alter table public.driver_portal_sessions enable row level security;
revoke all on public.driver_portal_sessions from public, anon, authenticated;
grant select, insert, delete on public.driver_portal_sessions to service_role;

create table public.driver_portal_login_limits (
  bucket_key text primary key,
  attempts integer not null default 1,
  expires_at timestamptz not null
);
alter table public.driver_portal_login_limits enable row level security;
revoke all on public.driver_portal_login_limits from public, anon, authenticated;
grant select, insert, update, delete on public.driver_portal_login_limits to service_role;

-- Atomic, durable across server instances. Caller supplies only an HMAC key.
create function public.driver_portal_login_attempt(p_key text) returns integer
language plpgsql security invoker set search_path = '' as $$
declare n integer;
begin
  delete from public.driver_portal_login_limits where expires_at < now();
  delete from public.driver_portal_sessions where expires_at < now();
  insert into public.driver_portal_login_limits(bucket_key, expires_at)
    values(p_key, now() + interval '15 minutes')
  on conflict (bucket_key) do update set attempts = public.driver_portal_login_limits.attempts + 1
  returning attempts into n;
  return n;
end;
$$;
revoke all on function public.driver_portal_login_attempt(text) from public, anon, authenticated;
grant execute on function public.driver_portal_login_attempt(text) to service_role;
