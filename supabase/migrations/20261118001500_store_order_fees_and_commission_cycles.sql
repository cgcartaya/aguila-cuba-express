begin;

alter table public.stores add column platform_order_fixed_fee numeric
  check (platform_order_fixed_fee between 0 and 10000
    and platform_order_fixed_fee=round(platform_order_fixed_fee,2));

create function private.guard_store_order_fixed_fee() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_op='UPDATE' and new.platform_order_fixed_fee is not distinct from old.platform_order_fixed_fee then
    return new;
  end if;
  if tg_op='INSERT' and new.platform_order_fixed_fee is null then return new; end if;
  if current_setting('role',true) in ('authenticated','anon')
    and not exists(select 1 from public.profiles where id=auth.uid() and active and role='super_admin') then
    raise exception 'Solo un administrador SaaS puede cambiar el fijo por orden';
  end if;
  return new;
end $$;
revoke all on function private.guard_store_order_fixed_fee() from public,anon,authenticated;
create trigger guard_store_order_fixed_fee
before insert or update of platform_order_fixed_fee on public.stores
for each row execute function private.guard_store_order_fixed_fee();

-- LYM creates a request first and earns its fixed fee only at confirmation.
create function private.apply_lym_store_order_fixed_fee() returns trigger
language plpgsql security definer set search_path='' as $$
declare fixed_fee numeric;
begin
  select coalesce(s.platform_order_fixed_fee,0.30) into strict fixed_fee
    from public.stores s where s.id=new.store_id;
  new.platform_fixed_fee_amount=fixed_fee;
  new.platform_fee_amount=fixed_fee;
  return new;
end $$;
revoke all on function private.apply_lym_store_order_fixed_fee() from public,anon,authenticated;
create trigger zz_apply_lym_store_order_fixed_fee
before update of lym_sale_state on public.orders
for each row when (new.lym_sale_state='confirmed' and old.lym_sale_state is distinct from 'confirmed')
execute function private.apply_lym_store_order_fixed_fee();

-- A commission can be unbilled, attached to an open invoice, or settled.
-- Partial payments stay on the invoice until the entire balance is cleared.
create function public.saas_commission_cycle(p_actor uuid,p_store uuid,p_month date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not exists(select 1 from public.profiles where id=p_actor and active and role='super_admin') then
    raise exception 'Acceso SaaS requerido';
  end if;
  if p_month is null or extract(day from p_month)<>1
     or p_month>date_trunc('month',now() at time zone 'America/New_York')::date then
    raise exception 'Selecciona un mes de facturación válido';
  end if;
  return (
    with quotes as materialized (
      select private.saas_billing_quote(s.id,p_month) as quote
      from public.stores s where p_store is null or s.id=p_store
    ), amounts as (
      select 'order' as kind,'unbilled' as state,
        coalesce(sum((quote->>'orders')::numeric),0) as amount,
        coalesce(sum(jsonb_array_length(quote->'order_rows')),0) as operations from quotes
      union all
      select 'shipping','unbilled',coalesce(sum((quote->>'shipping')::numeric),0),
        coalesce(sum(jsonb_array_length(quote->'shipping_rows')),0) from quotes
      union all
      select charges.kind,i.status,
        sum(case when charges.kind='order' then i.order_commission else i.shipping_commission end),
        sum(charges.operations)
      from public.saas_subscription_invoices i
      cross join lateral (
        select b.kind,count(*) as operations from private.saas_billed_commissions b
        where b.invoice_id=i.id group by b.kind
      ) charges
      where i.billing_month=p_month and i.status in ('pending','paid')
        and (p_store is null or i.store_id=p_store)
      group by charges.kind,i.status
    )
    select coalesce(jsonb_agg(to_jsonb(amounts)),'[]'::jsonb) from amounts
  );
end $$;
revoke all on function public.saas_commission_cycle(uuid,uuid,date) from public,anon,authenticated;
grant execute on function public.saas_commission_cycle(uuid,uuid,date) to service_role;

commit;
