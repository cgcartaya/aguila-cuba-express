CREATE OR REPLACE FUNCTION private.queue_alvarez_remittance_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if not exists(select 1 from public.stores where id=new.store_id and subdomain='alvarez-travel' and is_active and module_shipping_enabled) then return new; end if;
 -- Manual writes must belong to an active store member; checkout uses service_role.
 if coalesce(auth.jwt()->>'role','')<>'service_role' and not exists(
  select 1 from public.profiles p where p.id=auth.uid() and p.active
  and (p.role='super_admin' or exists(select 1 from public.store_users u where u.user_id=p.id and u.store_id=new.store_id and u.active))
 ) then return new; end if;
 if tg_table_name='remittance_orders' then
  if new.status <> 'paid' or new.shipment_id is null or old.status = 'paid' then return new; end if;
 end if;
 if tg_table_name='shipments' then
  if (not coalesce(new.contains_money,false) and jsonb_array_length(new.store_products)=0) or new.deleted_at is not null then return new; end if;
  if tg_op='UPDATE' and (coalesce(old.contains_money,false) or jsonb_array_length(old.store_products)>0) then return new; end if;
  -- Deferred until commit: checkout confirmation links its shipment in this transaction.
  if exists(select 1 from public.remittance_orders where store_id=new.store_id and shipment_id=new.id) then return new; end if;
 end if;
 insert into public.alvarez_remittance_notifications(store_id,source_kind,source_id)
 values(new.store_id,case when tg_table_name='shipments' then 'shipment' else 'order' end,new.id::text)
 on conflict(source_kind,source_id) do nothing;
 return new;
end $function$
;

drop trigger remittance_whatsapp_queue on public.remittance_orders;
create trigger remittance_whatsapp_queue after update of status on public.remittance_orders
for each row execute function private.queue_alvarez_remittance_notification();

CREATE OR REPLACE FUNCTION public.claim_alvarez_remittance_notifications()
 RETURNS SETOF alvarez_remittance_notifications
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 -- A timed-out POST might already have arrived. Never automatically send it twice.
 update public.alvarez_remittance_notifications set state='uncertain',last_error='worker_interrupted'
 where state='sending' and claimed_at<now()-interval '5 minutes';
 return query with jobs as (
  select n.id from public.alvarez_remittance_notifications n
  where n.state='pending' and n.created_at<now()-interval '15 seconds'
    and (n.source_kind='shipment' or exists (
      select 1 from public.remittance_orders o where o.id::text=n.source_id and o.store_id=n.store_id
        and o.status='paid' and o.shipment_id is not null
    ))
  order by created_at for update skip locked limit 3
 ) update public.alvarez_remittance_notifications n set state='sending',claim_token=gen_random_uuid(),claimed_at=now(),attempts=attempts+1
 from jobs where n.id=jobs.id returning n.*;
end $function$
;
