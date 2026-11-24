do $$
declare
  luxury_id uuid;
  cuba_id uuid;
  source_cuba_id uuid;
begin
  select id into luxury_id from public.stores where slug = 'luxury-travel-point';
  if luxury_id is null then return; end if;

  select id into strict cuba_id from public.shipping_countries
    where store_id = luxury_id and code = 'CU';
  select country.id into strict source_cuba_id
    from public.shipping_countries country
    join public.stores agency on agency.id = country.store_id
    where agency.slug = 'alvarez-travel' and country.code = 'CU';

  -- Reuse the existing national geography with Luxury's own destination IDs.
  insert into public.shipping_provinces (store_id, country_id, name, code, sort_order, is_active)
  select luxury_id, cuba_id, source.name, source.code, source.sort_order, true
  from public.shipping_provinces source
  where source.country_id = source_cuba_id and source.is_active
    and not exists (
      select 1 from public.shipping_provinces target
      where target.country_id = cuba_id and target.name = source.name
    );

  insert into public.shipping_municipalities
    (store_id, province_id, name, code, sort_order, is_active, is_capital, is_special_municipality)
  select luxury_id, target.id, municipality.name, municipality.code, municipality.sort_order,
    true, municipality.is_capital, municipality.is_special_municipality
  from public.shipping_municipalities municipality
  join public.shipping_provinces source on source.id = municipality.province_id
  join public.shipping_provinces target on target.country_id = cuba_id and target.name = source.name
  where source.country_id = source_cuba_id and source.is_active and municipality.is_active
    and not exists (
      select 1 from public.shipping_municipalities existing
      where existing.province_id = target.id and existing.name = municipality.name
    );

  -- Keep the legacy service and rates for invoices that already reference them.
  update public.shipping_service_types set is_active = false
  where store_id = luxury_id and code = 'packages';

  insert into public.shipping_service_types (store_id, code, name, billing_mode, is_active, sort_order)
  values
    (luxury_id, 'luxury-sea', 'Marítimo regular', 'per_lb', true, 10),
    (luxury_id, 'luxury-air', 'Aéreo', 'per_lb', true, 20),
    (luxury_id, 'luxury-gold-12', 'Caja dorada 12 × 12 × 12', 'fixed', true, 30),
    (luxury_id, 'luxury-gold-15', 'Caja dorada 15 × 15 × 15', 'fixed', true, 40),
    (luxury_id, 'luxury-gold-22', 'Caja dorada 22 × 22 × 22', 'fixed', true, 50)
  on conflict (store_id, code) do update
    set name = excluded.name, billing_mode = excluded.billing_mode,
        is_active = excluded.is_active, sort_order = excluded.sort_order;

  insert into public.shipping_rates (
    store_id, service_type_id, scope_type, country_id, transport_mode,
    rate_per_lb, minimum_weight_lb, minimum_charge, fixed_fee, is_active
  )
  select luxury_id, service.id, 'country', cuba_id, tariff.transport,
    tariff.per_lb, 0, 0, tariff.fixed_price, true
  from (values
    ('luxury-sea', 'sea', 1.99, 0),
    ('luxury-air', 'air', 3.49, 0),
    ('luxury-gold-12', 'sea', 0, 45),
    ('luxury-gold-15', 'sea', 0, 70),
    ('luxury-gold-22', 'sea', 0, 160)
  ) as tariff(code, transport, per_lb, fixed_price)
  join public.shipping_service_types service on service.store_id = luxury_id and service.code = tariff.code
  where not exists (
    select 1 from public.shipping_rates existing
    where existing.store_id = luxury_id and existing.service_type_id = service.id
      and existing.scope_type = 'country' and existing.country_id = cuba_id
  );
end $$;
