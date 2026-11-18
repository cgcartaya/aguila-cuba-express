begin;

alter table public.saas_subscription_invoices
  add column billing_month date check (extract(day from billing_month)=1),
  add column subscription_amount numeric(12,2) check (subscription_amount>=0),
  add column order_commission numeric(12,2) check (order_commission>=0),
  add column shipping_commission numeric(12,2) check (shipping_commission>=0),
  add column quote_revision text,
  add constraint saas_invoice_breakdown check (
    billing_month is null or (
      subscription_amount is not null and order_commission is not null and
      shipping_commission is not null and quote_revision is not null and
      subtotal=subscription_amount+order_commission+shipping_commission
    )
  );

create unique index saas_subscription_once_per_month
  on public.saas_subscription_invoices(store_id,billing_month)
  where status in ('pending','paid') and subscription_amount>0;

create table private.saas_billed_commissions (
  kind text not null check (kind in ('order','shipping')),
  source_id text not null,
  invoice_id uuid not null references public.saas_subscription_invoices(id),
  primary key(kind,source_id)
);
create index on private.saas_billed_commissions(invoice_id);
alter table private.saas_billed_commissions enable row level security;
revoke all on private.saas_billed_commissions from public,anon,authenticated;

-- Legacy settlements recorded payment through a cutoff. Close that write path
-- so a second collection route cannot overlap invoices, including older clients.
create function private.reject_legacy_commission_settlement() returns trigger
language plpgsql set search_path='' as $$
begin
  raise exception 'Registra los pagos de comisión desde Facturación SaaS';
end $$;
create trigger saas_close_legacy_commission_settlements
before insert or update or delete on public.platform_fee_settlements
for each row execute function private.reject_legacy_commission_settlement();

