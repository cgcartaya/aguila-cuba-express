-- Analítica interna ligera para todas las tiendas.
-- Es compatible con la tabla analytics_events de la implementación anterior.

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  visitor_id text,
  session_id text,
  event_name text not null,
  path text,
  product_id uuid references public.products(id) on delete set null,
  combo_id uuid,
  order_id uuid references public.orders(id) on delete set null,
  item_name text,
  quantity integer,
  value numeric,
  currency text not null default 'USD',
  source text,
  campaign_source text,
  campaign_medium text,
  campaign_name text,
  campaign_content text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.analytics_events
  add column if not exists menu_item_id uuid references public.menu_items(id) on delete set null;

alter table public.analytics_events
  drop constraint if exists analytics_events_event_name_check;

alter table public.analytics_events
  add constraint analytics_events_event_name_check check (event_name in (
    'page_view', 'product_view', 'menu_item_view', 'add_to_cart',
    'view_cart', 'begin_checkout', 'reservation_started',
    'reservation_completed', 'order_created'
  ));

create index if not exists analytics_events_store_created_idx
  on public.analytics_events (store_id, created_at desc);
create index if not exists analytics_events_event_idx
  on public.analytics_events (store_id, event_name, created_at desc);
create index if not exists analytics_events_menu_item_idx
  on public.analytics_events (store_id, menu_item_id, created_at desc);
create index if not exists analytics_events_session_idx
  on public.analytics_events (store_id, session_id, created_at desc);

alter table public.analytics_events enable row level security;
revoke all on table public.analytics_events from anon, authenticated;
grant all on table public.analytics_events to service_role;

comment on table public.analytics_events is
  'Eventos publicos agrupados para el dashboard interno de cada tienda.';
