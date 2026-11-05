-- Delivery cash is separate from USD invoicing. Rates are entered per operation.
alter table public.shipments
 add column money_delivery_currency text not null default 'USD' check(money_delivery_currency in ('USD','CUP')),
 add column money_exchange_rate numeric(12,4),
 add column money_delivery_amount numeric(18,2) not null default 0,
 add column store_products jsonb not null default '[]' check(jsonb_typeof(store_products)='array'),
 add column store_products_total numeric(12,2) not null default 0;

create function private.normalize_remittance_delivery()
returns trigger language plpgsql security definer set search_path='' as $$
declare
 old_lines jsonb:='[]'; lines jsonb; canonical jsonb:='[]'; item jsonb; previous jsonb;
 pid uuid; p public.products; qty integer; old_qty integer; delta integer;
 old_active boolean:=false; new_active boolean:=false; unit_price numeric; subtotal numeric:=0;
 needs_access boolean; is_alvarez boolean;
begin
 if tg_op<>'INSERT' then
  old_lines:=old.store_products;
  old_active:=coalesce(old.delivered,false) or (old.status is distinct from 'cancelled' and old.deleted_at is null);
 end if;
 if tg_op='DELETE' then lines:='[]'; else
  lines:=new.store_products;
  if tg_op='UPDATE' and new.store_id<>old.store_id and (jsonb_array_length(old_lines)>0 or jsonb_array_length(lines)>0) then raise exception 'No se puede cambiar la tienda de esta remesa.'; end if;
  new_active:=coalesce(new.delivered,false) or (new.status is distinct from 'cancelled' and new.deleted_at is null);
  if not coalesce(new.contains_money,false) and (jsonb_array_length(lines)>0 or new.money_delivery_currency='CUP') then raise exception 'Estos datos requieren una remesa.'; end if;
  if jsonb_array_length(lines)>20 then raise exception 'Máximo 20 productos distintos por remesa.'; end if;
  if new.money_delivery_currency='CUP' then
   if new.money_amount<=0 or new.money_amount>100000 or new.money_exchange_rate is null or new.money_exchange_rate<=0 or new.money_exchange_rate>1000000 then raise exception 'Indica un cambio manual válido para la remesa.'; end if;
   new.money_delivery_amount:=round(new.money_amount*new.money_exchange_rate,2);
  else new.money_exchange_rate:=null; new.money_delivery_amount:=case when new.contains_money then new.money_amount else 0 end;
  end if;
 end if;
 needs_access:=jsonb_array_length(lines)>0 or jsonb_array_length(old_lines)>0 or (tg_op<>'DELETE' and new.money_delivery_currency='CUP');
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
  if old_qty=0 and item->>'unit_price' is not null and (item->>'unit_price')::numeric is distinct from p.price then raise exception 'El precio cambió. Vuelve a seleccionar el producto: %',p.name; end if;
  if qty>old_qty and (not p.is_active or p.deleted_at is not null or p.combo_only) then raise exception 'Producto no disponible: %',p.name; end if;
  delta:=(case when new_active then qty else 0 end)-(case when old_active then old_qty else 0 end);
  -- Hard deletion of a delivered shipment must not put delivered goods back on sale.
  if tg_op='DELETE' and old.delivered then delta:=0; end if;
  if delta>p.stock then raise exception 'Existencias insuficientes: %',p.name; end if;
  if delta<>0 then update public.products set stock=stock-delta where id=pid; end if;
  if qty>0 then
   unit_price:=case when previous is not null then (previous->>'unit_price')::numeric else p.price end;
   if unit_price<0 then raise exception 'Precio de producto inválido.'; end if;
   canonical:=canonical||jsonb_build_array(jsonb_build_object('product_id',pid,'name',coalesce(previous->>'name',p.name),'quantity',qty,'unit_price',unit_price));
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
revoke all on function private.normalize_remittance_delivery() from public,anon,authenticated;
-- Legacy USD-only shipments do not execute this trigger.
create trigger zz_remittance_delivery_insert before insert on public.shipments
for each row when (new.money_delivery_currency='CUP' or jsonb_array_length(new.store_products)>0)
execute function private.normalize_remittance_delivery();
create trigger zz_remittance_delivery_update before update on public.shipments
for each row when (new.money_delivery_currency='CUP' or old.money_delivery_currency='CUP' or jsonb_array_length(new.store_products)>0 or jsonb_array_length(old.store_products)>0)
execute function private.normalize_remittance_delivery();
create trigger zz_remittance_delivery_delete before delete on public.shipments
for each row when (jsonb_array_length(old.store_products)>0)
execute function private.normalize_remittance_delivery();

-- Existing numbering/access checks plus new details in one transaction.
create function public.create_remittance_numbered_shipment(p_store_id uuid,p_id text,p_tracking_code text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if not public.has_store_access(p_store_id) then raise exception 'No tienes acceso a esta empresa.'; end if;
 result:=public.create_numbered_shipment(p_store_id,p_id,p_tracking_code,p_payload);
 update public.shipments set
 money_delivery_currency=coalesce(p_payload->>'money_delivery_currency','USD'),
 money_exchange_rate=nullif(p_payload->>'money_exchange_rate','')::numeric,
 store_products=coalesce(p_payload->'store_products','[]'::jsonb)
 where id=p_id and store_id=p_store_id returning to_jsonb(shipments.*) into result;
 if result is null then raise exception 'No se pudo guardar la remesa.'; end if;
 return result;
end $$;
revoke all on function public.create_remittance_numbered_shipment(uuid,text,text,jsonb) from public,anon;
grant execute on function public.create_remittance_numbered_shipment(uuid,text,text,jsonb) to authenticated,service_role;

-- Per administrator read cursor; orders remain the source of truth.
create table public.remittance_notification_reads (
 store_id uuid not null references public.stores(id),user_id uuid not null references public.profiles(id),
 last_seen_at timestamptz not null,primary key(store_id,user_id)
);
alter table public.remittance_notification_reads enable row level security;
revoke all on public.remittance_notification_reads from public,anon,authenticated;
grant all on public.remittance_notification_reads to service_role;

create function public.mark_remittance_notifications_seen(p_store_id uuid,p_user_id uuid,p_before timestamptz)
returns void language sql security invoker set search_path='' as $$
 insert into public.remittance_notification_reads(store_id,user_id,last_seen_at) values(p_store_id,p_user_id,least(p_before,now()))
 on conflict(store_id,user_id) do update set last_seen_at=greatest(remittance_notification_reads.last_seen_at,excluded.last_seen_at);
$$;
revoke all on function public.mark_remittance_notifications_seen(uuid,uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.mark_remittance_notifications_seen(uuid,uuid,timestamptz) to service_role;
