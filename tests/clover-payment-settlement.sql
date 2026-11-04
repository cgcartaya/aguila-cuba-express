begin;
do $$
declare sid uuid; oid uuid; r text; n int;
begin
 select id into sid from public.stores where subdomain='alvarez-travel';
 insert into public.orders(store_id,total,address) values(sid,100,'Clover rollback-only test') returning id into oid;
 insert into public.clover_payment_sessions(store_id,target_type,target_id,merchant_id,session_id,base_cents,total_cents,status)
 values(sid,'order',oid::text,'test-only','rollback-clover-order',10000,10350,'pending');
 r:=public.settle_clover_payment(sid,'rollback-clover-order','test-only','test-payment');
 if r<>'paid' then raise exception 'Expected paid'; end if;
 r:=public.settle_clover_payment(sid,'rollback-clover-order','test-only','test-payment');
 if r<>'paid' or not exists(select 1 from public.orders where id=oid and total=103.50 and payment_status='paid') then raise exception 'Retry changed total'; end if;
 begin
 perform public.settle_clover_payment(sid,'rollback-clover-order','wrong-merchant','test-payment');
 raise exception 'Merchant mismatch accepted';
 exception when raise_exception then if sqlerrm<>'Unknown checkout' then raise; end if; end;
 insert into public.shipments(id,location,package_number,store_id,service_price,amount_paid,balance_due) overriding system value values('rollback-clover-shipment','test',-991991,sid,100,25,75);
 insert into public.clover_payment_sessions(store_id,target_type,target_id,merchant_id,session_id,base_cents,total_cents,status)
 values(sid,'shipment','rollback-clover-shipment','test-only','rollback-clover-shipment-session',7500,7763,'pending');
 r:=public.settle_clover_payment(sid,'rollback-clover-shipment-session','test-only','test-shipment-payment');
 if r<>'paid' then raise exception 'Expected shipment paid'; end if;
 perform public.settle_clover_payment(sid,'rollback-clover-shipment-session','test-only','test-shipment-payment');
 select count(*) into n from public.payment_receipts where clover_checkout_session_id='rollback-clover-shipment-session';
 if n<>1 or not exists(select 1 from public.shipments where id='rollback-clover-shipment' and amount_paid=100 and balance_due=0) then raise exception 'Receipt or balance incorrect'; end if;
 -- A delayed payment after a balance change is retained for manual review.
 insert into public.clover_payment_sessions(store_id,target_type,target_id,merchant_id,session_id,base_cents,total_cents,status)
 values(sid,'shipment','rollback-clover-shipment','test-only','rollback-clover-review',7500,7763,'pending');
 r:=public.settle_clover_payment(sid,'rollback-clover-review','test-only','test-review-payment');
 if r<>'review' then raise exception 'Duplicate target should require review'; end if;
end $$;
rollback;
