-- All test rows/config changes are rolled back. No customer payments are created.
begin;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$
declare a uuid; b uuid; s text := gen_random_uuid()::text; t text := gen_random_uuid()::text; u text := gen_random_uuid()::text; v text := gen_random_uuid()::text; w text := gen_random_uuid()::text;
begin
  select id into a from public.stores where module_shipping_enabled=true order by id limit 1;
  select id into b from public.stores where module_shipping_enabled=true and id<>a order by id limit 1;
  if a is null or b is null then raise exception 'Two shipping stores required for tenant isolation test'; end if;
  insert into public.shipping_platform_billing(store_id,enabled,fee_per_operation) values(a,true,0.40),(b,true,0.75)
    on conflict(store_id) do update set enabled=excluded.enabled,fee_per_operation=excluded.fee_per_operation;
  insert into public.shipments(id,store_id,location,contains_package,contains_money,service_price,amount_paid,balance_due)
    values(s,a,'Prueba de comisión (rollback)',false,true,110,110,0);
  if (select amount from public.shipping_platform_charges where shipment_id=s) is distinct from 0.40 then raise exception 'Initial rate incorrect'; end if;
  if (select service_price from public.shipments where id=s)<>110 then raise exception 'Customer invoice changed'; end if;
  update public.shipments set notes='Edición de prueba',deleted_at=now() where id=s;
  if (select count(*) from public.shipping_platform_charges where shipment_id=s)<>1 then raise exception 'Editing created duplicate'; end if;
  update public.shipping_platform_billing set fee_per_operation=0.60 where store_id=a;
  insert into public.shipments(id,store_id,location,contains_package,contains_money,service_price) values(t,a,'Prueba de comisión (rollback)',true,true,150);
  if (select amount from public.shipping_platform_charges where shipment_id=s) is distinct from 0.40 then raise exception 'Historical rate changed'; end if;
  if (select amount from public.shipping_platform_charges where shipment_id=t) is distinct from 0.60 or (select count(*) from public.shipping_platform_charges where shipment_id=t)<>1 then raise exception 'Mixed operation should count once at new rate'; end if;
  insert into public.shipments(id,store_id,location,contains_package,contains_money) values(u,b,'Prueba de comisión (rollback)',true,false);
  if (select amount from public.shipping_platform_charges where shipment_id=u) is distinct from 0.75 then raise exception 'Tenant rate isolation failed'; end if;
  update public.shipping_platform_billing set enabled=false where store_id=a;
  insert into public.shipments(id,store_id,location,contains_package,contains_money) values(v,a,'Prueba de comisión (rollback)',false,true);
  if exists(select 1 from public.shipping_platform_charges where shipment_id=v) then raise exception 'Disabled tariff generated a charge'; end if;
  update public.shipping_platform_billing set enabled=true where store_id=a;
  perform set_config('request.jwt.claims','{"role":"anon"}',true);
  insert into public.shipments(id,store_id,location,contains_package,contains_money) values(w,a,'Prueba de comisión (rollback)',false,true);
  if exists(select 1 from public.shipping_platform_charges where shipment_id=w) then raise exception 'Anonymous insertion generated debt'; end if;
  if has_table_privilege('authenticated','public.shipping_platform_billing','UPDATE') or has_table_privilege('authenticated','public.shipping_platform_charges','INSERT') or has_function_privilege('anon','public.get_shipping_platform_billing(uuid)','EXECUTE') then raise exception 'Billing privileges too broad'; end if;
end $$;
rollback;
