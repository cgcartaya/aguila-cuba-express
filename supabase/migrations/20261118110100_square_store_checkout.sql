-- NULL preserves the historical checkout routing for existing stores and orders.
alter table public.stores add column active_payment_provider text
  check (active_payment_provider in ('stripe', 'clover', 'square'));
alter table public.orders add column checkout_payment_provider text
  check (checkout_payment_provider in ('stripe', 'clover', 'square'));

create table public.square_payment_sessions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id),
  store_id uuid not null references public.stores(id),
  environment text not null check (environment in ('sandbox', 'production')),
  merchant_id text not null,
  location_id text not null,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'USD' check (currency = 'USD'),
  item_name text not null,
  return_url text not null,
  square_order_id text,
  payment_link_id text,
  checkout_url text,
  payment_id text,
  status text not null default 'creating' check (status in ('creating','pending','paid','expired','review')),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  expires_at timestamptz,
  unique (environment, merchant_id, square_order_id),
  unique (environment, merchant_id, payment_id)
);

create table public.square_payment_events (
  environment text not null,
  event_id text not null,
  session_id uuid not null references public.square_payment_sessions(id),
  event_type text not null,
  received_at timestamptz not null default now(),
  primary key (environment, event_id)
);

create index square_payment_sessions_expiry on public.square_payment_sessions(expires_at) where status = 'pending';
create index square_payment_sessions_store on public.square_payment_sessions(store_id, status);

alter table public.square_payment_sessions enable row level security;
alter table public.square_payment_events enable row level security;
revoke all on public.square_payment_sessions, public.square_payment_events from public, anon, authenticated;
grant select, insert, update on public.square_payment_sessions to service_role;
grant select, insert on public.square_payment_events to service_role;

create function public.settle_square_order(
  p_session_id uuid, p_event_id text, p_event_type text, p_payment_id text,
  p_location_id text, p_amount_cents bigint, p_currency text
) returns text language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  s public.square_payment_sessions%rowtype;
  o public.orders%rowtype;
begin
  select * into strict s from public.square_payment_sessions where id = p_session_id for update;
  insert into public.square_payment_events(environment, event_id, session_id, event_type)
    values (s.environment, p_event_id, s.id, p_event_type) on conflict do nothing;
  if not found then return s.status; end if;

  if p_event_type in ('refund.created', 'refund.updated') then
    update public.square_payment_sessions set status = 'review' where id = s.id;
    return 'review';
  end if;

  if s.status in ('paid', 'review') and s.payment_id = p_payment_id then return s.status; end if;
  select * into o from public.orders where id = s.order_id and store_id = s.store_id for update;
  if not found or o.deleted_at is not null or o.checkout_payment_provider is distinct from 'square'
     or o.payment_status is distinct from 'pending' or o.status in ('cancelled', 'canceled')
     or o.stock_restored is true or o.source_shipment_id is not null
     or round(o.total * 100) is distinct from s.amount_cents
     or p_location_id is distinct from s.location_id or p_amount_cents is distinct from s.amount_cents
     or p_currency is distinct from s.currency then
    update public.square_payment_sessions set status = 'review', payment_id = coalesce(payment_id, p_payment_id) where id = s.id;
    return 'review';
  end if;

  update public.orders set payment_status = 'paid', payment_method = 'card' where id = o.id;
  update public.square_payment_sessions set status = 'paid', payment_id = p_payment_id, paid_at = now() where id = s.id;
  return 'paid';
end;
$$;
revoke all on function public.settle_square_order(uuid,text,text,text,text,bigint,text) from public, anon, authenticated;
grant execute on function public.settle_square_order(uuid,text,text,text,text,bigint,text) to service_role;

alter table public.store_square_settings add column connection_status text not null default 'connected'
  check (connection_status in ('connected', 'disconnecting'));

create function public.guard_square_session_connection()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  connected_store uuid;
begin
  select store_id into connected_store from public.store_square_settings
    where store_id = new.store_id and merchant_id = new.merchant_id and environment = new.environment
      and connection_status = 'connected' and location_id = new.location_id for share;
  if not found then raise exception 'Square connection is unavailable'; end if;
  perform 1 from public.orders
    where id = new.order_id and store_id = new.store_id and checkout_payment_provider = 'square'
      and payment_status = 'pending' and deleted_at is null and stock_restored is not true
      and status not in ('cancelled', 'canceled') and round(total * 100) = new.amount_cents for share;
  if not found then raise exception 'Square order is unavailable'; end if;
  return new;
end;
$$;
create trigger square_session_requires_connection before insert on public.square_payment_sessions
  for each row execute function public.guard_square_session_connection();

create function public.begin_square_disconnect(p_store_id uuid, p_merchant_id text, p_environment text)
returns boolean language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  perform 1 from public.store_square_settings where store_id = p_store_id and merchant_id = p_merchant_id
    and environment = p_environment for update;
  if not found then return false; end if;
  if exists (select 1 from public.stores where id = p_store_id and active_payment_provider = 'square')
     or exists (select 1 from public.square_payment_sessions where store_id = p_store_id and status in ('creating','pending','review')) then
    return false;
  end if;
  update public.store_square_settings set connection_status = 'disconnecting' where store_id = p_store_id;
  return true;
