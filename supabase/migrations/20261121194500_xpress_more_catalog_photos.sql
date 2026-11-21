-- Apply after publishing the corresponding storefront assets.
update public.products as p
set image_url = 'https://xpress.perlamarketplace.com/xpress/catalogo/' || p.sku || '.webp',
    description = concat_ws(E'\n', nullif(p.description, ''), 'Imagen ilustrativa generada. La presentación, el color o el empaque real pueden variar.')
from public.stores as s
where p.store_id = s.id
  and s.slug = 'xpress'
  and p.deleted_at is null
  and nullif(btrim(p.image_url), '') is null
  and not exists (select 1 from public.product_images as i where i.product_id = p.id)
  and p.sku in ('77903', '67559', '20465', '60278', '58032', '49566', '53553', '14516', '9305', '35240', '61674', '33407', '13092', '51047', '51440', '17708', '11527', '84061');
