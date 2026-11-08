create table public.perla_client_showcase (
  store_id uuid primary key references public.stores(id) on delete cascade,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.perla_client_showcase enable row level security;
revoke all on public.perla_client_showcase from anon, authenticated;
grant select on public.perla_client_showcase to anon, authenticated;
grant all on public.perla_client_showcase to service_role;
create policy perla_showcase_public_read on public.perla_client_showcase for select to anon, authenticated
  using (enabled and exists (select 1 from public.stores s where s.id=store_id and s.is_active=true));
create policy perla_showcase_super_read on public.perla_client_showcase for select to authenticated
  using (public.is_super_admin());
-- Only the authenticated super-admin API writes with the server client.
insert into public.perla_client_showcase(store_id,enabled)
  select id,is_active from public.stores;
comment on table public.perla_client_showcase is 'Opt-in public client gallery for Perla; independent of operational store status.';
