-- Apply after publishing the corresponding storefront assets.
update public.products as p
set image_url = 'https://xpress.perlamarketplace.com/xpress/catalogo/' || p.sku || '.webp',
    description = concat_ws(E'\n', nullif(p.description, ''), 'Imagen ilustrativa generada. El empaque real puede variar.')
from public.stores as s
where p.store_id = s.id
  and s.slug = 'xpress'
  and p.deleted_at is null
  and nullif(btrim(p.image_url), '') is null
  and not exists (select 1 from public.product_images as i where i.product_id = p.id)
  and p.sku in ('10847', '12490', '17984', '28048', '28628', '30894', '31786', '3330', '41103', '43833', '45841', '51664', '57073', '6112', '64935', '68159', '72387', '73942', '76332', '86153', '90255', '91212', '91966', '9890');
