-- Server-only restaurant identity and delivery configuration. Do not reuse store delivery_zones.
create table public.store_restaurant_sections (
  store_id uuid primary key references public.stores(id) on delete cascade,
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  currency_locked boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.store_restaurant_sections enable row level security;
revoke all on table public.store_restaurant_sections from public, anon, authenticated;
grant select, insert, update, delete on table public.store_restaurant_sections to service_role;
insert into public.store_restaurant_sections (store_id, config)
select id, '{"enabled":false,"name":"","logo_url":"","description":"","accent":"#b45309","currency":"USD","delivery_note":"","hours_note":"","zones":[]}'::jsonb
from public.stores where slug = 'aguila';
-- Administration is available now; publication still requires explicit configuration.enabled=true.
update public.stores set module_menu_enabled = true where slug = 'aguila';
