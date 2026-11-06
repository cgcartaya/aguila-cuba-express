begin;
-- Shipping invoices accrue separately in shipping_platform_charges.
create function private.clear_shipping_order_platform_fee()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.platform_fee_amount := 0;
  new.platform_fixed_fee_amount := 0;
  return new;
end;
$$;

create trigger zz_clear_shipping_order_platform_fee
before insert or update on public.orders
for each row when (new.source_shipment_id is not null)
execute function private.clear_shipping_order_platform_fee();

-- The table lock from ALTER TABLE keeps the guard active for other sessions.
alter table public.orders disable trigger guard_shipment_product_order;
update public.orders
set platform_fee_amount = 0, platform_fixed_fee_amount = 0
where source_shipment_id is not null
  and (platform_fee_amount is distinct from 0 or platform_fixed_fee_amount is distinct from 0);
alter table public.orders enable trigger guard_shipment_product_order;
commit;
