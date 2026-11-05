-- Isolated test database only. All business fixtures are rolled back.
begin;
do $$
declare sid uuid:=gen_random_uuid();actor uuid:=gen_random_uuid();pid uuid:=gen_random_uuid();result jsonb;oid uuid;shipping_customer uuid:=gen_random_uuid();
begin
 insert into public.stores(id,subdomain,is_active,module_shipping_enabled,platform_fee_enabled,platform_fee_percent) values(sid,'alvarez-travel',true,true,true,2.5);
 insert into public.profiles(id,active,role) values(actor,true,'super_admin');
 perform set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',actor)::text,true);
 insert into public.products(id,store_id,name,price,stock) values(pid,sid,'Pollo',100,10);
 result:=public.create_remittance_numbered_shipment(sid,'products-only','PRODUCTS',jsonb_build_object('products_only',true,'contains_package',true,'contains_money',false,'money_amount',0,'money_total',0,'amount_paid',102.50,'store_products',jsonb_build_array(jsonb_build_object('product_id',pid,'quantity',1,'unit_price',102.50))));
 if not (result->>'products_only')::boolean or (result->>'contains_money')::boolean or (result->>'money_amount')::numeric<>0 or (result->>'money_total')::numeric<>0 or (result->>'weight_subtotal')::numeric<>0 or result->>'trip_id' is not null or (result->>'service_price')::numeric<>102.50 then raise exception 'Products-only invoice includes unwanted remittance/weight/trip'; end if;
 select id into oid from public.orders where source_shipment_id='products-only';
 if oid is null or not exists(select 1 from public.orders where id=oid and total=102.50 and platform_fee_amount=2.80 and payment_status='paid') then raise exception 'Linked order commission failed'; end if;
 if (select stock from public.products where id=pid)<>9 then raise exception 'Products-only stock not reserved once'; end if;
 set constraints shipment_remittance_whatsapp_queue immediate;
 if (select count(*) from public.alvarez_remittance_notifications where source_id='products-only')<>1 then raise exception 'Products-only WhatsApp notice missing'; end if;
 insert into public.shipping_customers(id) values(shipping_customer);
 update public.shipments set customer_id=shipping_customer,sender_name='Cliente de envíos',
  sender_phone='+13055550123',status='out_for_delivery' where id='products-only';
 if not exists(select 1 from public.shipments where id='products-only' and customer_id=shipping_customer)
  or not exists(select 1 from public.orders where id=oid and customer_id is null
   and customer_name='Cliente de envíos' and customer_phone='+13055550123') then
  raise exception 'Shipping customer or order contact was lost';
 end if;
 if (select stock from public.products where id=pid)<>9 or (select count(*) from public.orders where source_shipment_id='products-only')<>1 or (select count(*) from public.alvarez_remittance_notifications where source_id='products-only')<>1 then raise exception 'Repeated save duplicated inventory, sale or notification'; end if;
 begin
  update public.shipments set store_products='[]' where id='products-only';
  raise exception 'Empty products-only operation accepted';
 exception when raise_exception then if sqlerrm='Empty products-only operation accepted' then raise; end if; end;
 begin
  update public.shipments set trip_id=gen_random_uuid() where id='products-only';
  raise exception 'Products-only trip accepted';
 exception when raise_exception then if sqlerrm='Products-only trip accepted' then raise; end if; end;
 update public.shipments set deleted_at=now() where id='products-only';
 if (select stock from public.products where id=pid)<>10 or (select platform_fee_amount from public.orders where id=oid)<>0 then raise exception 'Trash did not reverse stock and commission'; end if;
 update public.shipments set deleted_at=null where id='products-only';
 if (select stock from public.products where id=pid)<>9 or (select platform_fee_amount from public.orders where id=oid)<>2.80 then raise exception 'Restore duplicated stock or commission'; end if;
 -- Selecting products must not force a money amount, even with stale money in a draft.
 update public.shipments set money_amount=100,money_total=110,money_commission=10 where id='products-only';
 if exists(select 1 from public.shipments where id='products-only' and (money_amount<>0 or money_total<>0 or money_commission<>0 or service_price<>102.50)) then raise exception 'Stale cash draft was billed'; end if;
end $$;
rollback;