create function private.saas_billing_quote(p_store uuid,p_month date) returns jsonb
language plpgsql stable set search_path='' as $$
declare
  cutoff timestamptz;
  start_at timestamptz;
  end_at timestamptz;
  subscription numeric;
  orders numeric;
  shipping numeric;
  order_rows jsonb;
  shipping_rows jsonb;
  snapshot jsonb;
  month_names text[] := array['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
begin
  if p_month is null or extract(day from p_month)<>1
     or p_month>(date_trunc('month',now() at time zone 'America/New_York'))::date then
    raise exception 'Selecciona un mes de facturación válido';
  end if;
  select case when created_at >= ((p_month+interval '1 month') at time zone 'America/New_York')
      then 0 else round(greatest(coalesce(monthly_price,0),0),2) end
    into strict subscription from public.stores where id=p_store;
  if exists (
    select 1 from public.saas_subscription_invoices i
    where i.store_id=p_store and i.status in ('pending','paid') and (
      (i.billing_month=p_month and i.subscription_amount>0) or
      (i.billing_month is null and i.subtotal>0 and lower(trim(i.period)) in (
        to_char(p_month,'YYYY-MM'),
        month_names[extract(month from p_month)::int]||' de '||extract(year from p_month)::int
      ))
    )
  ) then subscription=0; end if;

  start_at=p_month::timestamp at time zone 'America/New_York';
  end_at=((p_month+interval '1 month') at time zone 'America/New_York');
  select max(period_end) into cutoff from public.platform_fee_settlements where store_id=p_store;

  select coalesce(sum(round(o.platform_fee_amount,2)),0),
         coalesce(jsonb_agg(jsonb_build_array(o.id,round(o.platform_fee_amount,2)) order by o.id),'[]')
    into orders,order_rows from public.orders o
    where o.store_id=p_store and o.source_shipment_id is null and round(o.platform_fee_amount,2)>0
      and coalesce(o.lym_confirmed_at,o.created_at)>=start_at
      and coalesce(o.lym_confirmed_at,o.created_at)<end_at
      and (cutoff is null or o.created_at>cutoff)
      and not exists(select 1 from private.saas_billed_commissions b where b.kind='order' and b.source_id=o.id::text);

  select coalesce(sum(c.amount),0),
         coalesce(jsonb_agg(jsonb_build_array(c.shipment_id,c.amount) order by c.shipment_id),'[]')
    into shipping,shipping_rows from public.shipping_platform_charges c
    where c.store_id=p_store and c.created_at>=start_at and c.created_at<end_at
      and not exists(select 1 from private.saas_billed_commissions b where b.kind='shipping' and b.source_id=c.shipment_id);

  snapshot=jsonb_build_object('subscription',subscription,'orders',orders,'shipping',shipping,
    'subtotal',subscription+orders+shipping,'order_rows',order_rows,'shipping_rows',shipping_rows);
  return snapshot||jsonb_build_object('revision',md5(snapshot::text));
end $$;
revoke all on function private.saas_billing_quote(uuid,date) from public,anon,authenticated;

create function public.saas_billing_preview(p_actor uuid,p_store uuid,p_month date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not exists(select 1 from public.profiles where id=p_actor and active and role='super_admin') then
    raise exception 'Acceso SaaS requerido';
  end if;
  return private.saas_billing_quote(p_store,p_month)-array['order_rows','shipping_rows'];
end $$;
revoke all on function public.saas_billing_preview(uuid,uuid,date) from public,anon,authenticated;
grant execute on function public.saas_billing_preview(uuid,uuid,date) to service_role;

create or replace function public.saas_billing_command(p_actor uuid, p_action text, p_data jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare inv public.saas_subscription_invoices; s public.stores; lifecycle public.saas_store_lifecycle;
 sid uuid; iid uuid; n bigint; y integer; amount numeric; quote jsonb; billing_period date;
begin
 if not exists(select 1 from public.profiles where id=p_actor and active and role='super_admin') then
  raise exception 'Acceso SaaS requerido';
 end if;
 if p_action='settings' then
  update saas_billing_settings set issuer=p_data->'issuer',updated_at=now() where id;
  return '{}'::jsonb;
 end if;
 if p_action in ('suspend','reactivate','archive','restore') then
  sid=(p_data->>'store_id')::uuid;
  select * into strict s from stores where id=sid for update;
  select * into lifecycle from saas_store_lifecycle where store_id=sid;
  if p_action='archive' and p_data->>'confirmation' is distinct from s.name then raise exception 'Escribe el nombre exacto'; end if;
  if p_action in ('suspend','archive') then
   if lifecycle.state='archived' then raise exception 'La tienda ya está archivada'; end if;
   insert into saas_store_lifecycle(store_id,state,previous_active)
    values(sid,case when p_action='archive' then 'archived' else 'suspended' end,s.is_active)
    on conflict(store_id) do update set state=excluded.state,
     previous_active=case when p_action='archive' then excluded.previous_active else saas_store_lifecycle.previous_active end,updated_at=now();
   update stores set is_active=false where id=sid;
  else
   if p_action='reactivate' and lifecycle.state='archived' then raise exception 'Restaura la tienda archivada primero'; end if;
   if p_action='restore' and lifecycle.state is distinct from 'archived' then raise exception 'La tienda no está archivada'; end if;
   delete from saas_store_lifecycle where store_id=sid;
   update stores set is_active=case when p_action='restore' then coalesce(lifecycle.previous_active,false) else true end where id=sid;
  end if;
  insert into saas_billing_events(store_id,actor_id,kind) values(sid,p_actor,p_action);
  return jsonb_build_object('store_id',sid);
 end if;
 if p_action='create' then
  sid=(p_data->>'store_id')::uuid;
  select * into strict s from stores where id=sid for update;
  select * into inv from saas_subscription_invoices where request_id=(p_data->>'request_id')::uuid;
  if found then
   if inv.store_id<>sid then raise exception 'Solicitud duplicada de otra tienda'; end if;
   return to_jsonb(inv);
  end if;
  if exists(select 1 from saas_store_lifecycle where store_id=sid and state='archived') then raise exception 'Tienda archivada'; end if;
  billing_period=(p_data->>'billing_month')::date;
  quote=private.saas_billing_quote(sid,billing_period);
  if quote->>'revision' is distinct from p_data->>'quote_revision' then
   raise exception 'Los importes cambiaron. Actualiza la cotización y vuelve a revisar la factura';
  end if;
  if (quote->>'subtotal')::numeric <= 0 then raise exception 'No hay conceptos pendientes en este período'; end if;
  if (quote->>'subtotal')::numeric-(p_data->>'discount')::numeric+(p_data->>'adjustment')::numeric+(p_data->>'tax')::numeric < 0 then
   raise exception 'El total de la factura no puede ser negativo';
  end if;
  insert into saas_subscription_invoices(store_id,request_id,issued_on,due_on,period,client_name,store_name,phone,email,issuer,description,subtotal,discount,adjustment,tax,created_by,billing_month,subscription_amount,order_commission,shipping_commission,quote_revision)
   values(sid,(p_data->>'request_id')::uuid,(p_data->>'issued_on')::date,(p_data->>'due_on')::date,to_char(billing_period,'YYYY-MM'),
    p_data->>'client_name',s.name,p_data->>'phone',p_data->>'email',(select issuer from saas_billing_settings where id),
    p_data->>'description',(quote->>'subtotal')::numeric,(p_data->>'discount')::numeric,(p_data->>'adjustment')::numeric,(p_data->>'tax')::numeric,p_actor,
    billing_period,(quote->>'subscription')::numeric,(quote->>'orders')::numeric,(quote->>'shipping')::numeric,quote->>'revision')
   returning * into inv;
  insert into saas_billing_events(store_id,invoice_id,actor_id,kind) values(sid,inv.id,p_actor,'draft_created');
  if coalesce((p_data->>'draft')::boolean,false) then return to_jsonb(inv); end if;
  iid=inv.id;
 else
  iid=(p_data->>'invoice_id')::uuid;
  perform 1 from stores where id=(select store_id from saas_subscription_invoices where id=iid) for update;
 end if;
 select * into strict inv from saas_subscription_invoices where id=iid for update;
 if p_action in ('create','issue') then
  if inv.status<>'draft' then return to_jsonb(inv); end if;
  if inv.billing_month is null then
   raise exception 'Crea una nueva factura con un período de facturación verificable';
  end if;
  if exists(select 1 from saas_store_lifecycle where store_id=inv.store_id and state='archived') then
   raise exception 'Tienda archivada';
  end if;
  quote=private.saas_billing_quote(inv.store_id,inv.billing_month);
  if quote->>'revision' is distinct from inv.quote_revision then
   raise exception 'El borrador está desactualizado. Crea una factura nueva para revisar los conceptos pendientes';
  end if;
  insert into private.saas_billed_commissions(kind,source_id,invoice_id)
   select 'order',entry->>0,iid from jsonb_array_elements(quote->'order_rows') entry
   union all
   select 'shipping',entry->>0,iid from jsonb_array_elements(quote->'shipping_rows') entry;
  y=extract(year from inv.issued_on);
  insert into saas_invoice_counters(year,value) values(y,1)
   on conflict(year) do update set value=saas_invoice_counters.value+1 returning value into n;
  update saas_subscription_invoices set number='PERLA-'||y||'-'||lpad(n::text,greatest(4,length(n::text)),'0'),
    status=case when total=0 then 'paid' else 'pending' end where id=iid returning * into inv;
  insert into saas_billing_events(store_id,invoice_id,actor_id,kind) values(inv.store_id,iid,p_actor,'issued');
 elsif p_action='pay' then
  if exists(select 1 from saas_subscription_payments where request_id=(p_data->>'request_id')::uuid and invoice_id=iid) then return to_jsonb(inv); end if;
  if inv.status<>'pending' then raise exception 'Solo se admiten pagos de facturas pendientes'; end if;
  amount=(p_data->>'amount')::numeric;
  if amount<=0 or amount>inv.total-inv.paid then raise exception 'Importe superior al saldo o no válido'; end if;
  insert into saas_subscription_payments(invoice_id,request_id,paid_on,amount,method,reference,notes,created_by)
   values(iid,(p_data->>'request_id')::uuid,(p_data->>'paid_on')::date,amount,p_data->>'method',p_data->>'reference',p_data->>'notes',p_actor);
  update saas_subscription_invoices set paid=paid+amount,status=case when paid+amount=total then 'paid' else 'pending' end where id=iid returning * into inv;
  -- Subscription activation and next renewal are deliberately governed by the existing store editor.
  if inv.status='paid' and coalesce(inv.subscription_amount,inv.subtotal)>0 then
   update stores set last_payment_date=greatest(last_payment_date,(p_data->>'paid_on')::date) where id=inv.store_id;
   if not exists(select 1 from saas_subscription_invoices where store_id=inv.store_id and status='pending' and coalesce(subscription_amount,subtotal)>0 and id<>iid) then
    update stores set payment_status='paid' where id=inv.store_id;
   end if;
  end if;
  insert into saas_billing_events(store_id,invoice_id,actor_id,kind,detail) values(inv.store_id,iid,p_actor,'payment_registered',jsonb_build_object('amount',amount,'request_id',p_data->>'request_id'));
 elsif p_action='void' then
  if inv.paid>0 then raise exception 'No se puede anular una factura con pagos; requiere conciliación'; end if;
  if inv.status='draft' then raise exception 'Emite el borrador antes de anularlo'; end if;
  if inv.status='void' then return to_jsonb(inv); end if;
  update saas_subscription_invoices set status='void' where id=iid returning * into inv;
  delete from private.saas_billed_commissions where invoice_id=iid;
  update saas_invoice_links set revoked_at=now() where invoice_id=iid and revoked_at is null;
  insert into saas_billing_events(store_id,invoice_id,actor_id,kind,detail) values(inv.store_id,iid,p_actor,'voided',jsonb_build_object('reason',p_data->>'reason'));
 elsif p_action='share' then
  if inv.status in ('draft','void') then raise exception 'Factura no disponible para compartir'; end if;
  insert into saas_invoice_links(token_hash,invoice_id,expires_at) values(p_data->>'token_hash',iid,now()+interval '30 days');
  insert into saas_billing_events(store_id,invoice_id,actor_id,kind) values(inv.store_id,iid,p_actor,'whatsapp_prepared');
 elsif p_action='revoke' then
  update saas_invoice_links set revoked_at=now() where invoice_id=iid and revoked_at is null;
  insert into saas_billing_events(store_id,invoice_id,actor_id,kind) values(inv.store_id,iid,p_actor,'links_revoked');
 elsif p_action='opened' then
  insert into saas_billing_events(store_id,invoice_id,actor_id,kind) values(inv.store_id,iid,p_actor,'whatsapp_open_requested');
 else raise exception 'Acción desconocida';
 end if;
 return to_jsonb(inv);
end $$;
commit;
