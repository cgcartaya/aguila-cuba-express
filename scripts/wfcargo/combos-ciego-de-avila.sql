-- Fuente: https://cubatexmultiservices.com/combos-de-alimentos/
INSERT INTO public.products (
  store_id, name, price, category, description, image_url, stock, is_active,
  combo_only, platform_fee_exempt, delivery_included, delivery_provinces
)
SELECT store.id, 'Combo #5 · Ciego de Ávila', 106 + 5, 'Combos',
  '5 lb de cerdo, 5 lb de muslos de pollo, 250 g de picadillo de res, un cartón de huevos, 1 kg de preparado de leche en polvo, 3 kg de arroz, 3 lb de frijoles negros, 900 ml de aceite de soya, 1 kg de azúcar, 1 kg de sal y 250 g de café. Entrega solo en el municipio Ciego de Ávila. Domicilio: $5 USD una sola vez por pedido.',
  '/wfcargo/combos/ciego-de-avila/combo-5.jpg', 1000, true,
  false, true, false, ARRAY['Ciego de Ávila']::text[]
FROM public.stores store
WHERE store.slug = 'wf-cago'
  AND NOT EXISTS (
    SELECT 1 FROM public.products existing
    WHERE existing.store_id = store.id
      AND existing.image_url = '/wfcargo/combos/ciego-de-avila/combo-5.jpg'
      AND existing.deleted_at IS NULL
  );
