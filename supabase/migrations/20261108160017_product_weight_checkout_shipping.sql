-- Additive, backwards-compatible product shipping metadata for every tenant.
alter table public.products
  add column if not exists weight numeric,
  add column if not exists weight_unit text not null default 'lb',
  add column if not exists platform_fee_exempt boolean not null default false;
alter table public.products add constraint products_weight_positive check (weight is null or (weight > 0 and weight < 1000000));
alter table public.products add constraint products_weight_unit_valid check (weight_unit in ('g', 'lb', 'kg'));
alter table public.orders add column if not exists shipping_details jsonb;
comment on column public.products.weight is 'Packed weight of one product unit; null means not configured.';
comment on column public.products.platform_fee_exempt is 'Exempts this product from percentage markup, not the per-order fixed platform fee.';
comment on column public.orders.shipping_details is 'Server-calculated checkout shipment snapshot, included in delivery_fee.';
