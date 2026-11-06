do $$
declare
  tenant uuid;
  physical_id uuid;
  online_id uuid := gen_random_uuid();
  online_lines jsonb;
  physical_lines jsonb;
  actor uuid := gen_random_uuid();
begin
  select id into tenant from public.stores where subdomain = 'alvarez-travel' limit 1;
  insert into public.profiles(id,active,role) values(actor,true,'super_admin');
  perform set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',actor)::text,false);

  if (select count(*) from public.physical_store_products where store_id=tenant) <> 78
     or (select count(*) from public.physical_store_products where store_id=tenant and price is null) <> 5
     or exists(select 1 from public.physical_store_products where store_id=tenant and stock<>0) then
    raise exception 'Catalog seed mismatch';
  end if;
  update public.physical_store_products set stock=5
    where store_id=tenant and name='Zumo de Limon' returning id into physical_id;
  insert into public.products(id,store_id,name,price,stock) values(online_id,tenant,'Mixed test Cuba',10,9);
  online_lines := jsonb_build_array(jsonb_build_object('product_id',online_id,'quantity',1,'unit_price',10));
  physical_lines := jsonb_build_array(jsonb_build_object('product_id',physical_id,'quantity',2,'unit_price',1));

  perform public.create_remittance_numbered_shipment(tenant,'physical-test','PHYSICAL',jsonb_build_object(
    'trip_id',gen_random_uuid(),'contains_package',true,'contains_money',false,
    'weight_subtotal',20,'amount_paid',31,'discount_amount',1,
    'store_products',online_lines,'physical_products',physical_lines));

  if not exists(select 1 from public.shipments where id='physical-test' and service_price=31
    and amount_paid=31 and balance_due=0 and physical_products_total=2 and store_products_total=10) then
    raise exception 'Mixed invoice math mismatch';
  end if;

  begin
    update public.shipments set physical_products=jsonb_set(physical_lines,'{0,quantity}','6') where id='physical-test';
    raise exception 'Oversell unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm not like 'Existencias insuficientes%' then raise; end if;
  end;
  begin
    update public.shipments set trip_id=null where id='physical-test';
    raise exception 'Shipment without trip unexpectedly accepted';
  exception when raise_exception then
    if sqlerrm <> 'Los productos de Hialeah requieren un paquete con viaje.' then raise; end if;
  end;

  update public.physical_store_products set price=3 where id=physical_id;
  update public.shipments set physical_products=jsonb_set(physical_lines,'{0,quantity}','1') where id='physical-test';
  if (select physical_products_total from public.shipments where id='physical-test') <> 1 then
    raise exception 'Historical price changed';
  end if;
  if (select stock from public.physical_store_products where id=physical_id) <> 4
    or (select stock from public.products where id=online_id) <> 8 then
    raise exception 'Stock was not reserved by catalog';
  end if;
  update public.shipments set deleted_at=now() where id='physical-test';
  if (select stock from public.physical_store_products where id=physical_id) <> 5
    or (select stock from public.products where id=online_id) <> 9 then
    raise exception 'Stock was not restored';
  end if;
end $$;
