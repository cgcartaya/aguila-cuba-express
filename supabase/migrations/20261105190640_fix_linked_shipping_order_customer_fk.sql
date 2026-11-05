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
 active:=jsonb_array_length(shipment.store_products)>0 and (coalesce(shipment.delivered,false) or (shipment.deleted_at is null and tg_op<>'DELETE'));
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
