-- Match the existing ACE-XXXXXXXX tracking search. No existing records are changed.
create or replace function public.confirm_remittance_checkout(p_store_id uuid,p_order_id uuid,p_actor uuid,p_payment_reference text)
returns public.remittance_orders language plpgsql security invoker set search_path=public,pg_temp as $$
declare o public.remittance_orders; shipment text; tracking text;
begin
 select * into o from public.remittance_orders where id=p_order_id and store_id=p_store_id for update;
 if not found then raise exception 'Pedido no encontrado.';end if;
 if o.status='paid' then return o;end if;
 if o.status<>'pending' then raise exception 'El pedido ya no está pendiente.';end if;
 if p_actor is null or length(trim(coalesce(p_payment_reference,''))) not between 3 and 120 then raise exception 'Indica la referencia del pago recibido.';end if;
 shipment:=gen_random_uuid()::text;
 loop
  tracking:='ACE-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  perform pg_advisory_xact_lock(hashtextextended('remittance-tracking:'||tracking,0));
  exit when not exists(select 1 from public.shipments where tracking_code=tracking);
 end loop;
 insert into public.shipments(id,store_id,location,recipient_name,recipient_address,recipient_phone,sender_name,sender_phone,notes,contains_package,contains_money,money_amount,money_commission_rate,money_commission,money_total,service_price,amount_paid,balance_due,payment_status,payment_method,status,trip_id,tracking_code,created_date,created_by,updated_by)
 values(shipment,o.store_id, o.payload->>'recipient_province',o.payload->>'recipient_name',concat_ws(', ',o.payload->>'recipient_address',o.payload->>'recipient_municipality',o.payload->>'recipient_province'),o.payload->>'recipient_phone',o.payload->>'sender_name',o.payload->>'sender_phone',concat_ws(E'\n',nullif(o.payload->>'notes',''),'Compra de remesa: '||o.id),false,true,o.amount,o.commission_rate,o.commission,o.total,o.total,o.total,0,'paid','manual','preparing',null,tracking,now()::text,p_actor,p_actor);
 insert into public.shipment_items(store_id,shipment_id,item_type,description,quantity,unit,unit_price,subtotal,total,metadata)
 values(o.store_id,shipment,'MONEY','Remesa y comisión',1,'USD',o.total,o.total,o.total,jsonb_build_object('remittance_order_id',o.id,'amount',o.amount,'commission',o.commission));
 update public.remittance_orders set status='paid',shipment_id=shipment,paid_by=p_actor,paid_at=now(),payment_reference=trim(p_payment_reference) where id=o.id returning * into o;
 return o;
end $$;
