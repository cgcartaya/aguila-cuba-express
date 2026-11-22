alter table public.orders
  add column customer_management_fee numeric(12,2) not null default 0
  check (customer_management_fee >= 0);

-- Only future Xpress orders receive the existing fixed platform commission.
update public.stores
set platform_order_fixed_fee = 0.50
where slug = 'xpress';
