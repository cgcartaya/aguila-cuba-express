-- Independent catalog for goods sold at the Hialeah agency.
create table public.physical_store_products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 200),
  price numeric(10,2) check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  is_active boolean not null default true
);
create unique index physical_store_products_name_idx
  on public.physical_store_products (store_id, lower(btrim(name)));
alter table public.physical_store_products enable row level security;
revoke all on public.physical_store_products from public, anon, authenticated;
grant select, insert on public.physical_store_products to authenticated, service_role;
grant update (name, price, stock, is_active) on public.physical_store_products to authenticated, service_role;
create policy physical_catalog_access on public.physical_store_products
  for all to authenticated
  using (
    public.has_store_access(store_id) and exists (
      select 1 from public.stores s where s.id = store_id and s.subdomain = 'alvarez-travel'
        and s.is_active and s.module_shipping_enabled
    )
  )
  with check (
    public.has_store_access(store_id) and exists (
      select 1 from public.stores s where s.id = store_id and s.subdomain = 'alvarez-travel'
        and s.is_active and s.module_shipping_enabled
    )
  );

alter table public.shipments
  add column physical_products jsonb not null default '[]' check (jsonb_typeof(physical_products) = 'array'),
  add column physical_products_total numeric(12,2) not null default 0;

create function private.normalize_physical_products()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  old_lines jsonb := '[]';
  lines jsonb := '[]';
  canonical jsonb := '[]';
  tenant uuid;
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
    if lines <> '[]' and (new.trip_id is null or not coalesce(new.contains_package, false) or new.products_only) then
      raise exception 'Los productos de Hialeah requieren un paquete con viaje.';
    end if;
  end if;

  if not exists (
    select 1 from public.stores s where s.id = tenant and s.subdomain = 'alvarez-travel'
      and s.is_active and s.module_shipping_enabled
  ) then raise exception 'Catálogo físico no disponible para esta tienda.'; end if;
  if coalesce(auth.jwt()->>'role', '') <> 'service_role'
    and not public.has_store_access(tenant) then
    raise exception 'No tienes acceso a esta empresa.';
  end if;

  if exists (
    select 1 from jsonb_array_elements(lines) x
    where coalesce(x->>'product_id', '') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
      or coalesce(x->>'quantity', '') !~ '^[1-9][0-9]{0,2}$'
  ) then raise exception 'Producto o cantidad inválidos en el catálogo de Hialeah.'; end if;
  if exists (
    select 1 from jsonb_array_elements(lines) x group by (x->>'product_id')::uuid having count(*) > 1
  ) then raise exception 'No repitas productos de Hialeah.'; end if;

  -- Lock in the same order across shipments so concurrent sales cannot oversell.
  for product_id in
    select distinct (x->>'product_id')::uuid from jsonb_array_elements(old_lines || lines) x order by 1
  loop
    select * into product from public.physical_store_products p
      where p.id = product_id and p.store_id = tenant for update;
    if not found then raise exception 'Producto de Hialeah no disponible para esta tienda.'; end if;
    select x into item from jsonb_array_elements(lines) x where (x->>'product_id')::uuid = product_id;
    select x into previous from jsonb_array_elements(old_lines) x where (x->>'product_id')::uuid = product_id;
    qty := coalesce((item->>'quantity')::integer, 0);
    old_qty := coalesce((previous->>'quantity')::integer, 0);
    delta := (case when new_active then qty else 0 end) - (case when old_active then old_qty else 0 end);
    if tg_op = 'DELETE' and old.delivered then delta := 0; end if;

    if (qty > old_qty or delta > 0) and (not product.is_active or product.price is null) then
      raise exception 'Producto de Hialeah sin precio o retirado: %', product.name;
    end if;
    if delta > product.stock then raise exception 'Existencias insuficientes en Hialeah: %', product.name; end if;
    unit_price := coalesce((previous->>'unit_price')::numeric, product.price);
    if qty > 0 then
      if unit_price is null or (item->>'unit_price')::numeric is distinct from unit_price then
        raise exception 'El precio cambió. Vuelve a seleccionar: %', product.name;
      end if;
      canonical := canonical || jsonb_build_array(jsonb_build_object(
        'product_id', product_id, 'name', coalesce(previous->>'name', product.name),
        'quantity', qty, 'unit_price', unit_price
      ));
      subtotal := subtotal + qty * unit_price;
    end if;
    if delta <> 0 then
      update public.physical_store_products set stock = stock - delta where id = product_id;
    end if;
  end loop;

  if tg_op = 'DELETE' then return old; end if;
  new.physical_products := canonical;
  new.physical_products_total := subtotal;
  -- For a mixed invoice, the existing catalog trigger recalculates with both subtotals.
  if new.store_products = '[]' then
    new.service_price := greatest(round(
      (case when new.contains_package then coalesce(new.weight_subtotal, 0) else 0 end)
      + (case when new.contains_money then coalesce(new.money_total, 0) else 0 end)
      + coalesce(new.extra_fees_total, 0) + subtotal - coalesce(new.discount_amount, 0), 2), 0);
    new.amount_paid := least(greatest(coalesce(new.amount_paid, 0), 0), new.service_price);
    new.balance_due := new.service_price - new.amount_paid;
    new.payment_status := case when new.balance_due = 0 then 'paid' when new.amount_paid > 0 then 'partial' else 'pending' end;
  end if;
  return new;
