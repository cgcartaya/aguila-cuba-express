alter table public.store_clover_settings add column page_config_uuid text check (page_config_uuid is null or page_config_uuid ~ '^[A-Za-z0-9]{8,64}$');
comment on column public.store_clover_settings.page_config_uuid is 'Explicit Hosted Checkout page whose webhook configuration is used; null uses Clover default.';
