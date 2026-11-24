alter table public.physical_store_products
  add column category text check (length(category) <= 100),
  add column description text check (length(description) <= 500),
  add column weight_lb numeric(9,2) check (weight_lb > 0);

grant update (category, description, weight_lb) on public.physical_store_products to authenticated, service_role;

alter policy physical_catalog_access on public.physical_store_products
  using (
    public.has_store_access(store_id) and exists (
      select 1 from public.stores s where s.id = store_id
        and s.subdomain in ('alvarez-travel', 'luxury-travel-point')
        and s.is_active and s.module_shipping_enabled
    )
  )
  with check (
    public.has_store_access(store_id) and exists (
      select 1 from public.stores s where s.id = store_id
        and s.subdomain in ('alvarez-travel', 'luxury-travel-point')
        and s.is_active and s.module_shipping_enabled
    )
  );

create or replace function private.normalize_physical_products()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  old_lines jsonb := '[]';
  lines jsonb := '[]';
  canonical jsonb := '[]';
  tenant uuid;
  is_luxury boolean;
  old_active boolean := false;
  new_active boolean := false;
  product public.physical_store_products;
  product_id uuid;
  item jsonb;
  previous jsonb;
  qty integer;
  old_qty integer;
  delta integer;
  unit_price numeric;
  subtotal numeric := 0;
begin
  if tg_op <> 'INSERT' then
    tenant := old.store_id;
    old_lines := old.physical_products;
    old_active := coalesce(old.delivered, false) or (old.status is distinct from 'cancelled' and old.deleted_at is null);
  end if;
  if tg_op <> 'DELETE' then
    if tenant is not null and tenant is distinct from new.store_id then
      raise exception 'No se puede cambiar la tienda de este envío.';
    end if;
    tenant := new.store_id;
    lines := new.physical_products;
    new_active := coalesce(new.delivered, false) or (new.status is distinct from 'cancelled' and new.deleted_at is null);
  end if;

  select s.subdomain = 'luxury-travel-point' into is_luxury
  from public.stores s where s.id = tenant
    and s.subdomain in ('alvarez-travel', 'luxury-travel-point')
    and s.is_active and s.module_shipping_enabled;
  if not found then raise exception 'Catálogo físico no disponible para esta tienda.'; end if;

  if tg_op <> 'DELETE' and lines <> '[]' then
    if is_luxury then
      if new.products_only then
        if new.trip_id is not null or new.contains_money then
          raise exception 'La entrega local de productos no admite viaje ni remesa.';
        end if;
      elsif (new.contains_package and new.trip_id is null)
        or (not coalesce(new.contains_package, false) and not coalesce(new.contains_money, false)) then
        raise exception 'Añade los productos a un paquete con viaje o a una remesa.';
      end if;
    elsif new.trip_id is null or not coalesce(new.contains_package, false) or new.products_only then
      raise exception 'Los productos de Hialeah requieren un paquete con viaje.';
    end if;
  end if;
  if coalesce(auth.jwt()->>'role', '') <> 'service_role'
    and not public.has_store_access(tenant) then
    raise exception 'No tienes acceso a esta empresa.';
  end if;

  if exists (
    select 1 from jsonb_array_elements(lines) x
    where coalesce(x->>'product_id', '') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
      or coalesce(x->>'quantity', '') !~ '^[1-9][0-9]{0,2}$'
  ) then raise exception 'Producto o cantidad inválidos en la tienda física.'; end if;
  if exists (
    select 1 from jsonb_array_elements(lines) x group by (x->>'product_id')::uuid having count(*) > 1
  ) then raise exception 'No repitas productos de la tienda física.'; end if;

  -- Lock in the same order across shipments so concurrent sales cannot oversell.
  for product_id in
    select distinct (x->>'product_id')::uuid from jsonb_array_elements(old_lines || lines) x order by 1
  loop
    select * into product from public.physical_store_products p
      where p.id = product_id and p.store_id = tenant for update;
    if not found then raise exception 'Producto de la tienda física no disponible para esta tienda.'; end if;
    select x into item from jsonb_array_elements(lines) x where (x->>'product_id')::uuid = product_id;
    select x into previous from jsonb_array_elements(old_lines) x where (x->>'product_id')::uuid = product_id;
    qty := coalesce((item->>'quantity')::integer, 0);
    old_qty := coalesce((previous->>'quantity')::integer, 0);
    delta := (case when new_active then qty else 0 end) - (case when old_active then old_qty else 0 end);
    if tg_op = 'DELETE' and old.delivered then delta := 0; end if;

    if (qty > old_qty or delta > 0) and (not product.is_active or product.price is null) then
      raise exception 'Producto de la tienda física sin precio o retirado: %', product.name;
    end if;
    if not is_luxury and delta > product.stock then raise exception 'Existencias insuficientes: %', product.name; end if;
    unit_price := coalesce((previous->>'unit_price')::numeric, product.price);
    if qty > 0 then
      if unit_price is null or (item->>'unit_price')::numeric is distinct from unit_price then
        raise exception 'El precio cambió. Vuelve a seleccionar: %', product.name;
      end if;
      canonical := canonical || jsonb_build_array(jsonb_build_object(
        'product_id', product_id, 'name', coalesce(previous->>'name', product.name),
        'quantity', qty, 'unit_price', unit_price
      ) || case when is_luxury then jsonb_build_object(
        'weight_lb', case when previous is null then product.weight_lb else (previous->>'weight_lb')::numeric end
      ) else '{}'::jsonb end);
      subtotal := subtotal + qty * unit_price;
    end if;
    if not is_luxury and delta <> 0 then
      update public.physical_store_products set stock = stock - delta where id = product_id;
    end if;
  end loop;

  if tg_op = 'DELETE' then return old; end if;
  new.physical_products := canonical;
  new.physical_products_total := subtotal;
  -- For a mixed invoice, the existing catalog trigger recalculates with both subtotals.
  if new.store_products = '[]' then
    new.service_price := greatest(round(
      (case when new.contains_package and not new.products_only then coalesce(new.weight_subtotal, 0) else 0 end)
      + (case when new.contains_money then coalesce(new.money_total, 0) else 0 end)
      + coalesce(new.extra_fees_total, 0) + subtotal - coalesce(new.discount_amount, 0), 2), 0);
    new.amount_paid := least(greatest(coalesce(new.amount_paid, 0), 0), new.service_price);
    new.balance_due := new.service_price - new.amount_paid;
    new.payment_status := case when new.balance_due = 0 then 'paid' when new.amount_paid > 0 then 'partial' else 'pending' end;
  end if;
  return new;
