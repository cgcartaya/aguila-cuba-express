ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS delivery_provinces text[];
