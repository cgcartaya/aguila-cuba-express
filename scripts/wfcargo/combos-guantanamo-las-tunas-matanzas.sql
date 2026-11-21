-- Fuente: https://cubatexmultiservices.com/combos-de-alimentos/
-- Nuevas ofertas activas con inventario inicial. Reejecutar conserva las existencias.
BEGIN;

INSERT INTO public.products (
  store_id, name, price, category, description, image_url, stock, is_active,
  combo_only, platform_fee_exempt, delivery_included, delivery_provinces
)
SELECT store.id, offer.name, offer.supplier_price + 5, 'Combos',
  offer.contents || ' Entrega solo en el municipio ' || offer.city || '. Domicilio: $5 USD una sola vez por pedido.',
  offer.image_url, 1000, true, false, true, false, ARRAY[offer.province]::text[]
FROM public.stores store
CROSS JOIN (VALUES
    ('Súper Combo #1 · Guantánamo', 190, '/wfcargo/combos/guantanamo/super-combo-1.jpg', 'Guantánamo', 'Guantánamo', 'Consulta los productos y cantidades en la foto.'),
    ('Súper Combo #2 · Guantánamo', 170, '/wfcargo/combos/guantanamo/super-combo-2.jpg', 'Guantánamo', 'Guantánamo', 'Consulta los productos y cantidades en la foto.'),
    ('Súper Combo #3 · Guantánamo', 150, '/wfcargo/combos/guantanamo/super-combo-3.jpg', 'Guantánamo', 'Guantánamo', 'Consulta los productos y cantidades en la foto.'),
    ('Súper Combo #4 · Guantánamo', 130, '/wfcargo/combos/guantanamo/super-combo-4.jpg', 'Guantánamo', 'Guantánamo', 'Consulta los productos y cantidades en la foto.'),
    ('Súper Combo #5 · Guantánamo', 90, '/wfcargo/combos/guantanamo/super-combo-5.jpg', 'Guantánamo', 'Guantánamo', 'Consulta los productos y cantidades en la foto.'),
    ('Súper Combo #6 · Guantánamo', 60, '/wfcargo/combos/guantanamo/super-combo-6.jpg', 'Guantánamo', 'Guantánamo', 'Consulta los productos y cantidades en la foto.'),
    ('Combo aseo #1 · Guantánamo', 80, '/wfcargo/combos/guantanamo/combo-aseo-1.jpg', 'Guantánamo', 'Guantánamo', 'Consulta los productos y cantidades en la foto.'),
    ('Combo aseo #2 · Guantánamo', 60, '/wfcargo/combos/guantanamo/combo-aseo-2.jpg', 'Guantánamo', 'Guantánamo', 'Consulta los productos y cantidades en la foto.'),
    ('Combo Cárnico #1 · Guantánamo', 100, '/wfcargo/combos/guantanamo/combo-carnico-1.jpg', 'Guantánamo', 'Guantánamo', 'Consulta los productos y cantidades en la foto.'),
    ('Combo Cárnico #2 · Guantánamo', 85, '/wfcargo/combos/guantanamo/combo-carnico-2.jpg', 'Guantánamo', 'Guantánamo', 'Consulta los productos y cantidades en la foto.'),
    ('Combo Chuche #1 · Guantánamo', 80, '/wfcargo/combos/guantanamo/combo-chuche-1.jpg', 'Guantánamo', 'Guantánamo', 'Consulta los productos y cantidades en la foto.'),
    ('Combo Chuche #2 · Guantánamo', 60, '/wfcargo/combos/guantanamo/combo-chuche-2.jpg', 'Guantánamo', 'Guantánamo', 'Consulta los productos y cantidades en la foto.'),
    ('Combo desayuno #1 · Guantánamo', 90, '/wfcargo/combos/guantanamo/combo-desayuno-1.jpg', 'Guantánamo', 'Guantánamo', 'Consulta los productos y cantidades en la foto.'),
    ('Combo desayuno #2 · Guantánamo', 70, '/wfcargo/combos/guantanamo/combo-desayuno-2.jpg', 'Guantánamo', 'Guantánamo', 'Consulta los productos y cantidades en la foto.'),
    ('Combo Fiesta #1 · Guantánamo', 120, '/wfcargo/combos/guantanamo/combo-fiesta-1.jpg', 'Guantánamo', 'Guantánamo', 'Consulta los productos y cantidades en la foto.'),
    ('Combo Fiesta #2 · Guantánamo', 85, '/wfcargo/combos/guantanamo/combo-fiesta-2.jpg', 'Guantánamo', 'Guantánamo', 'Consulta los productos y cantidades en la foto.'),
    ('Combo Cárnico #2 · Las Tunas', 100, '/wfcargo/combos/las-tunas/combo-carnico-2.jpg', 'Las Tunas', 'Las Tunas', 'Consulta los productos y cantidades en la foto.'),
    ('Combo Cárnico #1 · Las Tunas', 110, '/wfcargo/combos/las-tunas/combo-carnico-1.jpg', 'Las Tunas', 'Las Tunas', 'Consulta los productos y cantidades en la foto.'),
    ('Súper Combo #3 · Las Tunas', 165, '/wfcargo/combos/las-tunas/super-combo-3.jpg', 'Las Tunas', 'Las Tunas', 'Consulta los productos y cantidades en la foto.'),
    ('Súper Combo #6 · Las Tunas', 105, '/wfcargo/combos/las-tunas/super-combo-6.jpg', 'Las Tunas', 'Las Tunas', 'Consulta los productos y cantidades en la foto.'),
    ('Súper Combo #5 · Las Tunas', 115, '/wfcargo/combos/las-tunas/super-combo-5.jpg', 'Las Tunas', 'Las Tunas', 'Consulta los productos y cantidades en la foto.'),
    ('Súper Combo #2 · Las Tunas', 190, '/wfcargo/combos/las-tunas/super-combo-2.jpg', 'Las Tunas', 'Las Tunas', 'Consulta los productos y cantidades en la foto.'),
    ('Combo Fiesta #2 · Las Tunas', 95, '/wfcargo/combos/las-tunas/combo-fiesta-2.jpg', 'Las Tunas', 'Las Tunas', 'Consulta los productos y cantidades en la foto.'),
    ('Súper Combo #4 · Las Tunas', 145, '/wfcargo/combos/las-tunas/super-combo-4.jpg', 'Las Tunas', 'Las Tunas', 'Consulta los productos y cantidades en la foto.'),
    ('Combo Fiesta #1 · Las Tunas', 120, '/wfcargo/combos/las-tunas/combo-fiesta-1.jpg', 'Las Tunas', 'Las Tunas', 'Consulta los productos y cantidades en la foto.'),
    ('Súper Combo #1 · Las Tunas', 210, '/wfcargo/combos/las-tunas/super-combo-1.jpg', 'Las Tunas', 'Las Tunas', 'Consulta los productos y cantidades en la foto.'),
    ('Súper Combo #1 · Matanzas', 220, '/wfcargo/combos/matanzas/super-combo-1.jpg', 'Matanzas', 'Matanzas', 'Consulta los productos y cantidades en la foto.'),
    ('Súper Combo #6 · Matanzas', 105, '/wfcargo/combos/matanzas/super-combo-6.jpg', 'Matanzas', 'Matanzas', 'Consulta los productos y cantidades en la foto.'),
    ('Súper Combo #2 · Matanzas', 200, '/wfcargo/combos/matanzas/super-combo-2.jpg', 'Matanzas', 'Matanzas', 'Consulta los productos y cantidades en la foto.'),
    ('Súper Combo #5 · Matanzas', 110, '/wfcargo/combos/matanzas/super-combo-5.jpg', 'Matanzas', 'Matanzas', 'Consulta los productos y cantidades en la foto.'),
    ('Súper Combo #4 · Matanzas', 140, '/wfcargo/combos/matanzas/super-combo-4.jpg', 'Matanzas', 'Matanzas', 'Consulta los productos y cantidades en la foto.'),
    ('Súper Combo #3 · Matanzas', 170, '/wfcargo/combos/matanzas/super-combo-3.jpg', 'Matanzas', 'Matanzas', 'Consulta los productos y cantidades en la foto.')
) AS offer(name, supplier_price, image_url, province, city, contents)
WHERE store.slug = 'wf-cago'
  AND NOT EXISTS (
    SELECT 1 FROM public.products existing
    WHERE existing.store_id = store.id AND existing.image_url = offer.image_url
      AND existing.deleted_at IS NULL
  );

COMMIT;
