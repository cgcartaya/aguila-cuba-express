do $$
declare
  tenant uuid := (select id from public.stores where subdomain='luxury-travel-point');
  product uuid;
  lines jsonb;
  other_product uuid := (select p.id from public.physical_store_products p where p.store_id<>tenant limit 1);
begin
  if (select count(*) from public.physical_store_products where store_id=tenant) <> 59
    or (select count(*) from public.physical_store_products where store_id=tenant and price is null) <> 2
    or (select count(*) from public.physical_store_products where store_id=tenant and weight_lb is null) <> 4 then
    raise exception 'Luxury catalog mismatch';
  end if;
  select id into strict product from public.physical_store_products
    where store_id=tenant and name='Arroz Canilla de grano extra largo';
  lines := jsonb_build_array(jsonb_build_object('product_id',product,'quantity',2,'unit_price',20));

  perform public.create_remittance_numbered_shipment(tenant,'luxury-products-test','LUX-PRODUCTS',jsonb_build_object(
    'contains_package',true,'contains_money',false,'products_only',true,'physical_products',lines,'amount_paid',40));
  if not exists(select 1 from public.shipments where id='luxury-products-test' and products_only
    and trip_id is null and service_price=40 and balance_due=0 and physical_products->0->>'weight_lb'='20.00') then
    raise exception 'Luxury products-only invoice mismatch';
  end if;

  perform public.create_remittance_numbered_shipment(tenant,'luxury-money-test','LUX-MONEY',jsonb_build_object(
    'contains_package',false,'contains_money',true,'money_amount',100,'money_total',110,'physical_products',lines));
  if not exists(select 1 from public.shipments where id='luxury-money-test' and contains_money
    and not contains_package and trip_id is null and service_price=150 and physical_products_total=40) then
    raise exception 'Luxury remittance invoice mismatch';
  end if;

  update public.shipments set money_delivery_currency='CUP', money_exchange_rate=350
    where id='luxury-money-test';
  if not exists(select 1 from public.shipments where id='luxury-money-test'
    and money_usd_to_cup=100 and money_delivery_amount=35000 and service_price=150) then
    raise exception 'Luxury CUP remittance mismatch';
  end if;
  update public.shipments set money_delivery_currency='MIXED', money_usd_to_cup=40
    where id='luxury-money-test';
  if not exists(select 1 from public.shipments where id='luxury-money-test'
    and money_usd_to_cup=40 and money_delivery_amount=14000 and money_amount-money_usd_to_cup=60
    and service_price=150) then
    raise exception 'Luxury mixed remittance mismatch';
  end if;

  perform public.create_remittance_numbered_shipment(tenant,'luxury-package-test','LUX-PACKAGE',jsonb_build_object(
    'trip_id',gen_random_uuid(),'contains_package',true,'contains_money',false,'weight_subtotal',15,'physical_products',lines));
  if not exists(select 1 from public.shipments where id='luxury-package-test' and service_price=55) then
    raise exception 'Luxury package invoice mismatch';
  end if;
  if (select stock from public.physical_store_products where id=product)<>0 then
    raise exception 'Luxury stock should remain unmanaged';
  end if;
  begin
    update public.shipments set physical_products=jsonb_set(lines,'{0,product_id}',to_jsonb(other_product))
    where id='luxury-money-test';
    raise exception 'Cross-tenant catalog line accepted';
  exception when raise_exception then
    if sqlerrm <> 'Producto de la tienda física no disponible para esta tienda.' then raise; end if;
  end;
end $$;
