alter table public.shipments add column recipient_phone_alt text;

-- Store the alternate number before the queued WhatsApp notification can run.
create or replace function public.create_remittance_numbered_shipment(p_store_id uuid,p_id text,p_tracking_code text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if not public.has_store_access(p_store_id) then raise exception 'No tienes acceso a esta empresa.'; end if;
 result:=public.create_numbered_shipment(p_store_id,p_id,p_tracking_code,p_payload);
 update public.shipments set
 recipient_phone_alt=nullif(btrim(p_payload->>'recipient_phone_alt'),''),
 products_only=coalesce((p_payload->>'products_only')::boolean,false),
 money_delivery_currency=coalesce(p_payload->>'money_delivery_currency','USD'),
 money_usd_to_cup=coalesce((p_payload->>'money_usd_to_cup')::numeric,0),
 money_exchange_rate=nullif(p_payload->>'money_exchange_rate','')::numeric,
 store_products=coalesce(p_payload->'store_products','[]'::jsonb),
 physical_products=coalesce(p_payload->'physical_products','[]'::jsonb),
 amount_paid=case when coalesce(p_payload->'physical_products','[]'::jsonb) <> '[]'
   then coalesce((p_payload->>'amount_paid')::numeric,0) else amount_paid end
 where id=p_id and store_id=p_store_id returning to_jsonb(shipments.*) into result;
 if result is null then raise exception 'No se pudo guardar la remesa.'; end if;
 return result;
end $$;
revoke all on function public.create_remittance_numbered_shipment(uuid,text,text,jsonb) from public,anon;
grant execute on function public.create_remittance_numbered_shipment(uuid,text,text,jsonb) to authenticated,service_role;
