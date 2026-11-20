-- Fuente de precios e imágenes: https://cubatexmultiservices.com/combos-de-alimentos/
-- Ejecutar después de la migración de provincias. Carga inicial en borrador.
-- Las imágenes de referencia muestran el precio del proveedor. Sustituir por
-- imágenes sin precio impreso y confirmar existencias antes de activar.
BEGIN;

DO $catalog$
DECLARE
  wf_store public.stores.id%TYPE;
BEGIN
  SELECT id INTO STRICT wf_store FROM public.stores WHERE slug = 'wf-cago';

  INSERT INTO public.categories (store_id, name, slug, is_active)
  SELECT wf_store, 'Combos', 'combos', true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.categories WHERE store_id = wf_store AND (slug = 'combos' OR lower(name) = 'combos')
  );

  INSERT INTO public.products (
    store_id, name, price, category, description, image_url, stock,
    is_active, combo_only, platform_fee_exempt, delivery_included, delivery_provinces
  )
  SELECT wf_store, offer.name, offer.supplier_price + 5, category.name, offer.description, offer.image_url,
    0, false, false, true, true, ARRAY['La Habana']::text[]
  FROM (VALUES
      ('Combo Económico #1', 55, '/wfcargo/combos/economico-1.jpg',
       '1 arroz (1 kg); 1 frijoles (1 kg); 1 aceite (900 ml); 1 azúcar (1 kg); 1 espaguetis (500 g); 1 picadillo (400 g); 1 leche condensada (397 g); 5 lb de lomo de cerdo; 1 salchicha (340 g); 1 pasta de tomate (400 g); 1 café Isla Grande (250 g). Regalos: 3 galletas de leche y 1 gelatina. Transporte incluido en La Habana.'),
      ('Combo Económico #2', 50, '/wfcargo/combos/economico-2.jpg',
       '1 arroz (1 kg); 1 frijoles (1 kg); 1 aceite (900 ml); 1 azúcar (1 kg); 1 picadillo (400 g); 1 leche condensada (397 g); 5 lb de lomo de cerdo; 1 salchicha (340 g); 1 café Isla Grande (250 g). Regalos: 2 galletas de leche y 2 caramelos Freegells. Transporte incluido en La Habana.'),
      ('Combo Económico #3', 65, '/wfcargo/combos/economico-3.jpg',
       '2 arroces (1 kg c/u); 1 frijoles (1 kg); 1 aceite (900 ml); 3 picadillos (400 g c/u); 2 salchichas (340 g c/u); 1 leche condensada (397 g); 10 lb de pollo; 2 espaguetis (500 g c/u); 2 coditos (500 g c/u); 1 pasta de tomate (400 g); 1 café Isla Grande (250 g). Regalos: 2 galletas de leche, 2 caramelos Freegells y 3 panqueques de chocolate. Transporte incluido en La Habana.'),
      ('Combo Familiar #1', 100, '/wfcargo/combos/familiar-1.jpg',
       '4 arroces (1 kg c/u); 3 frijoles (1 kg c/u); 1 leche entera (1 kg); 2 cafés (250 g c/u); 3 salchichas (340 g c/u); 1 cartón de 30 huevos; 10 lb de pollo; 5 lb de lomo de cerdo; 2 picadillos (400 g c/u); 1 aceite (900 ml). Regalos: 2 gelatinas, 1 sopa instantánea, 2 caramelos Freegells y 2 latas de leche condensada. Transporte incluido en La Habana.'),
      ('Combo Familiar #2', 80, '/wfcargo/combos/familiar-2.jpg',
       '5 arroces (1 kg c/u); 2 frijoles (1 kg c/u); 2 leches condensadas; 2 coditos (500 g c/u); 1 pasta de tomate; 1 sazón Iberia (36 unidades); 1 hígado de pollo (1 kg); 10 lb de pollo; 5 lb de lomo de cerdo; 2 espaguetis (500 g c/u); 1 aceite (900 ml). Regalos: 1 gelatina y 1 sopa instantánea. Transporte incluido en La Habana.'),
      ('Combo Familiar #3', 95, '/wfcargo/combos/familiar-3.jpg',
       '5 arroces (1 kg c/u); 2 frijoles (1 kg c/u); 1 azúcar (1 kg); 1 aceite (900 ml); 4 cervezas; 4 refrescos; 10 lb de pollo; 5 lb de lomo de cerdo; 2 salchichas (340 g c/u); 2 picadillos (400 g c/u); 1 detergente (1 kg); 1 café Isla Grande (250 g); 2 paquetes de papel higiénico (4 rollos c/u); 4 jabones de tocador; 1 leche entera (1 kg). Regalos: 1 gelatina y 2 caramelos Freegells. Transporte incluido en La Habana.'),
      ('Combo Premium #1', 155, '/wfcargo/combos/premium-1.jpg',
       'Pollo (33 o 40 lb); 10 lb de lomo de cerdo; 1 cartón de 30 huevos; 1 leche entera (1 kg); 1 café (250 g); 5 arroces (1 kg c/u); 5 frijoles (1 kg c/u); 1 sazón tropical (20 unidades); 2 espaguetis (500 g c/u); 1 pasta de tomate; 1 azúcar (1 kg); 1 aceite (900 ml); 2 detergentes (1 kg c/u); 6 jabones de tocador (100 g c/u); 2 paquetes de papel higiénico (4 rollos c/u). Regalos: 2 gelatinas, 2 sopas instantáneas, 5 galletas de leche, 7 caramelos Freegells, 5 juguitos (200 ml c/u) y 4 jugos (1 L c/u). Transporte incluido en La Habana.'),
      ('Combo Premium #2', 200, '/wfcargo/combos/premium-2.jpg',
       '18 lb de pernil o paleta de cerdo según disponibilidad; 5 lb de chuleta de cerdo; 10 lb de pollo; 5 lb de lomo de cerdo; 1 cartón de 30 huevos; 1 leche entera (1 kg); 1 café (250 g); 3 salchichas; 3 picadillos; 2 hígados (1 kg c/u); 2 leches condensadas; 2 espaguetis (500 g c/u); 1 pasta de tomate; 1 azúcar (1 kg); 12 refrescos; 24 cervezas; 5 arroces (1 kg c/u); 5 frijoles (1 kg c/u); 2 coditos (500 g c/u); 2 detergentes (1 kg c/u); 6 jabones de tocador (100 g c/u); 2 paquetes de papel higiénico (4 rollos c/u); 1 sazón tropical (20 unidades); 1 sazón Iberia (36 unidades). Regalos: 2 jugos (1 L c/u), 2 sopas instantáneas y 2 frazadas de piso. Transporte incluido en La Habana.'),
      ('Combo Proteína #1', 80, '/wfcargo/combos/proteina-1.jpg',
       '10 lb de pollo; 5 lb de lomo de cerdo; 2 picadillos (400 g c/u); 4 salchichas (340 g c/u); 1 cartón de 30 huevos; 1 leche entera (1 kg); 1 hígado de pollo (1 kg). Regalos: 1 gelatina. Transporte incluido en La Habana.'),
      ('Combo Proteína #2', 150, '/wfcargo/combos/proteina-2.jpg',
       '2 pollos de 10 lb; 10 lb de lomo de cerdo; 4 picadillos (400 g c/u); 1 hígado de pollo (1 kg); 1 cartón de 30 huevos; 1 pernil o lomo (15 lb); 5 lb de chuletas de cerdo; 5 salchichas (340 g c/u). Regalos: 1 gelatina y 1 leche condensada. Transporte incluido en La Habana.')
  ) AS offer(name, supplier_price, image_url, description)
  CROSS JOIN LATERAL (
    SELECT name FROM public.categories
    WHERE store_id = wf_store AND (slug = 'combos' OR lower(name) = 'combos')
    ORDER BY (slug = 'combos') DESC, id
    LIMIT 1
  ) category
  WHERE NOT EXISTS (
    SELECT 1 FROM public.products
    WHERE store_id = wf_store AND products.category = category.name
      AND lower(products.name) = lower(offer.name) AND deleted_at IS NULL
  );
END
$catalog$;

COMMIT;
