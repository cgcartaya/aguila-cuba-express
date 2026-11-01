-- Additive checkout. Pending purchases never enter the delivery queue.
create table public.remittance_orders (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id),
 idempotency_key uuid not null,
 payload jsonb not null,
 amount numeric(12,2) not null check(amount>0 and amount<=100000),
 commission numeric(12,2) not null check(commission>=0),
 commission_rate numeric not null,
 total numeric(12,2) not null check(total=amount+commission),
 rates_snapshot jsonb not null,
 currency text not null default 'USD' check(currency='USD'),
 status text not null default 'pending' check(status in ('pending','paid','cancelled')),
 shipment_id text unique references public.shipments(id),
 payment_reference text,
 paid_by uuid references public.profiles(id),
 paid_at timestamptz,
 created_at timestamptz not null default now(),
 unique(store_id,idempotency_key),
 check((status='paid' and shipment_id is not null and paid_at is not null) or (status<>'paid' and shipment_id is null and paid_at is null))
);
create index remittance_orders_store_created_idx on public.remittance_orders(store_id,created_at desc);
alter table public.remittance_orders enable row level security;
revoke all on public.remittance_orders from public,anon,authenticated;
grant all on public.remittance_orders to service_role;

create function public.quote_remittance_checkout(p_store_id uuid,p_amount numeric)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare s public.shipping_settings; fee numeric; rate numeric; snapshot jsonb;
begin
 if p_amount is null or p_amount<=0 or p_amount>100000 or round(p_amount,2)<>p_amount then raise exception 'Importe inválido.'; end if;
 if not exists(select 1 from public.stores where id=p_store_id and subdomain='alvarez-travel' and is_active and module_shipping_enabled and module_store_enabled) then raise exception 'Agencia no disponible.'; end if;
 select * into s from public.shipping_settings where store_id=p_store_id;
 if not found or s.currency is distinct from 'USD' or s.money_fixed_fee_below is null or s.money_fixed_fee is null or s.money_threshold is null or s.money_rate_below_threshold is null or s.money_rate_at_or_above_threshold is null or least(s.money_fixed_fee_below,s.money_fixed_fee,s.money_threshold,s.money_rate_below_threshold,s.money_rate_at_or_above_threshold)<0 or s.money_fixed_fee_below>s.money_threshold then raise exception 'Tarifas no disponibles.'; end if;
 if p_amount<s.money_fixed_fee_below then rate:=0;fee:=round(s.money_fixed_fee,2);
 else rate:=case when p_amount>=s.money_threshold then s.money_rate_at_or_above_threshold else s.money_rate_below_threshold end;fee:=round(p_amount*rate/100,2);end if;
 snapshot:=jsonb_build_object('money_fixed_fee_below',s.money_fixed_fee_below,'money_fixed_fee',s.money_fixed_fee,'money_threshold',s.money_threshold,'money_rate_below_threshold',s.money_rate_below_threshold,'money_rate_at_or_above_threshold',s.money_rate_at_or_above_threshold);
 return jsonb_build_object('amount',p_amount,'commission',fee,'rate',rate,'total',p_amount+fee,'currency','USD','rates',snapshot);
end $$;

