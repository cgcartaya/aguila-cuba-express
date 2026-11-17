begin;
-- Private SaaS accounting. No changes to tenant RLS, order or shipping tables.
create table public.saas_billing_settings (
 id boolean primary key default true check(id),
 issuer jsonb not null default '{"name":"Perla Marketplace"}',
 updated_at timestamptz not null default now()
);
insert into public.saas_billing_settings(id) values(true);
create table public.saas_store_lifecycle (
 store_id uuid primary key references public.stores(id) on delete restrict,
 state text not null check(state in ('suspended','archived')),
 previous_active boolean not null,
 updated_at timestamptz not null default now()
);
create table public.saas_invoice_counters(year integer primary key, value bigint not null check(value>0));
create table public.saas_subscription_invoices (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id) on delete restrict,
 request_id uuid not null unique,
 number text unique,
 status text not null default 'draft' check(status in ('draft','pending','paid','void')),
 issued_on date not null,
 due_on date not null,
 period text not null check(length(period) between 1 and 100),
 client_name text not null,
 store_name text not null,
 phone text not null default '',
 email text not null default '',
 issuer jsonb not null,
 description text not null check(length(description) between 1 and 500),
 subtotal numeric(12,2) not null check(subtotal>=0),
 discount numeric(12,2) not null default 0 check(discount>=0),
 adjustment numeric(12,2) not null default 0,
 tax numeric(12,2) not null default 0 check(tax>=0),
 total numeric(12,2) generated always as (subtotal-discount+adjustment+tax) stored,
 paid numeric(12,2) not null default 0 check(paid>=0),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 check(due_on>=issued_on), check(subtotal-discount+adjustment+tax>=0),
 check(paid<=subtotal-discount+adjustment+tax),
 check((status='draft' and number is null) or (status<>'draft' and number is not null))
);
create index on public.saas_subscription_invoices(store_id,issued_on desc);
create index on public.saas_subscription_invoices(status,due_on);
create table public.saas_subscription_payments (
 id uuid primary key default gen_random_uuid(),
 invoice_id uuid not null references public.saas_subscription_invoices(id) on delete restrict,
 request_id uuid not null unique,
 paid_on date not null,
 amount numeric(12,2) not null check(amount>0),
 method text not null check(method in ('Zelle','Transferencia','Efectivo','Otro')),
 reference text not null default '', notes text not null default '',
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create index on public.saas_subscription_payments(invoice_id);
create unique index saas_payment_reference_unique on public.saas_subscription_payments(invoice_id,method,reference) where reference<>'';
create table public.saas_billing_events (
 id bigint generated always as identity primary key,
 store_id uuid not null references public.stores(id) on delete restrict,
 invoice_id uuid references public.saas_subscription_invoices(id) on delete restrict,
 actor_id uuid not null references auth.users(id),
 kind text not null, detail jsonb not null default '{}', created_at timestamptz not null default now()
);
create index on public.saas_billing_events(store_id,created_at desc);
create table public.saas_invoice_links (
 token_hash text primary key,
 invoice_id uuid not null references public.saas_subscription_invoices(id) on delete restrict,
 expires_at timestamptz not null, revoked_at timestamptz,
 created_at timestamptz not null default now()
);
create index on public.saas_invoice_links(invoice_id);
-- No direct browser access, including store administrators. All reads/writes use authenticated server routes.
do $$ declare t text; begin
 foreach t in array array['saas_billing_settings','saas_store_lifecycle','saas_invoice_counters','saas_subscription_invoices','saas_subscription_payments','saas_billing_events','saas_invoice_links'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
grant usage, select on sequence public.saas_billing_events_id_seq to service_role;

create function public.saas_billing_command(p_actor uuid, p_action text, p_data jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare inv public.saas_subscription_invoices; s public.stores; lifecycle public.saas_store_lifecycle;
 sid uuid; iid uuid; n bigint; y integer; amount numeric;
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
  insert into saas_subscription_invoices(store_id,request_id,issued_on,due_on,period,client_name,store_name,phone,email,issuer,description,subtotal,discount,adjustment,tax,created_by)
   values(sid,(p_data->>'request_id')::uuid,(p_data->>'issued_on')::date,(p_data->>'due_on')::date,p_data->>'period',
    p_data->>'client_name',s.name,p_data->>'phone',p_data->>'email',(select issuer from saas_billing_settings where id),
    p_data->>'description',(p_data->>'subtotal')::numeric,(p_data->>'discount')::numeric,(p_data->>'adjustment')::numeric,(p_data->>'tax')::numeric,p_actor)
   returning * into inv;
  insert into saas_billing_events(store_id,invoice_id,actor_id,kind) values(sid,inv.id,p_actor,'draft_created');
  if coalesce((p_data->>'draft')::boolean,false) then return to_jsonb(inv); end if;
  iid=inv.id;
 else
  iid=(p_data->>'invoice_id')::uuid;
 end if;
 select * into strict inv from saas_subscription_invoices where id=iid for update;
 if p_action in ('create','issue') then
  if inv.status<>'draft' then return to_jsonb(inv); end if;
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
  if inv.status='paid' then
   update stores set last_payment_date=greatest(last_payment_date,(p_data->>'paid_on')::date) where id=inv.store_id;
   if not exists(select 1 from saas_subscription_invoices where store_id=inv.store_id and status='pending' and id<>iid) then
    update stores set payment_status='paid' where id=inv.store_id;
   end if;
  end if;
  insert into saas_billing_events(store_id,invoice_id,actor_id,kind,detail) values(inv.store_id,iid,p_actor,'payment_registered',jsonb_build_object('amount',amount,'request_id',p_data->>'request_id'));
 elsif p_action='void' then
  if inv.paid>0 then raise exception 'No se puede anular una factura con pagos; requiere conciliación'; end if;
  if inv.status='draft' then raise exception 'Emite el borrador antes de anularlo'; end if;
  if inv.status='void' then return to_jsonb(inv); end if;
  update saas_subscription_invoices set status='void' where id=iid returning * into inv;
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
revoke all on function public.saas_billing_command(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.saas_billing_command(uuid,text,jsonb) to service_role;
-- An archived/suspended store cannot be accidentally enabled by the existing editor.
create function public.saas_lifecycle_active_guard() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.is_active and exists(select 1 from saas_store_lifecycle where store_id=new.id) then
  raise exception 'Restaura o reactiva la tienda desde Gestión de tiendas antes de habilitarla';
 end if;
 return new;
end $$;
create trigger saas_lifecycle_active_guard before update of is_active on public.stores
 for each row execute function public.saas_lifecycle_active_guard();
revoke all on function public.saas_lifecycle_active_guard() from public,anon,authenticated;
-- Issued financial/client snapshots are immutable; settlement status and paid balance may evolve.
create function public.saas_invoice_snapshot_guard() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if tg_op='DELETE' then raise exception 'La contabilidad SaaS se conserva; anula la factura'; end if;
 if old.status<>'draft' and (to_jsonb(new)-array['status','paid','total']) is distinct from (to_jsonb(old)-array['status','paid','total']) then
  raise exception 'Una factura emitida no puede modificarse';
 end if;
 return new;
end $$;
create trigger saas_invoice_snapshot_guard before update or delete on public.saas_subscription_invoices
 for each row execute function public.saas_invoice_snapshot_guard();
revoke all on function public.saas_invoice_snapshot_guard() from public,anon,authenticated;
commit;
