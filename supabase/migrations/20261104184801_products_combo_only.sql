-- Default preserves existing storefront and combo behavior for every tenant.
alter table public.products add column combo_only boolean not null default false;
comment on column public.products.combo_only is 'Component available inside combos only; not offered for individual purchase. Price 0 is an internal placeholder when no standalone price is configured.';
