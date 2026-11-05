-- Price new shipment lines at catalog base price and retain saved line prices.
create or replace function private.normalize_remittance_delivery()
returns trigger language plpgsql security definer set search_path='' as $$
declare
 old_lines jsonb:='[]'; lines jsonb; canonical jsonb:='[]'; item jsonb; previous jsonb;
 pid uuid; p public.products; qty integer; old_qty integer; delta integer;
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
 if exists(select 1 from jsonb_array_elements(lines) x where coalesce(x->>'quantity','')!~'^[1-9][0-9]{0,2}$' or coalesce(x->>'product_id','')!~'^[0-9a-fA-F-]{36}$') then raise exception 'Producto o cantidad inválidos.'; end if;
 if (select count(*) from jsonb_array_elements(lines))<>(select count(distinct x->>'product_id') from jsonb_array_elements(lines) x) then raise exception 'No repitas el mismo producto.'; end if;
 -- Sorted product locks serialize stock reservations across concurrent purchases.
 for pid in select distinct (x->>'product_id')::uuid from jsonb_array_elements(old_lines||lines) x order by 1 loop
  select * into p from public.products where id=pid for update;
  if not found or p.store_id<>(case when tg_op='DELETE' then old.store_id else new.store_id end) then raise exception 'Producto no disponible para esta tienda.'; end if;
  select x into item from jsonb_array_elements(lines) x where (x->>'product_id')::uuid=pid;
  select x into previous from jsonb_array_elements(old_lines) x where (x->>'product_id')::uuid=pid;
  qty:=coalesce((item->>'quantity')::integer,0);old_qty:=coalesce((previous->>'quantity')::integer,0);
  if previous is not null then
   base_unit:=coalesce((previous->>'base_price')::numeric,(previous->>'unit_price')::numeric);
   fee_rate:=coalesce((previous->>'platform_fee_percent')::numeric,0);
   unit_price:=(previous->>'unit_price')::numeric;
  else
   base_unit:=round(p.price,2);
   unit_price:=base_unit;
   fee_rate:=0;
  end if;
  fee_unit:=unit_price-base_unit;
  if qty>0 and item->>'unit_price' is not null and (item->>'unit_price')::numeric is distinct from unit_price then raise exception 'El precio no coincide con esta operación. Recarga la remesa: %',p.name; end if;
  if qty>old_qty and (not p.is_active or p.deleted_at is not null or p.combo_only) then raise exception 'Producto no disponible: %',p.name; end if;
  delta:=(case when new_active then qty else 0 end)-(case when old_active then old_qty else 0 end);
  -- Hard deletion of a delivered shipment must not put delivered goods back on sale.
  if tg_op='DELETE' and old.delivered then delta:=0; end if;
  if delta>p.stock then raise exception 'Existencias insuficientes: %',p.name; end if;
  if delta<>0 then update public.products set stock=stock-delta where id=pid; end if;
  if qty>0 then
   if unit_price<0 then raise exception 'Precio de producto inválido.'; end if;
   canonical:=canonical||jsonb_build_array(jsonb_build_object('product_id',pid,'name',coalesce(previous->>'name',p.name),'quantity',qty,'unit_price',unit_price,'base_price',base_unit,'platform_fee_percent',fee_rate,'platform_fee_amount',fee_unit));
   subtotal:=subtotal+round(unit_price*qty,2);
  end if;
 end loop;
 if tg_op='DELETE' then return old; end if;
 new.store_products:=canonical;new.store_products_total:=subtotal;
 if jsonb_array_length(lines)>0 or jsonb_array_length(old_lines)>0 then
  new.service_price:=greatest(round((case when new.contains_package then coalesce(new.weight_subtotal,0) else 0 end)+(case when new.contains_money then coalesce(new.money_total,0) else 0 end)+coalesce(new.extra_fees_total,0)+subtotal-coalesce(new.discount_amount,0),2),0);
  new.amount_paid:=least(greatest(coalesce(new.amount_paid,0),0),new.service_price);
  new.balance_due:=new.service_price-new.amount_paid;
  new.payment_status:=case when new.balance_due=0 then 'paid' when new.amount_paid>0 then 'partial' else 'pending' end;
 end if;
 return new;
end $$;

-- Use the same active status for the linked order and stock reservation.
create or replace function private.sync_shipment_product_order()
returns trigger language plpgsql security definer set search_path='' as $$
declare
 shipment public.shipments; existing public.orders; oid uuid; item jsonb;
 active boolean; product_subtotal numeric; product_discount numeric; product_fees numeric; fixed_fee numeric;
 new_projection jsonb; old_projection jsonb; replace_lines boolean;
