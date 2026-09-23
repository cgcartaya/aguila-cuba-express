-- Marketing comercial: tres funciones independientes, desactivadas por defecto.
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS module_marketing_posts_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS module_marketing_catalogs_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS module_marketing_analytics_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.marketing_commercial_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('post','catalog')),
  title text NOT NULL,
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  image_path text,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS marketing_commercial_assets_store_idx ON public.marketing_commercial_assets(store_id,created_at DESC);
ALTER TABLE public.marketing_commercial_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "marketing assets store members read" ON public.marketing_commercial_assets FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.active=true AND p.role='super_admin')
 OR EXISTS (SELECT 1 FROM public.store_users su WHERE su.user_id=auth.uid() AND su.store_id=marketing_commercial_assets.store_id AND su.active=true));
CREATE POLICY "marketing assets store members write" ON public.marketing_commercial_assets FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.active=true AND p.role='super_admin')
 OR EXISTS (SELECT 1 FROM public.store_users su WHERE su.user_id=auth.uid() AND su.store_id=marketing_commercial_assets.store_id AND su.active=true))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.active=true AND p.role='super_admin')
 OR EXISTS (SELECT 1 FROM public.store_users su WHERE su.user_id=auth.uid() AND su.store_id=marketing_commercial_assets.store_id AND su.active=true));
