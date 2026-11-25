create table public.luxury_folio_options (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  kind text not null check (kind in ('provider','method')),
  name text not null check (name = btrim(name) and length(name) between 1 and 100),
  active boolean not null default true
);
create unique index luxury_folio_options_unique on public.luxury_folio_options(store_id, kind, lower(name));
alter table public.luxury_folio_options enable row level security;
revoke all on public.luxury_folio_options from public, anon, authenticated;
grant select, insert, update (active) on public.luxury_folio_options to authenticated;
create policy luxury_folio_options_access on public.luxury_folio_options
  for all to authenticated using (private.can_access_luxury_folios(store_id))
  with check (private.can_access_luxury_folios(store_id));
alter table public.luxury_service_folios
  add column payment_control boolean not null default false,
  add column payments jsonb not null default '[]',
  add column paid_cents bigint not null default 0 check (paid_cents between 0 and total_cents);

create or replace function public.save_luxury_service_folio_with_payments(
  p_id uuid, p_store uuid, p_customer uuid, p_trip uuid, p_lines jsonb, p_total_cents bigint, p_payments jsonb
)
returns public.luxury_service_folios language plpgsql security definer set search_path='' as $$
declare
  saved public.luxury_service_folios;
  customer_name text;
  recipient public.shipping_recipients;
  service public.shipping_service_types;
  rate public.shipping_rates;
  product public.physical_store_products;
  line jsonb;
  entry public.luxury_folio_options;
  provider_name text;
  payment jsonb;
  payment_snapshot jsonb := '[]';
  paid bigint := 0;
  payment_amount numeric;
  canonical jsonb := '[]';
  units numeric;
  price numeric;
  cents bigint;
  total bigint := 0;
  description text;
  unit text;
  destination text;
