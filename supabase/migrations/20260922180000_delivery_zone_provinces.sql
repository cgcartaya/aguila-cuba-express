ALTER TABLE public.delivery_zones ADD COLUMN IF NOT EXISTS province text NOT NULL DEFAULT 'Cienfuegos';
CREATE INDEX IF NOT EXISTS delivery_zones_store_province_municipality_idx ON public.delivery_zones (store_id, province, municipality);
