-- Apply after the storefront assets are available in production.
with photos(sku, old_image_url, old_notice) as (
  values
    ('45920', null, null),
    ('71978', null, null),
    ('10709', null, null),
    ('13092', 'https://xpress.perlamarketplace.com/xpress/catalogo/13092.webp', 'Imagen ilustrativa generada. La presentación, el color o el empaque real pueden variar.'),
    ('15595', null, null),
    ('23748', null, null),
    ('24319', null, null),
    ('27073', null, null),
    ('32618', null, null),
    ('48972', null, null),
    ('50338', null, null),
    ('51047', 'https://xpress.perlamarketplace.com/xpress/catalogo/51047.webp', 'Imagen ilustrativa generada. La presentación, el color o el empaque real pueden variar.'),
    ('52054', null, null),
    ('55869', null, null),
    ('60707', null, null),
    ('63946', null, null),
    ('67131', null, null),
    ('75468', null, null),
    ('9181', null, null),
    ('98399', null, null)
)
update public.products as p
set image_url = 'https://xpress.perlamarketplace.com/xpress/catalogo/real-' || p.sku || '.webp',
    description = case
      when photos.old_notice is not null
        then replace(p.description, E'\n' || photos.old_notice, '')
      else p.description
    end
from photos, public.stores as s
where p.store_id = s.id
  and s.slug = 'xpress'
  and p.deleted_at is null
  and p.sku = photos.sku
  and p.image_url is not distinct from photos.old_image_url
  and not exists (select 1 from public.product_images as i where i.product_id = p.id);