begin
  if not private.can_access_luxury_folios(p_store) then raise exception 'No tienes acceso a los folios de Luxury.'; end if;
  if p_id is null then raise exception 'Identificador de solicitud inválido.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text, 0));
  select * into saved from public.luxury_service_folios where id = p_id and store_id = p_store;
  if found then return saved; end if;

  select c.name into customer_name from public.shipping_customers c
  where c.id = p_customer and c.store_id = p_store and c.is_active;
  if not found then raise exception 'Selecciona un cliente activo de Luxury.'; end if;
  if p_trip is not null and not exists (select 1 from public.shipping_trips t
    where t.id = p_trip and t.store_id = p_store and t.deleted_at is null) then
    raise exception 'El viaje no pertenece a Luxury o ya no está disponible.';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' then raise exception 'Añade al menos un concepto.'; end if;
  if jsonb_array_length(p_lines) not between 1 and 100 then raise exception 'Añade entre 1 y 100 conceptos.'; end if;

  for line in select value from jsonb_array_elements(p_lines) loop
    destination := null;
    provider_name := null;
    if nullif(line->>'providerId','') is not null then
      select * into entry from public.luxury_folio_options where id=(line->>'providerId')::uuid
        and store_id=p_store and kind='provider' and active;
      if not found then raise exception 'El proveedor ya no está disponible.'; end if;
      provider_name := entry.name;
    end if;
    if line->>'recipientId' is not null or line->>'kind' in ('shipment','customs') then
      select r.* into recipient from public.shipping_recipients r
      where r.id = (line->>'recipientId')::uuid and r.store_id = p_store and r.is_active
        and exists (select 1 from public.shipping_customer_recipients link
          where link.customer_id = p_customer and link.recipient_id = r.id and link.store_id = p_store and link.is_active);
      if not found then raise exception 'El destinatario debe estar asociado al cliente.'; end if;
      destination := concat_ws(' · ', recipient.name, nullif(recipient.address, ''));
    end if;
    if line->>'kind' = 'shipment' then
      select * into service from public.shipping_service_types
        where id = (line->>'serviceId')::uuid and store_id = p_store and is_active and code like 'luxury-%';
      if not found then raise exception 'La modalidad ya no está disponible.'; end if;
      select * into rate from public.shipping_rates
        where store_id = p_store and service_type_id = service.id and is_active
          and scope_type = 'country' and country_id = recipient.country_id
        order by priority, id limit 1;
      if not found then raise exception 'No hay tarifa para este destino.'; end if;
      units := (line->>'units')::numeric;
      if units is null or units not between 0.01 and 100000 or units <> round(units, 2)
        or (service.billing_mode = 'fixed' and units <> trunc(units)) then raise exception 'Cantidad inválida.'; end if;
      price := case when service.billing_mode = 'fixed' then rate.fixed_fee else rate.rate_per_lb end;
      unit := case when service.billing_mode = 'fixed' then 'caja' else 'lb' end;
      description := service.name;
    elsif line->>'kind' = 'product' then
      select p.* into product from public.physical_store_products p
        where id = (line->>'productId')::uuid and store_id = p_store and p.is_active and p.price is not null;
      if not found then raise exception 'El producto de la tienda física ya no está disponible.'; end if;
      units := (line->>'units')::numeric;
      if units is null or units not between 1 and 999 or units <> trunc(units) then raise exception 'Cantidad de producto inválida.'; end if;
      price := product.price;
      unit := 'unidad';
      description := product.name;
    elsif line->>'kind' = 'customs' then
      units := 1;
      unit := 'cargo';
      price := (line->>'unitPrice')::numeric;
      description := nullif(btrim(line->>'notes'), '');
      if description is null or length(description) > 160 then raise exception 'Especifica el duradero o artículo del cargo aduanal.'; end if;
      description := 'Aduana · ' || description;
    elsif line->>'kind' in ('passport', 'remittance', 'other') then
      units := 1;
      unit := 'servicio';
      price := (line->>'unitPrice')::numeric;
      description := concat_ws(' · ', case line->>'kind'
        when 'passport' then 'Pasaporte' when 'remittance' then 'Remesa registrada en otro sistema'
        else null end, nullif(btrim(line->>'notes'), ''));
      if length(description) not between 1 and 250 then raise exception 'Indica un concepto de hasta 250 caracteres.'; end if;
    else raise exception 'Tipo de concepto inválido.';
    end if;
    if price is null or price not between (case when line->>'kind' = 'product' then 0 else 0.01 end) and 1000000 or price <> round(price, 2) then raise exception 'Importe inválido.'; end if;
    cents := round(units * price * 100);
    if cents < 1 and line->>'kind' <> 'product' then raise exception 'El importe del renglón debe ser de al menos un centavo.'; end if;
    total := total + cents;
    canonical := canonical || jsonb_build_array(jsonb_build_object(
      'kind', line->>'kind', 'description', description, 'destination', destination,
      'providerId', nullif(line->>'providerId',''), 'providerName', provider_name,
      'productId', line->>'productId', 'groupId', line->>'groupId',
      'recipientId', line->>'recipientId', 'serviceId', line->>'serviceId',
      'units', units, 'unit', unit, 'unitPrice', price, 'cents', cents));
  end loop;
  if total is distinct from p_total_cents then raise exception 'El total cambió. Revisa los precios antes de guardar.'; end if;
  if p_payments is null or jsonb_typeof(p_payments) <> 'array' then raise exception 'Pagos inválidos.'; end if;
  if jsonb_array_length(p_payments)>30 then raise exception 'Máximo 30 pagos por folio.'; end if;
  for payment in select value from jsonb_array_elements(p_payments) loop
    select * into entry from public.luxury_folio_options where id=(payment->>'methodId')::uuid
      and store_id=p_store and kind='method' and active;
    if not found then raise exception 'Selecciona una forma de pago activa.'; end if;
    payment_amount := (payment->>'cents')::numeric;
    if payment_amount is null or payment_amount not between 1 and total or payment_amount <> trunc(payment_amount) then
      raise exception 'El importe del pago no es válido.';
    end if;
    paid := paid + payment_amount::bigint;
    payment_snapshot := payment_snapshot || jsonb_build_array(jsonb_build_object(
      'methodId',entry.id,'methodName',entry.name,'cents',payment_amount,
      'reference',left(btrim(payment->>'reference'),120)));
  end loop;
  if paid > total then raise exception 'Los pagos superan el total de la factura.'; end if;
  insert into public.luxury_service_folios (id, store_id, customer_id, customer_name, trip_id, lines, total_cents, created_by, payments, paid_cents, payment_control)
    values (p_id, p_store, p_customer, customer_name, p_trip, canonical, total, auth.uid(), payment_snapshot, paid, true)
    returning * into saved;
  return saved;
end;
$$;
revoke all on function public.save_luxury_service_folio_with_payments(uuid,uuid,uuid,uuid,jsonb,bigint,jsonb) from public, anon;
grant execute on function public.save_luxury_service_folio_with_payments(uuid,uuid,uuid,uuid,jsonb,bigint,jsonb) to authenticated;
