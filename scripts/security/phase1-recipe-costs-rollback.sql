-- Emergency only: restores the previous public definer view.
BEGIN;
ALTER VIEW public.restaurant_recipe_costs RESET (security_invoker);
GRANT SELECT ON public.restaurant_recipe_costs TO anon;
DROP POLICY IF EXISTS menu_items_super_admin_read ON public.menu_items;
COMMIT;
