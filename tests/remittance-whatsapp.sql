-- Rollback-only integration test. No HTTP and no retained business records.
begin;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$
declare sid uuid; other_sid uuid; oid uuid; manual_id text:=gen_random_uuid()::text; converted_id text:=gen_random_uuid()::text; other_id text:=gen_random_uuid()::text; blocked_id text:=gen_random_uuid()::text; transitioned_id text:=gen_random_uuid()::text; actor uuid; n integer;
begin
 select id into sid from public.stores where subdomain='alvarez-travel';
 select id into other_sid from public.stores where subdomain is distinct from 'alvarez-travel' limit 1;
 select id into actor from public.profiles where active limit 1;
 insert into public.remittance_orders(store_id,idempotency_key,payload,amount,commission,commission_rate,total,rates_snapshot)
 values(sid,gen_random_uuid(),'{}',100,10,10,110,'{}') returning id into oid;
 if not exists(select 1 from public.alvarez_remittance_notifications where source_kind='order' and source_id=oid::text) then raise exception 'Checkout not queued'; end if;
 insert into public.shipments(id,store_id,location,package_number,contains_money,money_amount) overriding system value
 values(converted_id,sid,'Rollback test',-992001,true,100);
 update public.remittance_orders set status='paid',paid_at=now(),paid_by=actor,shipment_id=converted_id where id=oid;
 insert into public.shipments(id,store_id,location,package_number,contains_money,money_amount) overriding system value
 values(manual_id,sid,'Rollback test',-992002,true,200);
 update public.shipments set notes='Edit must not duplicate' where id=manual_id;
 insert into public.shipments(id,store_id,location,package_number,contains_money,money_amount) overriding system value
 values(other_id,other_sid,'Rollback test',-992003,true,300);
 set constraints shipment_remittance_whatsapp_queue immediate;
 perform set_config('request.jwt.claims','{"role":"anon"}',true);
 insert into public.shipments(id,store_id,location,package_number,contains_money,money_amount) overriding system value values(blocked_id,sid,'Rollback test',-992004,true,100);
 if exists(select 1 from public.alvarez_remittance_notifications where source_id=blocked_id) then raise exception 'Untrusted writer queued notification'; end if;
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 insert into public.shipments(id,store_id,location,package_number,contains_money) overriding system value values(transitioned_id,sid,'Rollback test',-992005,false);
 update public.shipments set contains_money=true,money_amount=100 where id=transitioned_id;
 if not exists(select 1 from public.alvarez_remittance_notifications where source_id=transitioned_id) then raise exception 'Money transition not captured'; end if;
 select count(*) into n from public.alvarez_remittance_notifications where source_id in (oid::text,manual_id,converted_id,other_id);
 if n<>2 then raise exception 'Expected web + manual only; got %',n; end if;
 if exists(select 1 from public.alvarez_remittance_notifications where source_id in (converted_id,other_id)) then raise exception 'Conversion or other store leaked'; end if;
 update public.alvarez_remittance_notifications set created_at='1970-01-01' where source_id=oid::text;
 if not exists(select 1 from public.claim_alvarez_remittance_notifications() where source_id=oid::text and state='sending' and claim_token is not null) then raise exception 'Claim failed'; end if;
 if exists(select 1 from public.claim_alvarez_remittance_notifications() where source_id=oid::text) then raise exception 'Claim duplicated'; end if;
 if has_table_privilege('anon','public.alvarez_remittance_notifications','SELECT') or has_table_privilege('authenticated','public.alvarez_remittance_notifications','UPDATE') then raise exception 'Public access to internal queue'; end if;
 if has_function_privilege('authenticated','public.claim_alvarez_remittance_notifications()','EXECUTE') then raise exception 'Public claim privilege'; end if;
end $$;
rollback;
