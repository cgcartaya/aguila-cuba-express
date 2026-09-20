-- Combos Martínez: ejecutar MANUALMENTE en Supabase SQL Editor tras revisar el PR.
-- No es una migración automática. Todos los productos quedan inactivos y con stock 0.
-- Precio 0 es un marcador SOLO para artículos sin precio confirmado; nunca se publican.
BEGIN;
DO $seed$
DECLARE
  v_store_id uuid;
  v_matches integer;
  v_category record;
  v_product record;
BEGIN
  SELECT count(*), min(id) INTO v_matches, v_store_id FROM public.stores
  WHERE subdomain = 'combos-martinez';
  IF v_matches <> 1 THEN
    RAISE EXCEPTION 'Se esperaba exactamente una tienda con subdomain combos-martinez; encontradas: %', v_matches;
  END IF;

  FOR v_category IN
    SELECT * FROM (VALUES
      ('Cárnicos y pescados', 'carnicos-y-pescados', 1),
      ('Embutidos', 'embutidos', 2),
      ('Huevos, arroz y granos', 'huevos-arroz-y-granos', 3),
      ('Café, pastas y lácteos', 'cafe-pastas-y-lacteos', 4),
      ('Aseo y limpieza', 'aseo-y-limpieza', 5),
      ('Helados, yogures y congelados', 'helados-yogures-y-congelados', 6),
      ('Bebidas', 'bebidas', 7),
      ('Licores', 'licores', 8)
    ) AS c(name, slug, sort_order)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.categories WHERE store_id = v_store_id AND lower(name) = lower(v_category.name)) THEN
      INSERT INTO public.categories (store_id, name, slug, color, icon, sort_order, is_active, minimum_order_exempt, delivery_included)
      VALUES (v_store_id, v_category.name, v_category.slug, '#ED0015', 'tag', v_category.sort_order, true, false, false);
    END IF;
  END LOOP;

  FOR v_product IN
    SELECT * FROM (VALUES
    ('Cárnicos y pescados', 'Paquete de pollo 1.8 lb', NULL),
    ('Cárnicos y pescados', 'Bistec de cerdo 5 lb', NULL),
    ('Cárnicos y pescados', 'Pernil de cerdo 1 lb', NULL),
    ('Cárnicos y pescados', 'Paquete de pollo 10 lb', NULL),
    ('Cárnicos y pescados', 'Picadillo de pollo 400 g', NULL),
    ('Cárnicos y pescados', 'Troceado de res 1 kg', NULL),
    ('Cárnicos y pescados', 'Bola de res 1 kg', NULL),
    ('Cárnicos y pescados', 'Filete de claria 5 lb', NULL),
    ('Embutidos', 'Salchichas de pollo 10 unidades', NULL),
    ('Embutidos', 'Jamón Viking 1 lb', NULL),
    ('Embutidos', 'Jamonada 1 lb', NULL),
    ('Huevos, arroz y granos', 'Cartón de huevos 30 unidades', 11.00),
    ('Huevos, arroz y granos', 'Saco de arroz 50 lb', 35.00),
    ('Huevos, arroz y granos', 'Saco de azúcar 55 lb', 45.00),
    ('Huevos, arroz y granos', 'Saco de azúcar 10 kg', 23.00),
    ('Huevos, arroz y granos', 'Bolsa de frijoles negros 10 lb', 12.00),
    ('Huevos, arroz y granos', 'Bolsa de frijoles colorados 10 lb', 12.00),
    ('Huevos, arroz y granos', 'Bolsa de sal 5 lb', NULL),
    ('Café, pastas y lácteos', 'Café El Expreso (paquete)', 6.50),
    ('Café, pastas y lácteos', 'Café (paquete)', 4.50),
    ('Café, pastas y lácteos', 'Coditos (paquete)', 1.75),
    ('Café, pastas y lácteos', 'Espaguetis (paquete)', 1.70),
    ('Café, pastas y lácteos', 'Leche en polvo 1 kg', 11.00),
    ('Aseo y limpieza', 'Jabón de baño', 0.90),
    ('Aseo y limpieza', 'Detergente', 2.70),
    ('Helados, yogures y congelados', 'Helado Fresko Producer (cubeta; sabor por confirmar)', 11.00),
    ('Helados, yogures y congelados', 'Yogur Fresko Producer (cubeta; sabor por confirmar)', 10.00),
    ('Helados, yogures y congelados', 'Croquetas de pollo 50 unidades', 4.00),
    ('Bebidas', 'Cerveza Holandia (caja)', 22.00),
    ('Bebidas', 'Cerveza Cristal (caja)', 25.00),
    ('Bebidas', 'Cerveza Mayabe (caja)', 25.00),
    ('Bebidas', 'Cerveza Bucanero (caja)', 25.00),
    ('Bebidas', 'Jugos (caja de 24 unidades)', 19.00),
    ('Bebidas', 'Malta (caja)', 25.00),
    ('Bebidas', 'Refresco de limón (caja)', 24.00),
    ('Bebidas', 'Refresco de cola (caja)', 24.00),
    ('Bebidas', 'Refresco de naranja (caja)', 23.00),
    ('Bebidas', 'Refresco sabor mate (blíster de 6 pomos)', 14.00),
    ('Bebidas', 'Refresco sabor limón (blíster de 6 pomos)', 14.00),
    ('Bebidas', 'Refresco sabor naranja (blíster de 6 pomos)', 14.00),
    ('Licores', 'Whisky Chanceler (botella)', NULL)
    ) AS p(category, name, confirmed_price)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE store_id = v_store_id AND lower(name) = lower(v_product.name) AND deleted_at IS NULL) THEN
      INSERT INTO public.products (store_id, name, category, description, price, stock, image_url, is_active, tag)
      VALUES (v_store_id, v_product.name, v_product.category,
        CASE WHEN v_product.confirmed_price IS NULL THEN 'Precio pendiente de confirmar.' ELSE 'Presentación indicada en el nombre. Disponibilidad por confirmar.' END,
        coalesce(v_product.confirmed_price, 0), 0, NULL, false,
        CASE WHEN v_product.confirmed_price IS NULL THEN 'Precio pendiente' ELSE NULL END);
    END IF;
  END LOOP;
END;
$seed$;
COMMIT;

-- Comprobación tras ejecutar:
-- SELECT category, count(*) FROM public.products WHERE store_id =
-- (SELECT id FROM public.stores WHERE subdomain='combos-martinez') GROUP BY category ORDER BY category;