begin
 if tg_op='DELETE' then shipment:=old; else shipment:=new; end if;
 if not exists(select 1 from public.stores where id=shipment.store_id and subdomain='alvarez-travel') then
  if tg_op='DELETE' then return old; end if;return new;
 end if;
 if coalesce(auth.jwt()->>'role','')<>'service_role' and not exists(select 1 from public.profiles p where p.id=auth.uid() and p.active and (p.role='super_admin' or exists(select 1 from public.store_users u where u.user_id=p.id and u.store_id=shipment.store_id and u.active))) then raise exception 'No tienes acceso a esta empresa.'; end if;
 select * into existing from public.orders where source_shipment_id=shipment.id for update;
 if existing.id is null then
  if tg_op='DELETE' or jsonb_array_length(shipment.store_products)=0 then
   if tg_op='DELETE' then return old; end if;return new;
  end if;
  -- Updating delivery status of an old shipment must not silently create historical sales.
  if tg_op='UPDATE' and jsonb_array_length(old.store_products)>0 then
   select jsonb_agg(jsonb_build_array(x->>'product_id',x->>'quantity',x->>'unit_price') order by x->>'product_id') into old_projection from jsonb_array_elements(old.store_products) x;
   select jsonb_agg(jsonb_build_array(x->>'product_id',x->>'quantity',x->>'unit_price') order by x->>'product_id') into new_projection from jsonb_array_elements(shipment.store_products) x;
   if old_projection is not distinct from new_projection then return new; end if;
  end if;
 end if;
 active:=jsonb_array_length(shipment.store_products)>0 and (coalesce(shipment.delivered,false) or (shipment.status is distinct from 'cancelled' and shipment.deleted_at is null and tg_op<>'DELETE'));
 product_subtotal:=case when active then shipment.store_products_total else 0 end;
 product_discount:=case when active then least(coalesce(shipment.discount_amount,0),product_subtotal) else 0 end;
 select coalesce(sum(coalesce((x->>'platform_fee_amount')::numeric,0)*(x->>'quantity')::integer),0) into product_fees from jsonb_array_elements(shipment.store_products) x;
 fixed_fee:=coalesce(existing.platform_fixed_fee_amount,0.30);
 replace_lines:=existing.id is null;
 if tg_op='UPDATE' then replace_lines:=replace_lines or old.store_products is distinct from new.store_products; end if;
 oid:=coalesce(existing.id,gen_random_uuid());
 -- Shipping customers and storefront customers have separate foreign keys.
 -- Linked orders keep the sender contact as a snapshot.
 if existing.id is null then
  insert into public.orders(id,source_shipment_id,store_id,order_number,address,exact_address,country,customer_id,customer_name,customer_phone,recipient_name,recipient_phone,notes,
   subtotal,total,discount_amount,delivery_fee,platform_fee_amount,platform_fixed_fee_amount,status,payment_status,payment_method,stock_restored,deleted_at)
  values(oid,shipment.id,shipment.store_id,'REM-'||replace(oid::text,'-',''),coalesce(shipment.recipient_address,''),shipment.recipient_address,'Cuba',null,shipment.sender_name,shipment.sender_phone,shipment.recipient_name,shipment.recipient_phone,'Productos incluidos en la factura de remesa '||coalesce(shipment.tracking_code,shipment.id),
   product_subtotal,product_subtotal-product_discount,product_discount,0,case when active then product_fees+fixed_fee else 0 end,fixed_fee,
   case when not active then 'cancelled' when shipment.delivered then 'delivered' else 'processing' end,case when shipment.payment_status='paid' then 'paid' else 'pending' end,'whatsapp',true,case when active then null else coalesce(shipment.deleted_at,now()) end);
 else
  update public.orders set customer_name=shipment.sender_name,customer_phone=shipment.sender_phone,recipient_name=shipment.recipient_name,recipient_phone=shipment.recipient_phone,address=coalesce(shipment.recipient_address,''),exact_address=shipment.recipient_address,
   subtotal=product_subtotal,total=product_subtotal-product_discount,discount_amount=product_discount,platform_fee_amount=case when active then product_fees+fixed_fee else 0 end,
   status=case when not active then 'cancelled' when shipment.delivered then 'delivered' else 'processing' end,payment_status=case when shipment.payment_status='paid' then 'paid' else 'pending' end,
   deleted_at=case when active then null else coalesce(shipment.deleted_at,now()) end,stock_restored=true
  where id=oid and store_id=shipment.store_id;
 end if;
 if replace_lines then
  delete from public.order_items where order_id=oid;
  for item in select * from jsonb_array_elements(shipment.store_products) loop
   insert into public.order_items(order_id,item_type,product_id,product_name,quantity,price,base_price,platform_fee_amount,subtotal)
   values(oid,'product',(item->>'product_id')::uuid,item->>'name',(item->>'quantity')::integer,(item->>'unit_price')::numeric,coalesce((item->>'base_price')::numeric,(item->>'unit_price')::numeric),coalesce((item->>'platform_fee_amount')::numeric,0)*(item->>'quantity')::integer,(item->>'unit_price')::numeric*(item->>'quantity')::integer);
  end loop;
 end if;
 if tg_op='DELETE' then return old; end if;return new;
end $$;
revoke all on function private.sync_shipment_product_order() from public,anon,authenticated;
