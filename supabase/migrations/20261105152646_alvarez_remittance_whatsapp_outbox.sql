-- New events only. No historical backfill and no HTTP inside business transactions.
create table public.alvarez_remittance_notifications (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id),
 source_kind text not null check(source_kind in ('order','shipment')),
 source_id text not null,
 state text not null default 'pending' check(state in ('pending','sending','accepted','failed','uncertain','cancelled')),
 attempts integer not null default 0,
 claim_token uuid,
 claimed_at timestamptz,
 provider_message_id text,
 last_error text,
 created_at timestamptz not null default now(),
 sent_at timestamptz,
 unique(source_kind,source_id)
);
create index alvarez_notifications_pending_idx on public.alvarez_remittance_notifications(created_at) where state='pending';
alter table public.alvarez_remittance_notifications enable row level security;
revoke all on public.alvarez_remittance_notifications from public,anon,authenticated;
grant all on public.alvarez_remittance_notifications to service_role;
create schema if not exists private;
create function private.queue_alvarez_remittance_notification()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.stores where id=new.store_id and subdomain='alvarez-travel' and is_active and module_shipping_enabled) then return new; end if;
 -- Manual writes must belong to an active store member; checkout uses service_role.
 if coalesce(auth.role(),'')<>'service_role' and not exists(
  select 1 from public.profiles p where p.id=auth.uid() and p.active
  and (p.role='super_admin' or exists(select 1 from public.store_users u where u.user_id=p.id and u.store_id=new.store_id and u.active))
 ) then return new; end if;
 if tg_table_name='shipments' then
  if not coalesce(new.contains_money,false) or new.deleted_at is not null then return new; end if;
  if tg_op='UPDATE' and coalesce(old.contains_money,false) then return new; end if;
  -- Deferred until commit: checkout confirmation links its shipment in this transaction.
  if exists(select 1 from public.remittance_orders where store_id=new.store_id and shipment_id=new.id) then return new; end if;
 end if;
 insert into public.alvarez_remittance_notifications(store_id,source_kind,source_id)
 values(new.store_id,case when tg_table_name='shipments' then 'shipment' else 'order' end,new.id::text)
 on conflict(source_kind,source_id) do nothing;
 return new;
end $$;
revoke all on function private.queue_alvarez_remittance_notification() from public,anon,authenticated;
create trigger remittance_whatsapp_queue after insert on public.remittance_orders
for each row execute function private.queue_alvarez_remittance_notification();
create constraint trigger shipment_remittance_whatsapp_queue after insert or update on public.shipments
deferrable initially deferred for each row execute function private.queue_alvarez_remittance_notification();
create function public.claim_alvarez_remittance_notifications()
returns setof public.alvarez_remittance_notifications language plpgsql security invoker set search_path='' as $$
begin
 -- A timed-out POST might already have arrived. Never automatically send it twice.
 update public.alvarez_remittance_notifications set state='uncertain',last_error='worker_interrupted'
 where state='sending' and claimed_at<now()-interval '5 minutes';
 return query with jobs as (
  select id from public.alvarez_remittance_notifications where state='pending' and created_at<now()-interval '15 seconds'
  order by created_at for update skip locked limit 3
 ) update public.alvarez_remittance_notifications n set state='sending',claim_token=gen_random_uuid(),claimed_at=now(),attempts=attempts+1
 from jobs where n.id=jobs.id returning n.*;
end $$;
revoke all on function public.claim_alvarez_remittance_notifications() from public,anon,authenticated;
grant execute on function public.claim_alvarez_remittance_notifications() to service_role;
