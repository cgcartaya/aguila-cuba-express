-- Server-only credentials and session ledger. No browser role can read tokens.
create table public.store_clover_settings (
 store_id uuid primary key references public.stores(id),
 enabled boolean not null default false,
 environment text not null default 'production' check(environment in ('production','sandbox')),
 merchant_id text not null,
 private_token text not null,
 webhook_secret text not null,
 updated_at timestamptz not null default now()
);
alter table public.store_clover_settings enable row level security;
revoke all on public.store_clover_settings from public, anon, authenticated;
grant all on public.store_clover_settings to service_role;
create table public.clover_payment_sessions (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id),
 target_type text not null check(target_type in ('order','shipment')),
 target_id text not null,
 merchant_id text not null,
 session_id text unique,
 checkout_url text,
 base_cents bigint not null check(base_cents > 0),
 total_cents bigint not null check(total_cents >= base_cents),
 status text not null default 'creating' check(status in ('creating','pending','paid','expired','failed','review')),
 payment_id text,
 expires_at timestamptz not null default (now() + interval '16 minutes'),
 created_at timestamptz not null default now()
);
create unique index clover_one_active_checkout on public.clover_payment_sessions(store_id,target_type,target_id) where status in ('creating','pending');
alter table public.clover_payment_sessions enable row level security;
revoke all on public.clover_payment_sessions from public, anon, authenticated;
grant all on public.clover_payment_sessions to service_role;
alter table public.payment_receipts add column clover_checkout_session_id text;
create unique index clover_receipt_session on public.payment_receipts(clover_checkout_session_id) where clover_checkout_session_id is not null;
-- One transaction locks the session and target, applies payment and creates receipt.
-- Invoker function is callable only by the server role, never browser clients.
create function public.settle_clover_payment(p_store_id uuid,p_session_id text,p_merchant_id text,p_payment_id text)
returns text language plpgsql security invoker set search_path=public,pg_temp as $$
declare s public.clover_payment_sessions%rowtype; o public.orders%rowtype; sh public.shipments%rowtype;
begin
 select * into s from public.clover_payment_sessions where store_id=p_store_id and session_id=p_session_id and merchant_id=p_merchant_id for update;
 if not found then raise exception 'Unknown checkout'; end if;
 if s.status in ('paid','review') then return s.status; end if;
 if s.target_type='order' then
  select * into o from public.orders where id::text=s.target_id and store_id=s.store_id and deleted_at is null for update;
  if not found or o.payment_status='paid' or o.stock_restored or round(o.total*100)<>s.base_cents then
   update public.clover_payment_sessions set status='review',payment_id=p_payment_id where id=s.id;
   return 'review';
  end if;
  update public.orders set payment_status='paid',payment_method='card',total=s.total_cents/100.0 where id=o.id;
 else
  select * into sh from public.shipments where id=s.target_id and store_id=s.store_id and deleted_at is null for update;
  if not found or sh.payment_status='paid' or round(sh.balance_due*100)<>s.base_cents then
   update public.clover_payment_sessions set status='review',payment_id=p_payment_id where id=s.id;
   return 'review';
  end if;
  update public.shipments set amount_paid=coalesce(amount_paid,0)+s.base_cents/100.0,balance_due=0,payment_status='paid',payment_method='card' where id=sh.id;
  insert into public.payment_receipts(store_id,shipment_id,amount,payment_method,clover_checkout_session_id)
   values(s.store_id,sh.id,s.base_cents/100.0,'card',s.session_id);
 end if;
 update public.clover_payment_sessions set status='paid',payment_id=p_payment_id where id=s.id;
 return 'paid';
end $$;
revoke all on function public.settle_clover_payment(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.settle_clover_payment(uuid,text,text,text) to service_role;
