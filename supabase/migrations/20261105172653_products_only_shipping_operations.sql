-- Products are a physical local shipment; money is optional. No historical replay.
alter table public.shipments add column products_only boolean not null default false;
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
   select case when platform_fee_enabled and platform_fee_percent>0 then round(platform_fee_percent,2) else 0 end into fee_rate from public.stores where id=p.store_id;
   base_unit:=round(p.price,2);unit_price:=round(base_unit*(1+fee_rate/100),2);
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
drop trigger zz_remittance_delivery_insert on public.shipments;
drop trigger zz_remittance_delivery_update on public.shipments;
drop trigger zz_remittance_delivery_delete on public.shipments;
-- Legacy USD-only shipments do not execute this trigger.
create trigger zz_remittance_delivery_insert before insert on public.shipments
for each row when (new.products_only or new.money_delivery_currency in ('CUP','MIXED') or jsonb_array_length(new.store_products)>0)
execute function private.normalize_remittance_delivery();
create trigger zz_remittance_delivery_update before update on public.shipments
for each row when (new.products_only or old.products_only or new.money_delivery_currency in ('CUP','MIXED') or old.money_delivery_currency in ('CUP','MIXED') or jsonb_array_length(new.store_products)>0 or jsonb_array_length(old.store_products)>0)
execute function private.normalize_remittance_delivery();
create trigger zz_remittance_delivery_delete before delete on public.shipments
for each row when (old.products_only or jsonb_array_length(old.store_products)>0)
execute function private.normalize_remittance_delivery();

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
 store_products=coalesce(p_payload->'store_products','[]'::jsonb)
 where id=p_id and store_id=p_store_id returning to_jsonb(shipments.*) into result;
 if result is null then raise exception 'No se pudo guardar la remesa.'; end if;
 return result;
end $$;
revoke all on function public.create_remittance_numbered_shipment(uuid,text,text,jsonb) from public,anon;
grant execute on function public.create_remittance_numbered_shipment(uuid,text,text,jsonb) to authenticated,service_role;


create or replace function private.queue_alvarez_remittance_notification()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.stores where id=new.store_id and subdomain='alvarez-travel' and is_active and module_shipping_enabled) then return new; end if;
 -- Manual writes must belong to an active store member; checkout uses service_role.
 if coalesce(auth.jwt()->>'role','')<>'service_role' and not exists(
  select 1 from public.profiles p where p.id=auth.uid() and p.active
  and (p.role='super_admin' or exists(select 1 from public.store_users u where u.user_id=p.id and u.store_id=new.store_id and u.active))
 ) then return new; end if;
 if tg_table_name='shipments' then
  if (not coalesce(new.contains_money,false) and jsonb_array_length(new.store_products)=0) or new.deleted_at is not null then return new; end if;
  if tg_op='UPDATE' and (coalesce(old.contains_money,false) or jsonb_array_length(old.store_products)>0) then return new; end if;
  -- Deferred until commit: checkout confirmation links its shipment in this transaction.
  if exists(select 1 from public.remittance_orders where store_id=new.store_id and shipment_id=new.id) then return new; end if;
 end if;
 insert into public.alvarez_remittance_notifications(store_id,source_kind,source_id)
 values(new.store_id,case when tg_table_name='shipments' then 'shipment' else 'order' end,new.id::text)
 on conflict(source_kind,source_id) do nothing;
 return new;
end $$;
revoke all on function private.queue_alvarez_remittance_notification() from public,anon,authenticated;
