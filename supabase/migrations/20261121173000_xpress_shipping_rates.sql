insert into public.shipping_countries (store_id, name, code)
select id, 'Cuba', 'CU' from public.stores s where slug = 'xpress'
and not exists (select 1 from public.shipping_countries c where c.store_id = s.id and upper(c.code) = 'CU');

with catalog(code, name, mode, amount, lo, hi, position) as (values
  ('frutas','Frutas frescas','express',3.99,null::int,null::int,1),
  ('alimentos','Medicinas, alimentos, aseo y congelados','express',4.99,null,null,2),
  ('miscelaneas','Misceláneas','express',5.99,null,null,3),
  ('tablets','Tablets','express',50,null,null,4),
  ('computadoras','Computadoras','express',50,null,null,5),
  ('celulares','Teléfonos celulares','express',40,null,null,6),
  ('carga','Carga aérea','air',2.75,10,15,7),
  ('basicos','Alimentos, medicinas, aseo y misceláneas','sea',1.49,30,45,8),
  ('duraderos','Artículos duraderos','sea',1.99,30,45,9),
  ('caja-121212','Caja 12×12×12','sea',45,30,45,10),
  ('caja-151515','Caja 15×15×15','sea',65,30,45,11),
  ('caja-161616','Caja 16×16×16','sea',75,30,45,12),
  ('caja-241212','Caja 24×12×12','sea',75,30,45,13),
  ('caja-241818','Caja 24×18×18','sea',100,30,45,14)
), prepared as (
  select *, case when position in (4,5,6) or position >= 10 then 'fixed' else 'per_lb' end billing
  from catalog
), services as (
  insert into public.shipping_service_types (store_id, name, code, billing_mode, sort_order)
  select s.id, p.name, 'xpress-' || p.code, p.billing, p.position
  from public.stores s cross join prepared p where s.slug = 'xpress'
  on conflict (store_id, code) do update set code = excluded.code
  returning id, store_id, code
)
insert into public.shipping_rates (store_id, scope_type, country_id, service_type_id, transport_mode,
  rate_per_lb, fixed_fee, estimated_days_min, estimated_days_max)
select t.store_id, 'country', c.id, t.id, p.mode,
  case when p.billing = 'per_lb' then p.amount else 0 end,
  case when p.billing = 'fixed' then p.amount else 0 end, p.lo, p.hi
from services t join prepared p on t.code = 'xpress-' || p.code
join lateral (
  select id from public.shipping_countries
  where store_id = t.store_id and upper(code) = 'CU' order by is_active desc, id limit 1
) c on true
where not exists (
  select 1 from public.shipping_rates r where r.store_id = t.store_id and r.service_type_id = t.id
  and r.country_id = c.id and r.transport_mode = p.mode and r.scope_type = 'country'
);