end $$;
revoke all on function private.normalize_physical_products() from public, anon, authenticated;

create trigger zy_physical_products_insert before insert on public.shipments
  for each row when (new.physical_products <> '[]' or new.physical_products_total <> 0)
  execute function private.normalize_physical_products();
create trigger zy_physical_products_update before update on public.shipments
  for each row when (new.physical_products <> '[]' or old.physical_products <> '[]' or new.physical_products_total <> 0)
  execute function private.normalize_physical_products();
create trigger zy_physical_products_delete before delete on public.shipments
  for each row when (old.physical_products <> '[]')
  execute function private.normalize_physical_products();

create or replace function private.normalize_remittance_delivery()
returns trigger language plpgsql security definer set search_path='' as $$
declare
 old_lines jsonb:='[]'; lines jsonb; canonical jsonb:='[]'; item jsonb; previous jsonb;
 pid uuid; p public.products; cid uuid; combo public.combos;
 qty integer; old_qty integer; delta bigint; components jsonb; demand record;
 tenant uuid;
 old_active boolean:=false; new_active boolean:=false; unit_price numeric; subtotal numeric:=0;
 needs_access boolean; is_alvarez boolean; fee_rate numeric; base_unit numeric; fee_unit numeric;
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
   if jsonb_array_length(lines)=0 then raise exception 'Añade al menos un producto de la tienda.'; end if;
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
  select exists(select 1 from public.stores where id=case when tg_op='DELETE' then old.store_id else new.store_id end and subdomain='alvarez-travel' and is_active and module_shipping_enabled) into is_alvarez;
  if not is_alvarez then raise exception 'Modalidad no disponible para esta tienda.'; end if;
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
end $$;