end $$;

CREATE OR REPLACE FUNCTION private.normalize_remittance_delivery()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 old_lines jsonb:='[]'; lines jsonb; canonical jsonb:='[]'; item jsonb; previous jsonb;
 pid uuid; p public.products; cid uuid; combo public.combos;
 qty integer; old_qty integer; delta bigint; components jsonb; demand record;
 tenant uuid;
 old_active boolean:=false; new_active boolean:=false; unit_price numeric; subtotal numeric:=0;
 needs_access boolean; allows_remittance_mode boolean; fee_rate numeric; base_unit numeric; fee_unit numeric;
begin
 if tg_op<>'INSERT' then
  old_lines:=old.store_products;
  old_active:=coalesce(old.delivered,false) or (old.status is distinct from 'cancelled' and old.deleted_at is null);
 end if;
 if tg_op='DELETE' then lines:='[]'; else
  lines:=new.store_products;
  if tg_op='UPDATE' and new.store_id<>old.store_id and (jsonb_array_length(old_lines)>0 or jsonb_array_length(lines)>0) then raise exception 'No se puede cambiar la tienda de esta remesa.'; end if;
  new_active:=coalesce(new.delivered,false) or (new.status is distinct from 'cancelled' and new.deleted_at is null);
  if new.products_only then
   if jsonb_array_length(lines)=0 and not (
    jsonb_array_length(new.physical_products)>0 and exists (
     select 1 from public.stores where id=new.store_id and subdomain='luxury-travel-point'
    )
   ) then raise exception 'Añade al menos un producto de la tienda.'; end if;
   if new.trip_id is not null then raise exception 'La entrega local de productos no requiere un viaje.'; end if;
   new.contains_package:=true;new.contains_money:=false;
   new.weight_lb:=0;new.rate_per_lb:=0;new.weight_subtotal:=0;new.service_type_id:=null;new.service_type_name:='Productos de la tienda';new.package_billing_mode:='weight';
  end if;
  if not coalesce(new.contains_money,false) then
   new.money_amount:=0;new.money_total:=0;new.money_commission:=0;new.money_commission_rate:=0;new.money_discount:=0;new.money_discount_reason:=null;
   new.money_delivery_currency:='USD';new.money_exchange_rate:=null;new.money_usd_to_cup:=0;
  end if;
  if jsonb_array_length(lines)>0 and not coalesce(new.contains_package,false) and not coalesce(new.contains_money,false) then raise exception 'Selecciona el contenido de la operación.'; end if;
  if jsonb_array_length(lines)>20 then raise exception 'Máximo 20 productos distintos por remesa.'; end if;
  if new.money_delivery_currency in ('CUP','MIXED') then
   if new.money_amount is null or round(new.money_amount,2)<>new.money_amount or new.money_amount<=0 or new.money_amount>100000 or new.money_exchange_rate is null or new.money_exchange_rate<=0 or new.money_exchange_rate>1000000 then raise exception 'Indica un cambio manual válido para la remesa.'; end if;
   if new.money_delivery_currency='CUP' then new.money_usd_to_cup:=new.money_amount;
   elsif new.money_usd_to_cup is null or new.money_usd_to_cup<=0 or new.money_usd_to_cup>=new.money_amount then raise exception 'La parte a convertir debe ser mayor que cero y menor que la remesa.';
   end if;
   new.money_delivery_amount:=round(new.money_usd_to_cup*new.money_exchange_rate,2);
  else new.money_usd_to_cup:=0; new.money_exchange_rate:=null; new.money_delivery_amount:=case when new.contains_money then new.money_amount else 0 end;
  end if;
 end if;
 needs_access:=jsonb_array_length(lines)>0 or jsonb_array_length(old_lines)>0 or (tg_op<>'DELETE' and new.money_delivery_currency in ('CUP','MIXED'));
 if needs_access then
  select exists(select 1 from public.stores where id=case when tg_op='DELETE' then old.store_id else new.store_id end and is_active and module_shipping_enabled and (
   subdomain='alvarez-travel'
   or (subdomain='aguila' and jsonb_array_length(lines)=0 and jsonb_array_length(old_lines)=0)
  )) into allows_remittance_mode;
  if not allows_remittance_mode then raise exception 'Modalidad no disponible para esta tienda.'; end if;
  if coalesce(auth.jwt()->>'role','')<>'service_role' and not exists(
   select 1 from public.profiles profile where profile.id=auth.uid() and profile.active
   and (profile.role='super_admin' or exists(select 1 from public.store_users membership where membership.user_id=profile.id and membership.active and membership.store_id=case when tg_op='DELETE' then old.store_id else new.store_id end))
  ) then raise exception 'No tienes acceso a esta empresa.'; end if;
 end if;
 tenant:=case when tg_op='DELETE' then old.store_id else new.store_id end;
 if exists(
  select 1 from jsonb_array_elements(lines) x
  where coalesce(x->>'quantity','') !~ '^[1-9][0-9]{0,2}$'
     or ((x->>'product_id') is null) = ((x->>'combo_id') is null)
     or coalesce(x->>'product_id',x->>'combo_id','') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
 ) then raise exception 'Producto, combo o cantidad inválidos.'; end if;
 if exists(
  select 1 from jsonb_array_elements(lines) x
  group by (x->>'product_id')::uuid,(x->>'combo_id')::uuid having count(*)>1
 ) then raise exception 'No repitas el mismo producto o combo.'; end if;

 for item in select x from jsonb_array_elements(lines) x
  order by (x->>'combo_id')::uuid nulls first,(x->>'product_id')::uuid loop
  pid:=(item->>'product_id')::uuid;
  cid:=(item->>'combo_id')::uuid;
  qty:=(item->>'quantity')::integer;
  select x into previous from jsonb_array_elements(old_lines) x
   where (x->>'product_id')::uuid is not distinct from pid
     and (x->>'combo_id')::uuid is not distinct from cid;
  old_qty:=coalesce((previous->>'quantity')::integer,0);
  if cid is not null then
   if previous is null or qty>old_qty then
    select * into combo from public.combos where id=cid and store_id=tenant and is_active and deleted_at is null;
    if not found then raise exception 'Combo no disponible para esta tienda.'; end if;
   end if;
   if previous is not null then
    components:=previous->'components';
   else
    -- Save the recipe used by this shipment, even if the catalog changes later.
    select jsonb_agg(jsonb_build_object('product_id',c.product_id,'quantity',c.quantity) order by c.product_id)
     into components from (
      select ci.product_id,sum(ci.quantity) as quantity from public.combo_items ci
      where ci.combo_id=cid group by ci.product_id
     ) c;
   end if;
   if coalesce(jsonb_array_length(components),0)=0
     or exists(select 1 from jsonb_array_elements(components) x where (x->>'quantity')::bigint<=0) then
    raise exception 'El combo no tiene componentes válidos.';
   end if;
   if qty>old_qty and exists(
    select 1 from jsonb_array_elements(components) x
    left join public.products product on product.id=(x->>'product_id')::uuid and product.store_id=tenant
    where product.id is null or not product.is_active or product.deleted_at is not null
   ) then raise exception 'El combo incluye productos no disponibles.'; end if;
   base_unit:=round(combo.price,2);
  else
   select * into p from public.products where id=pid and store_id=tenant;
   if not found then raise exception 'Producto no disponible para esta tienda.'; end if;
   if qty>old_qty and (not p.is_active or p.deleted_at is not null or p.combo_only) then
    raise exception 'Producto no disponible: %',p.name;
   end if;
   base_unit:=round(p.price,2);
  end if;

  if previous is not null then
   base_unit:=coalesce((previous->>'base_price')::numeric,(previous->>'unit_price')::numeric);
   fee_rate:=coalesce((previous->>'platform_fee_percent')::numeric,0);
   unit_price:=(previous->>'unit_price')::numeric;
  else
   fee_rate:=0;
   unit_price:=base_unit;
  end if;
  fee_unit:=unit_price-base_unit;
  if item->>'unit_price' is not null and (item->>'unit_price')::numeric is distinct from unit_price then
   raise exception 'El precio no coincide con esta operación. Recarga el formulario.';
  end if;
  if unit_price is null or unit_price<0 then raise exception 'Precio inválido.'; end if;
  canonical:=canonical||jsonb_build_array(
   jsonb_build_object(
    'name',coalesce(previous->>'name',case when cid is not null then combo.name else p.name end),
    'quantity',qty,'unit_price',unit_price,'base_price',base_unit,
    'platform_fee_percent',fee_rate,'platform_fee_amount',fee_unit
   ) || case when cid is null then jsonb_build_object('product_id',pid)
    else jsonb_build_object('combo_id',cid,'components',components) end
  );
  subtotal:=subtotal+round(unit_price*qty,2);
 end loop;

 -- Reserve the combined demand of loose products and every selected combo.
 -- Lock by product ID so concurrent stock reservations use a consistent order.
 if tg_op<>'DELETE' or not coalesce(old.delivered,false) then
  for demand in
   with changes as (
    select x,1 as direction from jsonb_array_elements(canonical) x where new_active
    union all
    select x,-1 from jsonb_array_elements(old_lines) x where old_active
   ), units as (
    select (part->>'product_id')::uuid as product_id,
     direction*(x->>'quantity')::bigint*(part->>'quantity')::bigint as quantity
    from changes cross join lateral jsonb_array_elements(
     case when x ? 'combo_id' then x->'components'
      else jsonb_build_array(jsonb_build_object('product_id',x->>'product_id','quantity',1)) end
    ) part
   )
   select product_id,sum(quantity)::bigint as quantity from units
   group by product_id having sum(quantity)<>0 order by product_id
  loop
   select * into p from public.products where id=demand.product_id and store_id=tenant for update;
   if not found then raise exception 'Producto no disponible para esta tienda.'; end if;
   delta:=demand.quantity;
   if delta>0 and (not p.is_active or p.deleted_at is not null) then raise exception 'Producto no disponible: %',p.name; end if;
   if delta>p.stock then raise exception 'Existencias insuficientes: %',p.name; end if;
   update public.products set stock=stock-delta where id=p.id and store_id=tenant;
  end loop;
 end if;
 if tg_op='DELETE' then return old; end if;
 new.store_products:=canonical;new.store_products_total:=subtotal;
 if jsonb_array_length(lines)>0 or jsonb_array_length(old_lines)>0 then
  new.service_price:=greatest(round((case when new.contains_package then coalesce(new.weight_subtotal,0) else 0 end)+(case when new.contains_money then coalesce(new.money_total,0) else 0 end)+coalesce(new.extra_fees_total,0)+subtotal+new.physical_products_total-coalesce(new.discount_amount,0),2),0);
  new.amount_paid:=least(greatest(coalesce(new.amount_paid,0),0),new.service_price);
  new.balance_due:=new.service_price-new.amount_paid;
  new.payment_status:=case when new.balance_due=0 then 'paid' when new.amount_paid>0 then 'partial' else 'pending' end;
 end if;
 return new;
