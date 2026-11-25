create table public.luxury_service_folios (
  id uuid primary key,
  folio bigint generated always as identity unique,
  store_id uuid not null references public.stores(id),
  customer_id uuid not null,
  customer_name text not null,
  trip_id uuid,
  lines jsonb not null,
  total_cents bigint not null check (total_cents > 0),
  created_at timestamptz not null default now(),
  created_by uuid not null
);

alter table public.luxury_service_folios enable row level security;
revoke all on public.luxury_service_folios from public, anon, authenticated;
grant select on public.luxury_service_folios to authenticated;
create index on public.luxury_service_folios (store_id, folio desc);

create function private.can_access_luxury_folios(p_store uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.stores s join public.profiles p on p.id = auth.uid() and p.active
    where s.id = p_store and s.slug = 'luxury-travel-point' and s.is_active and s.module_shipping_enabled
      and (p.role = 'super_admin' or exists (
        select 1 from public.store_users u
        where u.store_id = s.id and u.user_id = p.id and u.active
          and u.role::text in ('OWNER', 'ADMIN', 'OPERATIONS')
      ))
  );
$$;
revoke all on function private.can_access_luxury_folios(uuid) from public, anon;
grant execute on function private.can_access_luxury_folios(uuid) to authenticated;
create policy luxury_folios_read on public.luxury_service_folios
  for select to authenticated using (private.can_access_luxury_folios(store_id));

create function public.save_luxury_service_folio(
  p_id uuid, p_store uuid, p_customer uuid, p_trip uuid, p_lines jsonb, p_total_cents bigint
)
returns public.luxury_service_folios language plpgsql security definer set search_path='' as $$
declare
  saved public.luxury_service_folios;
  customer_name text;
  recipient public.shipping_recipients;
  service public.shipping_service_types;
  rate public.shipping_rates;
  line jsonb;
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
    if line->>'kind' = 'shipment' then
      select r.* into recipient from public.shipping_recipients r
      where r.id = (line->>'recipientId')::uuid and r.store_id = p_store and r.is_active
        and exists (select 1 from public.shipping_customer_recipients link
          where link.customer_id = p_customer and link.recipient_id = r.id and link.store_id = p_store and link.is_active);
      if not found then raise exception 'El destinatario debe estar asociado al cliente.'; end if;
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
      destination := concat_ws(' · ', recipient.name, nullif(recipient.address, ''));
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
    if price is null or price not between 0.01 and 1000000 or price <> round(price, 2) then raise exception 'Importe inválido.'; end if;
    cents := round(units * price * 100);
    if cents < 1 then raise exception 'El importe del renglón debe ser de al menos un centavo.'; end if;
    total := total + cents;
    canonical := canonical || jsonb_build_array(jsonb_build_object(
      'kind', line->>'kind', 'description', description, 'destination', destination,
      'recipientId', line->>'recipientId', 'serviceId', line->>'serviceId',
      'units', units, 'unit', unit, 'unitPrice', price, 'cents', cents));
  end loop;
  if total is distinct from p_total_cents then raise exception 'El total cambió. Revisa los precios antes de guardar.'; end if;
  insert into public.luxury_service_folios (id, store_id, customer_id, customer_name, trip_id, lines, total_cents, created_by)
    values (p_id, p_store, p_customer, customer_name, p_trip, canonical, total, auth.uid())
    returning * into saved;
  return saved;
end;
$$;
revoke all on function public.save_luxury_service_folio(uuid,uuid,uuid,uuid,jsonb,bigint) from public, anon;
grant execute on function public.save_luxury_service_folio(uuid,uuid,uuid,uuid,jsonb,bigint) to authenticated;
