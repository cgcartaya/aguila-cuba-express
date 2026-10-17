-- ShareAPP phases 1–2. All access goes through authenticated server APIs.
-- No grants or permissions on existing store_users/profiles/orders are changed.
create table public.shareapp_settings (
  store_id uuid primary key references public.stores(id) on delete cascade,
  enabled boolean not null default false,
  attribution_days integer not null default 7 check (attribution_days between 1 and 30)
);
create table public.shareapp_members (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null check (length(display_name) between 1 and 100),
  active boolean not null default true,
  invited_by uuid references auth.users(id) on delete set null,
  invite_code text unique check (invite_code ~ '^[a-f0-9]{48}$'),
  invite_expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (store_id, user_id),
  unique (id, store_id)
);
create index shareapp_members_user_idx on public.shareapp_members(user_id) where active;
create table public.shareapp_links (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  member_id uuid not null,
  code text not null unique check (code ~ '^[a-f0-9]{48}$'),
  kind text not null check (kind in ('store','product','combo')),
  item_id uuid,
  network text not null check (network in ('whatsapp','facebook','instagram','telegram','other')),
  title text not null check (length(title) <= 160),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check ((kind = 'store' and item_id is null) or (kind <> 'store' and item_id is not null)),
  foreign key (member_id,store_id) references public.shareapp_members(id,store_id) on delete cascade,
  unique (id,member_id,store_id)
);
create index shareapp_links_member_idx on public.shareapp_links(member_id,store_id);
create table public.shareapp_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  member_id uuid not null,
  link_id uuid not null,
  visit_id uuid not null,
  kind text not null check (kind in ('page_view','product_view')),
  item_id uuid,
  path text not null check (length(path) <= 300),
  event_key text not null check (length(event_key) <= 350),
  created_at timestamptz not null default now(),
  unique (visit_id,event_key),
  foreign key (link_id,member_id,store_id) references public.shareapp_links(id,member_id,store_id) on delete cascade
);
create index shareapp_events_store_date_idx on public.shareapp_events(store_id,created_at,member_id);
create table public.shareapp_order_attributions (
  order_id uuid primary key references public.orders(id) on delete cascade,
  store_id uuid not null,
  member_id uuid not null,
  link_id uuid not null,
  visit_id uuid not null,
  referred_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key (link_id,member_id,store_id) references public.shareapp_links(id,member_id,store_id)
);
create index shareapp_attributions_store_date_idx on public.shareapp_order_attributions(store_id,created_at,member_id);

-- A reference to an order in another tenant must fail even for an accidental
-- service-role insert. Invoker rights; no SECURITY DEFINER functions.
create function public.shareapp_validate_order() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from public.orders o where o.id = new.order_id and o.store_id = new.store_id) then
    raise exception 'ShareAPP order/store mismatch' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.shareapp_validate_order() from public,anon,authenticated;
grant execute on function public.shareapp_validate_order() to service_role;
create trigger shareapp_validate_order before insert or update on public.shareapp_order_attributions
for each row execute function public.shareapp_validate_order();

alter table public.shareapp_settings enable row level security;
alter table public.shareapp_members enable row level security;
alter table public.shareapp_links enable row level security;
alter table public.shareapp_events enable row level security;
alter table public.shareapp_order_attributions enable row level security;
revoke all on public.shareapp_settings,public.shareapp_members,public.shareapp_links,public.shareapp_events,public.shareapp_order_attributions from public,anon,authenticated;
grant all on public.shareapp_settings,public.shareapp_members,public.shareapp_links,public.shareapp_events,public.shareapp_order_attributions to service_role;

-- Aggregate on the database: no client event can create a paid sale, and
-- pagination limits on analytics APIs cannot silently truncate the totals.
create function public.shareapp_results(p_store_id uuid, p_member_id uuid default null)
returns table (member_id uuid, display_name text, visits bigint, product_views bigint, orders bigint, paid_orders bigint, paid_total numeric)
language sql stable security invoker set search_path = '' as $$
  with traffic as (
    select e.member_id, count(distinct e.visit_id) visits,
      count(*) filter (where e.kind = 'product_view') product_views
    from public.shareapp_events e
    where e.store_id = p_store_id and e.created_at >= now() - interval '30 days'
      and (p_member_id is null or e.member_id = p_member_id)
    group by e.member_id
  ), sales as (
    select a.member_id, count(*) orders,
      count(*) filter (where o.payment_status = 'paid' and lower(coalesce(o.status::text,'')) not in ('cancelled','canceled')) paid_orders,
      coalesce(sum(o.total) filter (where o.payment_status = 'paid' and lower(coalesce(o.status::text,'')) not in ('cancelled','canceled')),0) paid_total
    from public.shareapp_order_attributions a
    join public.orders o on o.id = a.order_id and o.store_id = a.store_id
    where a.store_id = p_store_id and a.created_at >= now() - interval '30 days'
      and (p_member_id is null or a.member_id = p_member_id)
    group by a.member_id
  )
  select m.id,m.display_name,coalesce(t.visits,0),coalesce(t.product_views,0),coalesce(s.orders,0),coalesce(s.paid_orders,0),coalesce(s.paid_total,0)
  from public.shareapp_members m
  left join traffic t on t.member_id = m.id
  left join sales s on s.member_id = m.id
  where m.store_id = p_store_id and (p_member_id is null or m.id = p_member_id)
  order by coalesce(s.paid_total,0) desc,m.created_at;
$$;
revoke all on function public.shareapp_results(uuid,uuid) from public,anon,authenticated;
grant execute on function public.shareapp_results(uuid,uuid) to service_role;
