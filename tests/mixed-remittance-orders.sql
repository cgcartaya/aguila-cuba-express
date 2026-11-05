-- Isolated database only: no real orders, payments, stock or WhatsApp messages.
begin;
do $$
declare sid uuid:=gen_random_uuid(); actor uuid:=gen_random_uuid(); pid uuid:=gen_random_uuid(); beer uuid:=gen_random_uuid(); result jsonb; oid uuid; itemid uuid; delivered_oid uuid;
begin
 insert into public.stores(id,subdomain,is_active,module_shipping_enabled,platform_fee_enabled,platform_fee_percent) values(sid,'alvarez-travel',true,true,true,2.5);
 insert into public.profiles(id,active,role) values(actor,true,'super_admin');
 perform set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',actor)::text,true);
 insert into public.products(id,store_id,name,price,stock) values(pid,sid,'Pollo',100,10),(beer,sid,'Cervezas',40,10);
 result:=public.create_remittance_numbered_shipment(sid,'mixed-order','MIXED',jsonb_build_object('money_amount',100,'money_total',110,'amount_paid',212.50,'money_delivery_currency','MIXED','money_usd_to_cup',50,'money_exchange_rate',920,'store_products',jsonb_build_array(jsonb_build_object('product_id',pid,'quantity',1,'unit_price',102.50))));
 if (result->>'money_delivery_amount')::numeric<>46000 or (result->>'money_usd_to_cup')::numeric<>50 or (result->>'service_price')::numeric<>212.50 then raise exception 'Mixed delivery or invoice failed: %',result; end if;
 select id into oid from public.orders where source_shipment_id='mixed-order';
 if oid is null or (select count(*) from public.orders where source_shipment_id='mixed-order')<>1 then raise exception 'Product order missing'; end if;
 if not exists(select 1 from public.orders where id=oid and total=102.50 and platform_fee_amount=2.80 and platform_fixed_fee_amount=0.30) then raise exception 'Product-only order or commission incorrect'; end if;
 if not exists(select 1 from public.order_items where order_id=oid and base_price=100 and price=102.50 and platform_fee_amount=2.50) then raise exception 'Fee evidence missing'; end if;
 if (select stock from public.products where id=pid)<>9 then raise exception 'Double stock deduction'; end if;
 update public.shipments set discount_amount=10 where id='mixed-order';
 if (select total from public.orders where id=oid)<>92.50 or (select platform_fee_amount from public.orders where id=oid)<>2.80 or (select service_price from public.shipments where id='mixed-order')<>202.50 then raise exception 'Discount or fixed fee duplicated'; end if;
 update public.shipments set discount_amount=0 where id='mixed-order';
 select id into itemid from public.order_items where order_id=oid;
 update public.shipments set store_products=store_products where id='mixed-order';
 if (select stock from public.products where id=pid)<>9 or (select count(*) from public.orders where source_shipment_id='mixed-order')<>1 or not exists(select 1 from public.order_items where id=itemid) then raise exception 'Repeated save duplicated order, stock or lines'; end if;
 begin
  update public.orders set deleted_at=now() where id=oid;
  raise exception 'Independent order delete accepted';
 exception when raise_exception then if sqlerrm='Independent order delete accepted' then raise; end if; end;
 begin
  delete from public.order_items where order_id=oid;
  raise exception 'Independent order item delete accepted';
 exception when raise_exception then if sqlerrm='Independent order item delete accepted' then raise; end if; end;
 begin
  update public.shipments set money_usd_to_cup=100 where id='mixed-order';
  raise exception 'Invalid 100 percent mixed allocation accepted';
 exception when raise_exception then if sqlerrm='Invalid 100 percent mixed allocation accepted' then raise; end if; end;
 update public.stores set platform_fee_percent=5 where id=sid;
 update public.shipments set status='out_for_delivery' where id='mixed-order';
 if (select platform_fee_amount from public.orders where id=oid)<>2.80 then raise exception 'Historical commission re-priced'; end if;
 update public.shipments set store_products=jsonb_build_array(jsonb_build_object('product_id',pid,'quantity',2,'unit_price',102.50),jsonb_build_object('product_id',beer,'quantity',1,'unit_price',42)) where id='mixed-order';
 if not exists(select 1 from public.orders where id=oid and total=247 and platform_fee_amount=7.30) then raise exception 'Edited order commission incorrect'; end if;
 if (select service_price from public.shipments where id='mixed-order')<>357 then raise exception 'Product invoice total incorrect'; end if;
 if (select stock from public.products where id=pid)<>8 or (select stock from public.products where id=beer)<>9 then raise exception 'Product delta reservation incorrect'; end if;
 update public.shipments set deleted_at=now() where id='mixed-order';
 if (select stock from public.products where id=pid)<>10 or (select platform_fee_amount from public.orders where id=oid)<>0 or (select total from public.orders where id=oid)<>0 then raise exception 'Trash did not reverse stock/commission'; end if;
 update public.shipments set deleted_at=null where id='mixed-order';
 if (select stock from public.products where id=pid)<>8 or (select platform_fee_amount from public.orders where id=oid)<>7.30 then raise exception 'Restore duplicated or lost stock/commission'; end if;
 update public.shipments set store_products='[]' where id='mixed-order';
 if (select stock from public.products where id=pid)<>10 or (select platform_fee_amount from public.orders where id=oid)<>0 or exists(select 1 from public.order_items where order_id=oid) then raise exception 'Removing products retained sale or inventory'; end if;
 update public.shipments set store_products=jsonb_build_array(jsonb_build_object('product_id',pid,'quantity',1,'unit_price',105)) where id='mixed-order';
 if (select count(*) from public.orders where source_shipment_id='mixed-order')<>1 or (select platform_fee_amount from public.orders where id=oid)<>5.30 then raise exception 'Re-adding products created duplicate order'; end if;
 delete from public.shipments where id='mixed-order';
 if (select stock from public.products where id=pid)<>10 or (select platform_fee_amount from public.orders where id=oid)<>0 then raise exception 'Permanent cancellation failed'; end if;
 result:=public.create_remittance_numbered_shipment(sid,'delivered-mixed','DONE',jsonb_build_object('money_amount',100,'money_total',110,'amount_paid',215,'money_delivery_currency','CUP','money_exchange_rate',920,'store_products',jsonb_build_array(jsonb_build_object('product_id',pid,'quantity',1,'unit_price',105))));
 select id into delivered_oid from public.orders where source_shipment_id='delivered-mixed';
 update public.shipments set delivered=true,status='delivered' where id='delivered-mixed';
 delete from public.shipments where id='delivered-mixed';
 if (select stock from public.products where id=pid)<>9 or (select platform_fee_amount from public.orders where id=delivered_oid)<>5.30 then raise exception 'Delivered sale or inventory was reversed'; end if;
 update public.stores set platform_fee_enabled=false where id=sid;
 result:=public.create_remittance_numbered_shipment(sid,'no-percentage','NO-FEE',jsonb_build_object('money_amount',100,'money_total',110,'store_products',jsonb_build_array(jsonb_build_object('product_id',pid,'quantity',1,'unit_price',100))));
 if not exists(select 1 from public.orders where source_shipment_id='no-percentage' and total=100 and platform_fee_amount=0.30) then raise exception 'Disabled percentage or fixed fee did not match normal storefront'; end if;
 result:=public.create_remittance_numbered_shipment(sid,'cash-only','CASH',jsonb_build_object('money_amount',100,'money_total',110,'money_delivery_currency','MIXED','money_usd_to_cup',50,'money_exchange_rate',920));
 if exists(select 1 from public.orders where source_shipment_id='cash-only') then raise exception 'Cash-only remittance created a product sale'; end if;
 if has_function_privilege('anon','private.sync_shipment_product_order()','EXECUTE') or has_function_privilege('authenticated','private.guard_shipment_product_order()','EXECUTE') then raise exception 'Private sync exposed'; end if;
end $$;
rollback;
