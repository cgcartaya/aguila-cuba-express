-- Agency-paid module usage. No backfill and no changes to customer invoices.
create table public.shipping_platform_billing (
  store_id uuid primary key references public.stores(id),
  enabled boolean not null default false,
  fee_per_operation numeric(12,2) not null default 0 check (fee_per_operation >= 0 and fee_per_operation <= 10000),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create table public.shipping_platform_charges (
  -- Intentionally no cascading shipment FK: issued usage survives trash/deletion.
  shipment_id text primary key,
  store_id uuid not null references public.stores(id),
  tracking_code text,
  operation_type text not null check (operation_type in ('package','money','mixed')),
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);
create index shipping_platform_charges_store_date_idx on public.shipping_platform_charges(store_id,created_at desc);
alter table public.shipping_platform_billing enable row level security;
alter table public.shipping_platform_charges enable row level security;
revoke all on public.shipping_platform_billing,public.shipping_platform_charges from anon,authenticated;
grant select on public.shipping_platform_billing,public.shipping_platform_charges to authenticated;
grant all on public.shipping_platform_billing,public.shipping_platform_charges to service_role;
create policy shipping_billing_member_read on public.shipping_platform_billing for select to authenticated using (public.user_has_store_access(store_id));
create policy shipping_charges_member_read on public.shipping_platform_charges for select to authenticated using (public.user_has_store_access(store_id));

create schema if not exists private;
create function private.capture_shipping_platform_charge() returns trigger
language plpgsql security definer set search_path = '' as $$
declare rate numeric(12,2); actor uuid := auth.uid();
begin
  -- A public/anonymous insert must never create an agency debt.
  if coalesce(nullif(current_setting('request.jwt.claims',true), '')::jsonb->>'role','') <> 'service_role' then
    if actor is null or not exists (
      select 1 from public.profiles p where p.id=actor and p.active=true and
      (p.role='super_admin' or exists(select 1 from public.store_users u where u.user_id=actor and u.store_id=new.store_id and u.active=true))
    ) then return new; end if;
  end if;
  if not (coalesce(new.contains_package,false) or coalesce(new.contains_money,false)) then return new; end if;
  select b.fee_per_operation into rate from public.shipping_platform_billing b join public.stores s on s.id=b.store_id
    where b.store_id=new.store_id and b.enabled=true and b.fee_per_operation>0 and s.module_shipping_enabled=true;
  if rate is null then return new; end if;
  insert into public.shipping_platform_charges(shipment_id,store_id,tracking_code,operation_type,amount)
    values(new.id,new.store_id,new.tracking_code,case when new.contains_money and new.contains_package then 'mixed' when new.contains_money then 'money' else 'package' end,rate)
    on conflict(shipment_id) do nothing;
  return new;
end $$;
revoke all on function private.capture_shipping_platform_charge() from public,anon,authenticated;
create trigger capture_shipping_platform_charge after insert on public.shipments for each row execute function private.capture_shipping_platform_charge();

create function public.get_shipping_platform_billing(p_store_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
select jsonb_build_object(
  'enabled',coalesce((select enabled from public.shipping_platform_billing where store_id=p_store_id),false),
  'fee_per_operation',coalesce((select fee_per_operation from public.shipping_platform_billing where store_id=p_store_id),0),
  'currency','USD',
  'today_count',count(*) filter(where (created_at at time zone 'America/New_York')::date=(now() at time zone 'America/New_York')::date),
  'today_amount',coalesce(sum(amount) filter(where (created_at at time zone 'America/New_York')::date=(now() at time zone 'America/New_York')::date),0),
  'month_count',count(*) filter(where date_trunc('month',created_at at time zone 'America/New_York')=date_trunc('month',now() at time zone 'America/New_York')),
  'month_amount',coalesce(sum(amount) filter(where date_trunc('month',created_at at time zone 'America/New_York')=date_trunc('month',now() at time zone 'America/New_York')),0),
  'total_count',count(*),'total_amount',coalesce(sum(amount),0)
) from public.shipping_platform_charges where store_id=p_store_id;
$$;
revoke all on function public.get_shipping_platform_billing(uuid) from public,anon,authenticated;
grant execute on function public.get_shipping_platform_billing(uuid) to service_role;
