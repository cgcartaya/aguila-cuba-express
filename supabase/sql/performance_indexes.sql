-- =========================================================
-- PERFORMANCE FASE 3 - ÍNDICES RECOMENDADOS
-- Ejecutar en Supabase > SQL Editor.
-- Son seguros porque usan IF NOT EXISTS.
-- =========================================================

create index if not exists idx_products_store_active_created
on public.products (store_id, is_active, created_at desc);

create index if not exists idx_products_store_category_active
on public.products (store_id, category, is_active);

create index if not exists idx_products_active_category
on public.products (is_active, category);

create index if not exists idx_product_images_product_position
on public.product_images (product_id, is_main desc, position asc);

create index if not exists idx_categories_store_active_sort
on public.categories (store_id, is_active, sort_order asc);

create index if not exists idx_banners_store_active_sort
on public.banners (store_id, is_active, sort_order asc);

create index if not exists idx_combos_store_active_created
on public.combos (store_id, is_active, created_at desc)
where deleted_at is null;

create index if not exists idx_combo_items_combo_id
on public.combo_items (combo_id);

create index if not exists idx_stores_slug
on public.stores (slug);

create index if not exists idx_stores_domain
on public.stores (domain);
