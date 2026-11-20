-- Fuente: https://cubatexmultiservices.com/combos-de-alimentos/
-- Las fichas impresas solo identifican La Habana y anuncian transporte de USD 3.
-- Carga en borrador. Activar cuando se confirmen las existencias.
BEGIN;

INSERT INTO public.products (
  store_id, name, price, category, description, image_url, stock, is_active,
  combo_only, platform_fee_exempt, delivery_included, delivery_provinces
)
SELECT store.id, offer.name, offer.supplier_price + 5, 'Combos',
  offer.description, offer.image_url, 0, false, false, true, false,
  ARRAY['La Habana']::text[]
FROM public.stores store
CROSS JOIN (VALUES
    ('Combo Chuche #2', 96, '/wfcargo/combos/habana-domicilio/chuche-2.jpg', 'Leche condensada, helado Nestlé, malta, refresco, jugo, gelatina, caramelos, palmeritas, palomitas y galletas. Consulta las cantidades en la foto. Transporte de $3 USD a todos los municipios de La Habana. Se cobra una sola vez por pedido.'),
    ('Combo Fiesta #1', 128, '/wfcargo/combos/habana-domicilio/fiesta-1.jpg', 'Cake de chocolate, helado Nestlé, jamón, queso gouda, malta, vodka, palmeritas, palomitas y galletas. Consulta las cantidades en la foto. Transporte de $3 USD a todos los municipios de La Habana. Se cobra una sola vez por pedido.'),
    ('Combo Chuche #1', 115, '/wfcargo/combos/habana-domicilio/chuche-1.jpg', 'Leche condensada, helado Nestlé, malta, refresco, jugo, gelatina, caramelos, palmeritas, palomitas y galletas. Consulta las cantidades en la foto. Transporte de $3 USD a todos los municipios de La Habana. Se cobra una sola vez por pedido.'),
    ('Combo Fiesta #2', 110, '/wfcargo/combos/habana-domicilio/fiesta-2.jpg', 'Leche condensada, helado Nestlé, malta, refresco, jugo, gelatina, caramelos, palmeritas, palomitas y galletas. Consulta las cantidades en la foto. Transporte de $3 USD a todos los municipios de La Habana. Se cobra una sola vez por pedido.'),
    ('Combo Cárnico #2', 145, '/wfcargo/combos/habana-domicilio/carnico-2.jpg', 'Pernil, chuletas y costillas de cerdo, muslos de pollo, picadillo, jamón, carne de res, huevos, salchichas y jamonilla. Consulta las cantidades en la foto. Transporte de $3 USD a todos los municipios de La Habana. Se cobra una sola vez por pedido.'),
    ('Combo Cárnico #1', 160, '/wfcargo/combos/habana-domicilio/carnico-1.jpg', 'Pernil, chuletas y costillas de cerdo, muslos de pollo, atún, jamón, carne de res, huevos, picadillo, salchichas y jamonilla. Consulta las cantidades en la foto. Transporte de $3 USD a todos los municipios de La Habana. Se cobra una sola vez por pedido.'),
    ('Combo #6', 105, '/wfcargo/combos/habana-domicilio/combo-6.jpg', 'Lomo de cerdo, muslos de pollo, café, azúcar, leche, aceite, arroz, frijoles, picadillo, salchicha y huevos. Consulta las cantidades en la foto. Transporte de $3 USD a todos los municipios de La Habana. Se cobra una sola vez por pedido.'),
    ('Super Combo #4', 145, '/wfcargo/combos/habana-domicilio/super-4.jpg', 'Pernil, pollo, costillas, salchichas, picadillo, aceite, café, leche, jamonilla, pasta de tomate, espaguetis, arroz, frijoles, detergente, papel sanitario, azúcar, sal, sazón y huevos. Consulta las cantidades en la foto. Transporte de $3 USD a todos los municipios de La Habana. Se cobra una sola vez por pedido.'),
    ('Super Combo #3', 180, '/wfcargo/combos/habana-domicilio/super-3.jpg', 'Pernil, carne de res, pollo, costillas, salchichas, picadillo, aceite, café, leche, jamonilla, pasta de tomate, espaguetis, arroz, frijoles, detergente, papel sanitario, azúcar, sal, sazón, huevos y jugo. Consulta las cantidades en la foto. Transporte de $3 USD a todos los municipios de La Habana. Se cobra una sola vez por pedido.'),
    ('Super Combo #2', 200, '/wfcargo/combos/habana-domicilio/super-2.jpg', 'Pernil, carne de res, pollo, costillas, salchichas, picadillo, aceite, café, leche, jamonilla, pasta de tomate, espaguetis, arroz, frijoles, detergente, papel sanitario, azúcar, sal, sazón, huevos y jugo. Consulta las cantidades en la foto. Transporte de $3 USD a todos los municipios de La Habana. Se cobra una sola vez por pedido.'),
    ('Super Combo #1', 220, '/wfcargo/combos/habana-domicilio/super-1.jpg', 'Pernil, carne de res, pollo, masas de cerdo, salchichas, picadillo, aceite, café, leche, jamonilla, pasta de tomate, espaguetis, arroz, frijoles, detergente, papel sanitario, azúcar, sal, sazón, huevos y jugo. Consulta las cantidades en la foto. Transporte de $3 USD a todos los municipios de La Habana. Se cobra una sola vez por pedido.'),
    ('Combo #5', 120, '/wfcargo/combos/habana-domicilio/combo-5.jpg', 'Lomo de cerdo, muslos de pollo, café, azúcar, leche, aceite, arroz, frijoles, picadillo, salchicha y huevos. Consulta las cantidades en la foto. Transporte de $3 USD a todos los municipios de La Habana. Se cobra una sola vez por pedido.')
) AS offer(name, supplier_price, image_url, description)
WHERE store.slug = 'wf-cago'
  AND NOT EXISTS (
    SELECT 1 FROM public.products existing
    WHERE existing.store_id = store.id AND existing.image_url = offer.image_url
      AND existing.deleted_at IS NULL
  );

COMMIT;
