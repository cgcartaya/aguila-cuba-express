begin;
do $$
declare
 sid uuid:=gen_random_uuid(); actor uuid:=gen_random_uuid();
 pid uuid:=gen_random_uuid(); replacement uuid:=gen_random_uuid(); cid uuid:=gen_random_uuid();
 cart jsonb; result jsonb; oid uuid;
begin
 insert into public.stores(id,subdomain,is_active,module_shipping_enabled,platform_fee_enabled,platform_fee_percent)
 values(sid,'alvarez-travel',true,true,true,2.5);
 insert into public.profiles(id,active,role) values(actor,true,'super_admin');
 perform set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',actor)::text,true);
 insert into public.products(id,store_id,name,price,stock)
 values(pid,sid,'Producto',10,5),(replacement,sid,'Repuesto',12,7);
 insert into public.combos(id,store_id,name,price) values(cid,sid,'Combo familiar',17);
 insert into public.combo_items(combo_id,product_id,quantity) values(cid,pid,2);

 cart:=jsonb_build_array(
  jsonb_build_object('combo_id',cid,'quantity',2,'unit_price',17,'components','[]'::jsonb),
  jsonb_build_object('product_id',pid,'quantity',2,'unit_price',10));
 begin
  perform public.create_remittance_numbered_shipment(sid,'insufficient','BAD',
   jsonb_build_object('products_only',true,'contains_package',true,'contains_money',false,'store_products',cart));
  raise exception 'Combined demand was not checked';
 exception when raise_exception then
  if sqlerrm not like 'Existencias insuficientes:%' then raise; end if;
 end;
 if exists(select 1 from public.shipments where id='insufficient') or (select stock from public.products where id=pid)<>5 then
  raise exception 'Failed reservation left a partial shipment';
 end if;

 cart:=jsonb_set(cart,'{1,quantity}','1');
 result:=public.create_remittance_numbered_shipment(sid,'combo-local','LOCAL',
  jsonb_build_object('products_only',true,'contains_package',true,'contains_money',false,'store_products',cart));
 select id into oid from public.orders where source_shipment_id='combo-local';
 if (result->>'service_price')::numeric<>44 or (select stock from public.products where id=pid)<>0
  or not exists(select 1 from public.order_items where order_id=oid and item_type='combo'
   and combo_id=cid and product_id is null and quantity=2 and price=17 and platform_fee_amount=0) then
  raise exception 'Combo base price, invoice, or component reservation is wrong';
 end if;

 update public.combos set price=19 where id=cid;
 update public.combo_items set product_id=replacement where combo_id=cid;
 update public.shipments set status='cancelled' where id='combo-local';
 if (select stock from public.products where id=pid)<>5 or (select stock from public.products where id=replacement)<>7 then
  raise exception 'Cancellation returned the new recipe instead of the reserved components';
 end if;
 update public.shipments set status='preparing' where id='combo-local';
 if (select stock from public.products where id=pid)<>0
  or (select total from public.orders where id=oid)<>44
  or (select count(*) from public.orders where source_shipment_id='combo-local')<>1 then
  raise exception 'Restoring an existing shipment repriced or duplicated the combo';
 end if;

 result:=public.create_remittance_numbered_shipment(sid,'combo-remittance','REMIT',
  jsonb_build_object('contains_money',true,'money_amount',100,'money_total',110,
   'store_products',jsonb_build_array(jsonb_build_object('combo_id',cid,'quantity',1,'unit_price',19))));
 if (result->>'service_price')::numeric<>129 or (select stock from public.products where id=replacement)<>5 then
  raise exception 'Remittance plus combo total or stock is wrong';
 end if;
end $$;
rollback;
