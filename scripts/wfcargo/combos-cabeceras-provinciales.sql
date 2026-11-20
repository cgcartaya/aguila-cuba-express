-- Fuente: https://cubatexmultiservices.com/combos-de-alimentos/
-- Importar como borradores de WF Cargo. Confirmar existencias para activarlos.
BEGIN;

INSERT INTO public.products (
  store_id, name, price, category, description, image_url, stock, is_active,
  combo_only, platform_fee_exempt, delivery_included, delivery_provinces
)
SELECT store.id, offer.name, offer.supplier_price + 5, 'Combos',
  'Consulta el contenido y las cantidades en la foto. Entrega solo en el municipio '
    || offer.province || '. Domicilio: $5 USD una sola vez por pedido.',
  offer.image_url, 0, false, false, true, false, ARRAY[offer.province]::text[]
FROM public.stores store
CROSS JOIN (VALUES
    ('Combo Cárnico #2 · Pinar del Río', 145, '/wfcargo/combos/pinar-del-rio/carnico-2.jpg', 'Pinar del Río'),
    ('Combo Cárnico #1 · Pinar del Río', 160, '/wfcargo/combos/pinar-del-rio/carnico-1.jpg', 'Pinar del Río'),
    ('Combo #5 · Pinar del Río', 120, '/wfcargo/combos/pinar-del-rio/combo-5.jpg', 'Pinar del Río'),
    ('Combo #6 · Pinar del Río', 105, '/wfcargo/combos/pinar-del-rio/combo-6.jpg', 'Pinar del Río'),
    ('Super Combo #3 · Pinar del Río', 180, '/wfcargo/combos/pinar-del-rio/super-3.jpg', 'Pinar del Río'),
    ('Super Combo #4 · Pinar del Río', 145, '/wfcargo/combos/pinar-del-rio/super-4.jpg', 'Pinar del Río'),
    ('Super Combo #2 · Pinar del Río', 200, '/wfcargo/combos/pinar-del-rio/super-2.jpg', 'Pinar del Río'),
    ('Super Combo #1 · Pinar del Río', 220, '/wfcargo/combos/pinar-del-rio/super-1.jpg', 'Pinar del Río'),
    ('Super Combo #6 · Cienfuegos', 105, '/wfcargo/combos/cienfuegos/super-6.jpg', 'Cienfuegos'),
    ('Super Combo #5 · Cienfuegos', 110, '/wfcargo/combos/cienfuegos/super-5.jpg', 'Cienfuegos'),
    ('Super Combo #4 · Cienfuegos', 140, '/wfcargo/combos/cienfuegos/super-4.jpg', 'Cienfuegos'),
    ('Super Combo #3 · Cienfuegos', 170, '/wfcargo/combos/cienfuegos/super-3.jpg', 'Cienfuegos'),
    ('Super Combo #2 · Cienfuegos', 200, '/wfcargo/combos/cienfuegos/super-2.jpg', 'Cienfuegos'),
    ('Super Combo #1 · Cienfuegos', 220, '/wfcargo/combos/cienfuegos/super-1.jpg', 'Cienfuegos')
) AS offer(name, supplier_price, image_url, province)
WHERE store.slug = 'wf-cago'
  AND NOT EXISTS (
    SELECT 1 FROM public.products existing
    WHERE existing.store_id = store.id AND existing.image_url = offer.image_url
      AND existing.deleted_at IS NULL
  );

COMMIT;