end $function$;

insert into public.physical_store_products (store_id, category, name, description, weight_lb, price)
select stores.id, catalog.category, catalog.name, catalog.description, catalog.weight_lb, catalog.price
from public.stores cross join (values
  ('Alimentos', 'Arroz Canilla de grano extra largo', 'Saco de 20 lb', 20, 20),
  ('Alimentos', 'Arroz Del Sur de grano largo', 'Saco de 20 lb', 20, 20),
  ('Alimentos', 'Frijol negro Member’s Mark', 'Bolsa de 12 lb', 12, 20),
  ('Alimentos', 'Frijol pinto prelavado Member’s Mark', 'Paquete preparado de 5 lb', 5, 10),
  ('Alimentos', 'Penne Del Sur', 'Bolsa', 0.95, 2),
  ('Alimentos', 'Espaguetis de cajita', 'Caja', 1.10, 2),
  ('Alimentos', 'Coditos Mueller’s', 'Presentación de 16 oz por confirmar', 1.10, 2),
  ('Alimentos', 'Linguine #13', 'Pasta linguine; presentación por confirmar', null, 2),
  ('Alimentos', 'Top Ramen de pollo', '24 × 3 oz', null, 15),
  ('Alimentos', 'Gelatina Guamá', '3 oz', 0.20, 1),
  ('Alimentos', 'Galletas Chiky', 'Paquete de 480 g', 1.10, 6),
  ('Alimentos', 'Leche en polvo Yummy', '26 oz', 1.65, 10),
  ('Alimentos', 'Leche condensada Guamá', '13.8 oz', 0.95, 2),
  ('Alimentos', 'Leche evaporada Guamá', 'Lata marcada 12.5', 0.95, 2),
  ('Alimentos', 'Maizena', 'Presentación de 400 g por confirmar', 0.95, 5),
  ('Condimentos', 'Sazón Goya con culantro y achiote', '36 sobres, 6.33 oz', 0.55, 6),
  ('Condimentos', 'Sazón Completa Badia grande', '28 oz', 1.95, 10),
  ('Condimentos', 'Adobo Goya con pimienta', '28 oz', 1.85, 10),
  ('Condimentos', 'Comino Badia', '7 oz', 0.65, 7),
  ('Condimentos', 'Sazón Completa Badia pequeño', '9 oz', 0.75, 5),
  ('Condimentos', 'Ajo en polvo Badia', '8 oz', 0.65, 5),
  ('Aceites', 'Mezcla Guamá de girasol y oliva', '1.5 L', 3.05, 8),
  ('Aceites', 'Canola Member’s Mark', '2.84 L', 5.80, 12),
  ('Aceites', 'Mazola de maíz', 'Presentación de 96 fl oz por confirmar', 6.05, 12),
  ('Condimentos', 'Color para frijol negro Nezka', 'Color para frijol negro; capacidad por confirmar', 1.20, 7),
  ('Alimentos', 'Zuko', 'Venta por unidad', null, 5),
  ('Café', 'Sello Rojo Espresso', '10 oz', 0.65, 6),
  ('Café', 'Rico Rico azul', '8.8 oz', 0.65, 6),
  ('Café', 'Bustelo', 'Presentación de 10 oz por confirmar', 0.65, 8),
  ('Café', 'La Llave', 'Presentación de 10 oz por confirmar', 0.65, 7),
  ('Café', 'Cubita', 'Presentación de 10 oz por confirmar', 0.65, 6),
  ('Café', 'Pilón', 'Presentación de 10 oz por confirmar', 0.65, 6),
  ('Aseo', 'Jabón Irish Spring', '4 oz por barra', 0.20, 2),
  ('Aseo', 'Pasta dental Colgate Cavity Protection', 'Pasta dental; presentación por confirmar', 0.40, 5),
  ('Aseo', 'Gillette Cool Wave', 'Desodorante en gel', 0.30, 8),
  ('Aseo', 'Lady Speed Stick grande', '65 g', 0.20, 5),
  ('Aseo', 'Degree', '2.6 oz', 0.20, 5),
  ('Aseo', 'Bolitas de algodón', '100 unidades', 0.10, 3),
  ('Aseo', 'Toallitas Equate', '48 unidades', 0.65, null),
  ('Aseo', 'Agua de Violetas Mi Tesoro', '8 fl oz', 0.55, 7),
  ('Medicamentos', 'Tylenol infantil', '4 fl oz', 0.40, 9),
  ('Medicamentos', 'Motrin infantil', '4 fl oz', 0.30, 9),
  ('Medicamentos', 'Jarabe Tussin', 'Presentación de 4 fl oz por confirmar', 0.30, 3),
  ('Medicamentos', 'Pepto-Bismol Ultra', '12 fl oz', 0.85, 12),
  ('Medicamentos', 'Antiácido Member’s Mark', '265 masticables', 1.50, 12),
  ('Medicamentos', 'Vitamina C Member’s Mark', '500 tabletas', 1.65, 20),
  ('Medicamentos', 'Acetaminofén Member’s Mark', '600 capletas', 0.85, 12),
  ('Medicamentos', 'Centrum Silver Women 50+', '275 tabletas', 0.95, 28),
  ('Medicamentos', 'Centrum Silver Men 50+', '275 tabletas', 0.85, 28),
  ('Medicamentos', 'Ibuprofeno Member’s Mark', '600 tabletas', 0.40, 12),
  ('Medicamentos', 'Aspirina Member’s Mark', '365 tabletas', 0.10, 6),
  ('Aseo', 'Detergente', 'Presentación por confirmar', null, 10),
  ('Alimentos', 'Pasta Pastalia', 'Paquete', 0.85, null),
  ('Aseo', 'Lady Speed Stick pequeño', '39.6 g', 0.10, 3),
  ('Alimentos', 'Espaguetis en bolsa roja', 'Bolsa', 0.95, 2),
  ('Aseo', 'Máquinas de afeitar', 'Venta por unidad', 0.03, 1),
  ('Ventiladores', 'F16 recargable', '40,000 mAh', 6.80, 90),
  ('Ventiladores', 'F22s recargable', '40,000 mAh', 4.70, 65),
  ('Ventiladores', 'F6 recargable', '20,000 mAh', 3.25, 35)
) as catalog(category, name, description, weight_lb, price)
where stores.subdomain = 'luxury-travel-point'
on conflict (store_id, lower(btrim(name))) do nothing;
