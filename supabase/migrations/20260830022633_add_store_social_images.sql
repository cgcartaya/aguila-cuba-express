-- Imágenes Open Graph específicas por sección para cada tienda.
-- Es seguro ejecutar esta migración más de una vez.

alter table public.stores
  add column if not exists store_og_image_url text,
  add column if not exists order_og_image_url text,
  add column if not exists tracking_og_image_url text;

comment on column public.stores.store_og_image_url is
  'Imagen social para catálogo, categorías, productos y carrito.';

comment on column public.stores.order_og_image_url is
  'Imagen social para enlaces públicos de estado del pedido.';

comment on column public.stores.tracking_og_image_url is
  'Imagen social para buscador y enlaces públicos de rastreo de envíos.';
