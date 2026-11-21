-- Apply after publishing the corresponding storefront assets.
with photos(sku, old_notice) as (
  values
    ('60278', 'Imagen ilustrativa generada. La presentación, el color o el empaque real pueden variar.'),
    ('87941', null),
    ('19637', null),
    ('33579', null),
    ('70838', null),
    ('72387', 'Imagen ilustrativa generada. El empaque real puede variar.'),
    ('73137', null),
    ('36647', null),
    ('65707', null),
    ('61691', null),
    ('48113', null),
    ('95237', null),
    ('5816', null),
    ('4812', null),
    ('5378', null),
    ('59069', null),
    ('55675', null),
    ('67559', 'Imagen ilustrativa generada. La presentación, el color o el empaque real pueden variar.'),
    ('77903', 'Imagen ilustrativa generada. La presentación, el color o el empaque real pueden variar.'),
    ('91888', null),
    ('14182', null),
    ('14440', null),
    ('14516', 'Imagen ilustrativa generada. La presentación, el color o el empaque real pueden variar.'),
    ('31244', null),
    ('32697', null),
    ('36195', null),
    ('37721', null),
    ('38040', null),
    ('38567', null),
    ('40693', null),
    ('62658', null),
    ('71193', null),
    ('7355', null),
    ('73614', null),
    ('78364', null),
    ('79050', null),
    ('81250', null),
    ('90181', null),
    ('90255', 'Imagen ilustrativa generada. El empaque real puede variar.'),
    ('99020', null)
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
  and not exists (select 1 from public.product_images as i where i.product_id = p.id)
  and (
    (photos.old_notice is null and nullif(btrim(p.image_url), '') is null)
    or (photos.old_notice is not null and p.image_url =
      'https://xpress.perlamarketplace.com/xpress/catalogo/' || p.sku || '.webp')
  );
