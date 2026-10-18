-- Additive campaign support. Existing product links and receipts stay valid.
create table public.shareapp_campaigns (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 160),
  body text not null default '' check (length(body) <= 5000),
  poster_path text not null check (poster_path ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.jpg$' and split_part(poster_path,'/',1) = store_id::text),
  kind text not null check (kind in ('store','product','combo')),
  item_id uuid,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(id,store_id),
  check ((kind='store' and item_id is null) or (kind<>'store' and item_id is not null))
);
alter table public.shareapp_campaigns enable row level security;
revoke all on public.shareapp_campaigns from public,anon,authenticated;
grant all on public.shareapp_campaigns to service_role;
create index shareapp_campaigns_store_idx on public.shareapp_campaigns(store_id,created_at desc);
alter table public.shareapp_links add column campaign_id uuid;
alter table public.shareapp_links add constraint shareapp_links_campaign_store_fk foreign key(campaign_id,store_id) references public.shareapp_campaigns(id,store_id);
create index shareapp_links_campaign_idx on public.shareapp_links(campaign_id,store_id) where campaign_id is not null;
create index shareapp_events_link_date_idx on public.shareapp_events(link_id,created_at);
create index shareapp_attributions_link_date_idx on public.shareapp_order_attributions(link_id,created_at);

-- Posters are public promotional assets. Only server APIs can upload them.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('shareapp-campaigns','shareapp-campaigns',true,3145728,array['image/jpeg'])
on conflict(id) do nothing;

-- Return aggregate JSON as ONE row so PostgREST's row limit cannot truncate
-- campaign/member totals. Only the publication detail is paginated (20/page).
create function public.shareapp_campaign_report(p_store_id uuid,p_member_id uuid default null,p_campaign_id uuid default null,p_page integer default 0)
returns jsonb language sql stable security invoker set search_path='' as $$
with traffic as (
  select e.link_id,count(distinct e.visit_id)::bigint visits,
    count(*) filter(where e.kind='product_view')::bigint product_views
  from public.shareapp_events e
  where e.store_id=p_store_id and e.created_at>=now()-interval '30 days'
    and (p_member_id is null or e.member_id=p_member_id)
  group by e.link_id
), sales as (
  select a.link_id,count(*)::bigint orders,
    count(*) filter(where o.payment_status='paid' and lower(coalesce(o.status::text,'')) not in ('cancelled','canceled'))::bigint paid_orders,
    coalesce(sum(o.total) filter(where o.payment_status='paid' and lower(coalesce(o.status::text,'')) not in ('cancelled','canceled')),0) paid_total
  from public.shareapp_order_attributions a join public.orders o on o.id=a.order_id and o.store_id=a.store_id
  where a.store_id=p_store_id and a.created_at>=now()-interval '30 days'
    and (p_member_id is null or a.member_id=p_member_id)
  group by a.link_id
), metrics as (
  select l.id,l.code,l.campaign_id,c.title campaign_title,l.member_id,m.display_name,l.title,l.network,l.active,l.created_at,
    coalesce(t.visits,0) visits,coalesce(t.product_views,0) product_views,coalesce(s.orders,0) orders,
    coalesce(s.paid_orders,0) paid_orders,coalesce(s.paid_total,0) paid_total
  from public.shareapp_links l
  join public.shareapp_campaigns c on c.id=l.campaign_id and c.store_id=l.store_id
  join public.shareapp_members m on m.id=l.member_id and m.store_id=l.store_id
  left join traffic t on t.link_id=l.id left join sales s on s.link_id=l.id
  where l.store_id=p_store_id and (p_member_id is null or l.member_id=p_member_id)
    and (p_campaign_id is null or l.campaign_id=p_campaign_id)
), campaign_totals as (
  select c.id campaign_id,c.title,c.active,count(x.id)::bigint publications,
    coalesce(sum(x.visits),0) visits,coalesce(sum(x.product_views),0) product_views,
    coalesce(sum(x.orders),0) orders,coalesce(sum(x.paid_orders),0) paid_orders,coalesce(sum(x.paid_total),0) paid_total
  from public.shareapp_campaigns c left join metrics x on x.campaign_id=c.id
  where c.store_id=p_store_id and (p_campaign_id is null or c.id=p_campaign_id)
    and (p_member_id is null or exists(select 1 from metrics z where z.campaign_id=c.id))
  group by c.id
), member_totals as (
  select member_id,display_name,count(*)::bigint publications,sum(visits) visits,sum(product_views) product_views,
    sum(orders) orders,sum(paid_orders) paid_orders,sum(paid_total) paid_total
  from metrics group by member_id,display_name
), detail as (
  select * from metrics order by visits desc,created_at desc,id
  limit 20 offset least(greatest(p_page,0),10000)*20
)
select jsonb_build_object(
  'campaigns',coalesce((select jsonb_agg(to_jsonb(c) order by c.visits desc,c.title) from campaign_totals c),'[]'::jsonb),
  'members',coalesce((select jsonb_agg(to_jsonb(m) order by m.visits desc,m.display_name) from member_totals m),'[]'::jsonb),
  'publications',coalesce((select jsonb_agg(to_jsonb(d) order by d.visits desc,d.created_at desc,d.id) from detail d),'[]'::jsonb),
  'hasMore',(select count(*) from metrics)>(least(greatest(p_page,0),10000)+1)*20,
  'periodDays',30
);
$$;
revoke all on function public.shareapp_campaign_report(uuid,uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.shareapp_campaign_report(uuid,uuid,uuid,integer) to service_role;
