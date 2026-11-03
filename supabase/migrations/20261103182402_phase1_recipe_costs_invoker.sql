BEGIN;
SET LOCAL lock_timeout='5s';
ALTER VIEW public.restaurant_recipe_costs SET (security_invoker=true);
REVOKE SELECT ON public.restaurant_recipe_costs FROM PUBLIC, anon;
CREATE POLICY menu_items_super_admin_read ON public.menu_items
 FOR SELECT TO authenticated USING ((SELECT public.is_super_admin()));
COMMIT;