create or replace function public.create_remittance_numbered_shipment(p_store_id uuid,p_id text,p_tracking_code text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if not public.has_store_access(p_store_id) then raise exception 'No tienes acceso a esta empresa.'; end if;
 result:=public.create_numbered_shipment(p_store_id,p_id,p_tracking_code,p_payload);
 update public.shipments set
 products_only=coalesce((p_payload->>'products_only')::boolean,false),
 money_delivery_currency=coalesce(p_payload->>'money_delivery_currency','USD'),
 money_usd_to_cup=coalesce((p_payload->>'money_usd_to_cup')::numeric,0),
 money_exchange_rate=nullif(p_payload->>'money_exchange_rate','')::numeric,
 store_products=coalesce(p_payload->'store_products','[]'::jsonb),
 physical_products=coalesce(p_payload->'physical_products','[]'::jsonb),
 amount_paid=case when coalesce(p_payload->'physical_products','[]'::jsonb) <> '[]'
   then coalesce((p_payload->>'amount_paid')::numeric,0) else amount_paid end
 where id=p_id and store_id=p_store_id returning to_jsonb(shipments.*) into result;
 if result is null then raise exception 'No se pudo guardar la remesa.'; end if;
 return result;
end $$;
revoke all on function public.create_remittance_numbered_shipment(uuid,text,text,jsonb) from public,anon;
grant execute on function public.create_remittance_numbered_shipment(uuid,text,text,jsonb) to authenticated,service_role;


-- Stock is unknown in the source. Agencies enter counts before selling.
insert into public.physical_store_products (store_id, name, price)
select s.id, items.name, items.price
from public.stores s cross join (values
  ('Zumo de Limon', 1.00),
  ('Latas de Espaguetis', 0.90),
  ('Sazon Caja Pequeña', 3.00),
  ('Sazon Caja Grande', 5.00),
  ('Pomo Caldo de pollo Maggi', 2.50),
  ('Pomo Mojo', 2.50),
  ('Queso Parmesano', 8.00),
  ('Latas de Tuna', 3.00),
  ('Latas de Pollo', 8.00),
  ('Jabones dove', 6.00),
  ('Maizena', 1.50),
  ('Colonia', 5.00),
  ('Jabon Lux', 1.00),
  ('Wipes', 1.50),
  ('Desodorante Speed Stick', 2.00),
  ('Desodorante Gillette', 5.00),
  ('Lata de Leche Evaporada', 1.00),
  ('Lata de Leche Condensada', 1.90),
  ('Dulce de Leche', 3.00),
  ('Leche Quema', 3.00),
  ('Lata de Salchichas', 0.90),
  ('Lata de Sardinas', 2.00),
  ('Frijoles Colorados Enlatados', 1.50),
  ('Frijoles Negros Enlatados Iberia', 1.25),
  ('Refresco Instantaneo Luminy', 2.50),
  ('Frijoles Negros Enlatados El Ebro', 1.25),
  ('Mermelada de Guayaba Enlatada', 1.50),
  ('Aceite Oliva La Española', 5.00),
  ('Aceite de Girasol Fresko', 2.50),
  ('Aceite Oliva Iberia', 5.00),
  ('Mayonesa Neska', 2.00),
  ('Macarrones', 1.00),
  ('Espaguetis', 1.00),
  ('Saco de Arroz', 15.00),
  ('Pomo de Platanitos', 7.00),
  ('Atole', 0.50),
  ('Gelatina', 0.70),
  ('Zuko', 0.50),
  ('Butter Cookies (Galletas de Mantequilla)', 1.00),
  ('Galletas Brinky', 2.50),
  ('Jugos Panda', 7.00),
  ('Tamal en Cazuela', 3.00),
  ('Jamon Cocido DAK', 5.00),
  ('SPAM IBERIA', 3.00),
  ('Jamon Cocido IBERIA', 5.00),
  ('Manicera', null),
  ('Pasta de Tomate', null),
  ('Pasta de Bocadito Yummy', 2.50),
  ('Leche en Polvo Dianella', 8.00),
  ('Cafe el Padrino', 3.50),
  ('Bombones CONTO', null),
  ('Nutella Pequeña', 5.00),
  ('Crema Piu', 5.00),
  ('Nutella Grande', 10.00),
  ('Galletas Maria', 1.00),
  ('Bombones Snickers pqt', 7.00),
  ('Caramelos Cafe', 3.00),
  ('Caramelos Surtidos Piñata', 5.00),
  ('Cafe Pilon', 5.00),
  ('Cafe La Llave (pequeño)', 5.00),
  ('Cafe La Llave (grande)', 7.00),
  ('Cafe Bustelo Bloque', 7.00),
  ('Cafe Bustelo Lata', 5.00),
  ('Cafe Sello Rojo', 4.00),
  ('Caldo de Sopa', null),
  ('Chocolate en Polvo', 3.00),
  ('Musketeers', 1.00),
  ('Snickers', 1.00),
  ('Twix', 1.00),
  ('M&M', 1.00),
  ('Sorbeto', 0.20),
  ('Galletas Dulce Chocolate', 0.50),
  ('Caja Galletas Ritz', 12.00),
  ('Pomo M&M', null),
  ('Pomo Chupa Chupa', 10.00),
  ('Condimentos (pomos)', 2.50),
  ('Caldo de Pollo (pomo)', 5.00),
  ('Caldo de Tomate (caja) Delish', 5.00)
) as items(name, price)
where s.subdomain = 'alvarez-travel'
on conflict do nothing;