create function public.create_remittance_checkout(p_store_id uuid,p_key uuid,p_payload jsonb,p_expected_total numeric)
returns public.remittance_orders language plpgsql security invoker set search_path=public,pg_temp as $$
declare existing public.remittance_orders; q jsonb; amount numeric;
begin
 if p_key is null or p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'Solicitud inválida.';end if;
 perform pg_advisory_xact_lock(hashtextextended('remittance:'||p_store_id||':'||p_key,0));
 select * into existing from public.remittance_orders where store_id=p_store_id and idempotency_key=p_key;
 if found then
  if existing.payload<>p_payload then raise exception 'La solicitud cambió. Vuelve a intentarlo.';end if;
  return existing;
 end if;
 if length(coalesce(p_payload->>'sender_name','')) not between 2 and 120 or length(coalesce(p_payload->>'recipient_name','')) not between 2 and 120 or length(coalesce(p_payload->>'recipient_address','')) not between 5 and 400 or coalesce(p_payload->>'sender_phone','')!~ '^\+?[0-9]{8,15}$' or coalesce(p_payload->>'recipient_phone','')!~ '^\+?[0-9]{8,15}$' or length(coalesce(p_payload->>'recipient_province','')) not between 2 and 80 or length(coalesce(p_payload->>'recipient_municipality','')) not between 2 and 100 or length(coalesce(p_payload->>'notes',''))>500 then raise exception 'Datos incompletos o inválidos.';end if;
 amount:=(p_payload->>'amount')::numeric;
 q:=public.quote_remittance_checkout(p_store_id,amount);
 if p_expected_total is null or (q->>'total')::numeric<>p_expected_total then raise exception 'Las tarifas cambiaron. Revisa el total y confirma otra vez.';end if;
 perform pg_advisory_xact_lock(hashtextextended('remittance-phone:'||p_store_id||':'||(p_payload->>'sender_phone'),0));
 if (select count(*) from public.remittance_orders where store_id=p_store_id and payload->>'sender_phone'=p_payload->>'sender_phone' and created_at>now()-interval '1 hour')>=5 then raise exception 'Demasiadas solicitudes. Contacta con la agencia.';end if;
 insert into public.remittance_orders(store_id,idempotency_key,payload,amount,commission,commission_rate,total,rates_snapshot)
 values(p_store_id,p_key,p_payload,amount,(q->>'commission')::numeric,(q->>'rate')::numeric,(q->>'total')::numeric,q->'rates') returning * into existing;
 return existing;
end $$;

create function public.confirm_remittance_checkout(p_store_id uuid,p_order_id uuid,p_actor uuid,p_payment_reference text)
returns public.remittance_orders language plpgsql security invoker set search_path=public,pg_temp as $$
declare o public.remittance_orders; shipment text; tracking text;
begin
 select * into o from public.remittance_orders where id=p_order_id and store_id=p_store_id for update;
 if not found then raise exception 'Pedido no encontrado.';end if;
 if o.status='paid' then return o;end if;
 if o.status<>'pending' then raise exception 'El pedido ya no está pendiente.';end if;
 if p_actor is null or length(trim(coalesce(p_payment_reference,''))) not between 3 and 120 then raise exception 'Indica la referencia del pago recibido.';end if;
 shipment:=gen_random_uuid()::text;
 tracking:='ACE-'||upper(replace(gen_random_uuid()::text,'-',''));
 insert into public.shipments(id,store_id,location,recipient_name,recipient_address,recipient_phone,sender_name,sender_phone,notes,contains_package,contains_money,money_amount,money_commission_rate,money_commission,money_total,service_price,amount_paid,balance_due,payment_status,payment_method,status,trip_id,tracking_code,created_date,created_by,updated_by)
 values(shipment,o.store_id, o.payload->>'recipient_province',o.payload->>'recipient_name',concat_ws(', ',o.payload->>'recipient_address',o.payload->>'recipient_municipality',o.payload->>'recipient_province'),o.payload->>'recipient_phone',o.payload->>'sender_name',o.payload->>'sender_phone',concat_ws(E'\n',nullif(o.payload->>'notes',''),'Compra de remesa: '||o.id),false,true,o.amount,o.commission_rate,o.commission,o.total,o.total,o.total,0,'paid','manual','preparing',null,tracking,now()::text,p_actor,p_actor);
 insert into public.shipment_items(store_id,shipment_id,item_type,description,quantity,unit,unit_price,subtotal,total,metadata)
 values(o.store_id,shipment,'MONEY','Remesa y comisión',1,'USD',o.total,o.total,o.total,jsonb_build_object('remittance_order_id',o.id,'amount',o.amount,'commission',o.commission));
 update public.remittance_orders set status='paid',shipment_id=shipment,paid_by=p_actor,paid_at=now(),payment_reference=trim(p_payment_reference) where id=o.id returning * into o;
 return o;
end $$;
revoke all on function public.quote_remittance_checkout(uuid,numeric) from public,anon,authenticated;
revoke all on function public.create_remittance_checkout(uuid,uuid,jsonb,numeric) from public,anon,authenticated;
revoke all on function public.confirm_remittance_checkout(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.quote_remittance_checkout(uuid,numeric) to service_role;
grant execute on function public.create_remittance_checkout(uuid,uuid,jsonb,numeric) to service_role;
grant execute on function public.confirm_remittance_checkout(uuid,uuid,uuid,text) to service_role;
