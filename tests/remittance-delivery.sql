-- Isolated test database only. Do not run fixtures in production.
begin;
do $$
declare sid uuid:=gen_random_uuid(); other_sid uuid:=gen_random_uuid(); actor uuid:=gen_random_uuid(); pid uuid:=gen_random_uuid(); beer uuid:=gen_random_uuid(); foreign_pid uuid:=gen_random_uuid(); data jsonb; before_stock integer;
begin
 insert into public.stores(id,subdomain,is_active,module_shipping_enabled) values(sid,'alvarez-travel',true,true),(other_sid,'other-test',true,true);
 insert into public.profiles(id,active,role) values(actor,true,'super_admin');
 perform set_config('request.jwt.claims',jsonb_build_object('role','service_role','sub',actor)::text,true);
 insert into public.products(id,store_id,name,price,stock) values(pid,sid,'Pollo',25,10),(beer,sid,'Cervezas',15,10),(foreign_pid,other_sid,'Otra tienda',10,10);
 data:=public.create_remittance_numbered_shipment(sid,'mn-test','MN-TEST',jsonb_build_object('money_amount',100,'money_total',110,'amount_paid',150,'money_delivery_currency','CUP','money_exchange_rate',920,'store_products',jsonb_build_array(jsonb_build_object('product_id',pid,'quantity',1),jsonb_build_object('product_id',beer,'quantity',1))));
 if (data->>'money_delivery_amount')::numeric<>92000 or (data->>'store_products_total')::numeric<>40 or (data->>'service_price')::numeric<>150 then raise exception 'CUP or canonical total failed: %',data; end if;
 if (select stock from public.products where id=pid)<>9 then raise exception 'Stock not reserved'; end if;
 -- Repeated save and unrelated updates do not reserve inventory twice.
 update public.shipments set store_products=store_products where id='mn-test';
 if (select stock from public.products where id=pid)<>9 then raise exception 'Double reservation'; end if;
 update public.shipments set status='cancelled' where id='mn-test';
 if (select stock from public.products where id=pid)<>10 then raise exception 'Cancellation did not restore inventory'; end if;
 update public.shipments set status='preparing' where id='mn-test';
 if (select stock from public.products where id=pid)<>9 then raise exception 'Restore did not reserve inventory'; end if;
 begin
  update public.shipments set money_exchange_rate=0 where id='mn-test';
  raise exception 'Zero rate accepted';
 exception when raise_exception then if sqlerrm='Zero rate accepted' then raise; end if; end;
 begin
  perform public.create_remittance_numbered_shipment(sid,'bad-stock','BAD',jsonb_build_object('money_amount',100,'money_total',110,'store_products',jsonb_build_array(jsonb_build_object('product_id',pid,'quantity',99))));
  raise exception 'Overstock accepted';
 exception when raise_exception then if sqlerrm='Overstock accepted' then raise; end if; end;
 begin
  perform public.create_remittance_numbered_shipment(sid,'bad-price','BAD',jsonb_build_object('money_amount',100,'money_total',110,'store_products',jsonb_build_array(jsonb_build_object('product_id',pid,'quantity',1,'unit_price',0))));
  raise exception 'Forged price accepted';
 exception when raise_exception then if sqlerrm='Forged price accepted' then raise; end if; end;
 if exists(select 1 from public.shipments where id='bad-stock') then raise exception 'Failed operation was not atomic'; end if;
 begin
  perform public.create_remittance_numbered_shipment(sid,'bad-store','BAD',jsonb_build_object('money_amount',100,'money_total',110,'store_products',jsonb_build_array(jsonb_build_object('product_id',foreign_pid,'quantity',1))));
  raise exception 'Other store accepted';
 exception when raise_exception then if sqlerrm='Other store accepted' then raise; end if; end;
 begin
  update public.shipments set store_products=jsonb_build_array(jsonb_build_object('product_id',pid,'quantity',1.5)) where id='mn-test';
  raise exception 'Fraction accepted';
 exception when raise_exception then if sqlerrm='Fraction accepted' then raise; end if; end;
 perform set_config('request.jwt.claims','{"role":"anon"}',true);
 begin
  update public.shipments set money_exchange_rate=930 where id='mn-test';
  raise exception 'Anonymous mutation accepted';
 exception when raise_exception then if sqlerrm='Anonymous mutation accepted' then raise; end if; end;
 perform set_config('request.jwt.claims',jsonb_build_object('role','service_role','sub',actor)::text,true);
 update public.shipments set store_products='[]',money_delivery_currency='USD' where id='mn-test';
 if (select stock from public.products where id=pid)<>10 or (select service_price from public.shipments where id='mn-test')<>110 then raise exception 'Remove products failed'; end if;
 -- Receipt snapshot must retain the original unit price even if catalog price changes.
 perform public.create_remittance_numbered_shipment(sid,'delivered-stock','DELIVERED',jsonb_build_object('money_amount',100,'money_total',110,'store_products',jsonb_build_array(jsonb_build_object('product_id',pid,'quantity',1))));
 update public.products set price=30 where id=pid;
 update public.shipments set delivered=true,status='delivered' where id='delivered-stock';
 if (select store_products_total from public.shipments where id='delivered-stock')<>25 then raise exception 'Historical price changed'; end if;
 delete from public.shipments where id='delivered-stock';
 if (select stock from public.products where id=pid)<>9 then raise exception 'Delivered stock was wrongly restored'; end if;
 insert into public.shipments(id,store_id,money_amount,money_total,service_price) values('legacy-usd',other_sid,100,110,123);
 if (select service_price from public.shipments where id='legacy-usd')<>123 then raise exception 'Legacy USD operation was changed'; end if;
 perform public.mark_remittance_notifications_seen(sid,actor,'2026-01-02');
 perform public.mark_remittance_notifications_seen(sid,actor,'2026-01-01');
 if (select last_seen_at from public.remittance_notification_reads where store_id=sid and user_id=actor)<>'2026-01-02'::timestamptz then raise exception 'Read cursor moved backwards'; end if;
 if has_table_privilege('anon','public.remittance_notification_reads','SELECT') or has_function_privilege('authenticated','public.mark_remittance_notifications_seen(uuid,uuid,timestamptz)','EXECUTE') then raise exception 'Read cursors are public'; end if;
end $$;
rollback;