end;
$$;
revoke all on function public.begin_square_disconnect(uuid,text,text) from public, anon, authenticated;
grant execute on function public.begin_square_disconnect(uuid,text,text) to service_role;

create function public.set_store_checkout_provider(p_store_id uuid, p_provider text)
returns boolean language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if p_provider = 'square' then
    perform 1 from public.store_square_settings where store_id = p_store_id and location_id is not null
      and connection_status = 'connected' and location_id = new.location_id for share;
    if not found then return false; end if;
  end if;
  update public.stores set active_payment_provider = p_provider where id = p_store_id;
  return found;
end;
$$;
revoke all on function public.set_store_checkout_provider(uuid,text) from public, anon, authenticated;
grant execute on function public.set_store_checkout_provider(uuid,text) to service_role;

-- Called only after Square confirms its order was canceled without a tender.
create function public.expire_square_order(p_session_id uuid)
returns text language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  s public.square_payment_sessions%rowtype;
  o public.orders%rowtype;
  needs jsonb;
begin
  select * into strict s from public.square_payment_sessions where id = p_session_id for update;
  if s.status <> 'pending' then return s.status; end if;
  select * into strict o from public.orders where id = s.order_id and store_id = s.store_id for update;
  if o.payment_status = 'pending' and o.checkout_payment_provider = 'square' and o.deleted_at is null then
    if o.stock_restored is not true then
      select jsonb_agg(jsonb_build_object('product_id', product_id, 'quantity', -quantity, 'order_id', o.id))
        into needs from public.inventory_movements
        where store_id = s.store_id and order_id = o.id and movement_type = 'exit'
          and reason = 'Venta automática de tienda online' and quantity < 0;
      perform public.restore_product_inventory(s.store_id, needs);
    end if;
    update public.orders set payment_status = 'expired', stock_restored = true where id = o.id;
  end if;
  update public.square_payment_sessions set status = 'expired' where id = s.id;
  return 'expired';
end;
$$;
revoke all on function public.expire_square_order(uuid) from public, anon, authenticated;
grant execute on function public.expire_square_order(uuid) to service_role;

create table public.square_connection_audit (
  id bigint generated always as identity primary key,
  store_id uuid not null,
  merchant_id text not null,
  action text not null,
  recorded_at timestamptz not null default now()
);
alter table public.square_connection_audit enable row level security;
revoke all on public.square_connection_audit from public, anon, authenticated;
grant select, insert on public.square_connection_audit to service_role;

create function public.record_square_connection_change()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    insert into public.square_connection_audit(store_id, merchant_id, action)
      values (new.store_id, new.merchant_id, 'connected');
  elsif tg_op = 'DELETE' then
    insert into public.square_connection_audit(store_id, merchant_id, action)
      values (old.store_id, old.merchant_id, 'disconnected');
  elsif old.location_id is distinct from new.location_id then
    insert into public.square_connection_audit(store_id, merchant_id, action)
      values (new.store_id, new.merchant_id, 'location_changed');
  end if;
  return null;
end;
$$;
create trigger square_connection_audit
  after insert or update or delete on public.store_square_settings
  for each row execute function public.record_square_connection_change();

-- Existing table-wide grants also cover new columns. Only server code can
-- pick the provider or set the provider on a newly created checkout.
create function public.guard_checkout_payment_provider()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  column_name text := tg_argv[0];
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      if to_jsonb(new)->>column_name is not null then raise exception 'Provider is managed by the server'; end if;
    elsif to_jsonb(new)->>column_name is distinct from to_jsonb(old)->>column_name then
      raise exception 'Provider is managed by the server';
    end if;
  end if;
  return new;
end;
$$;
create trigger store_checkout_provider_server_only before insert or update of active_payment_provider on public.stores
  for each row execute function public.guard_checkout_payment_provider('active_payment_provider');
create trigger order_checkout_provider_server_only before insert or update of checkout_payment_provider on public.orders
  for each row execute function public.guard_checkout_payment_provider('checkout_payment_provider');

create function public.guard_square_order_changes()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if old.checkout_payment_provider = 'square' and old.payment_status = 'pending'
     and (new.deleted_at is distinct from old.deleted_at
       or (new.status is distinct from old.status and new.status in ('cancelled', 'canceled'))
       or (new.stock_restored is true and old.stock_restored is not true and new.payment_status <> 'expired'))
     and exists (select 1 from public.square_payment_sessions where order_id = old.id and status in ('creating', 'pending', 'review')) then
    raise exception 'El cobro Square aún está pendiente de conciliación.';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_square_order_changes() from public, anon, authenticated;
create trigger square_order_guard before update of deleted_at, status, stock_restored on public.orders
  for each row execute function public.guard_square_order_changes();
