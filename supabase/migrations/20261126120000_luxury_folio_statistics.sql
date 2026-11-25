create function public.get_luxury_folio_statistics(
  p_store uuid, p_from date default null, p_until date default null
)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with folios as materialized (
    select f.* from public.luxury_service_folios f
    where f.store_id = p_store
      and (p_from is null or f.created_at >= (p_from::timestamp at time zone 'America/New_York'))
      and (p_until is null or f.created_at < ((p_until + 1)::timestamp at time zone 'America/New_York'))
  ),
  services as (
    select case when line->>'kind' = 'shipment' then coalesce(nullif(line->>'description',''), 'shipment') else line->>'kind' end as label, count(*) as count, sum((line->>'cents')::bigint) as cents
    from folios cross join lateral jsonb_array_elements(lines) line
    group by 1
  ),
  methods as (
    select coalesce(nullif(payment->>'methodName',''), 'Sin nombre') as label,
      count(*) as count, sum((payment->>'cents')::bigint) as cents
    from folios cross join lateral jsonb_array_elements(payments) payment
    group by 1
  ),
  debts as (
    select customer_name as label, count(*) as count, sum(total_cents - paid_cents) as cents
    from folios where payment_control and total_cents > paid_cents
    group by customer_id, customer_name
    order by cents desc, customer_name limit 10
  ),
  monthly as (
    select to_char(created_at at time zone 'America/New_York','YYYY-MM') as label,
      count(*) as count, sum(paid_cents) as cents
    from folios where payment_control
    group by 1 order by 1 desc limit 12
  )
  select jsonb_build_object(
    'count', count(*),
    'billed', coalesce(sum(total_cents),0),
    'paid', coalesce(sum(paid_cents) filter (where payment_control),0),
    'due', coalesce(sum(total_cents - paid_cents) filter (where payment_control),0),
    'openCount', count(*) filter (where payment_control and total_cents > paid_cents),
    'unrecordedCount', count(*) filter (where not payment_control),
    'unrecorded', coalesce(sum(total_cents) filter (where not payment_control),0),
    'services', coalesce((select jsonb_agg(to_jsonb(services) order by cents desc, label) from services),'[]'),
    'methods', coalesce((select jsonb_agg(to_jsonb(methods) order by cents desc, label) from methods),'[]'),
    'debts', coalesce((select jsonb_agg(to_jsonb(debts) order by cents desc, label) from debts),'[]'),
    'monthly', coalesce((select jsonb_agg(to_jsonb(monthly) order by label desc) from monthly),'[]')
  ) from folios;
$$;
revoke all on function public.get_luxury_folio_statistics(uuid,date,date) from public, anon;
grant execute on function public.get_luxury_folio_statistics(uuid,date,date) to authenticated;
