-- Deploy explicit browser projections before restricting SELECT columns.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DROP POLICY IF EXISTS "Allow authenticated users to insert stores" ON public.stores;
DROP POLICY IF EXISTS "Allow authenticated users to update stores" ON public.stores;
-- Existing stores_write_super_only continues to authorize SaaS administrators.
CREATE POLICY stores_owner_economy_update ON public.stores
  FOR UPDATE TO authenticated
  USING (public.has_store_role(id, ARRAY['OWNER','ADMIN']::text[]))
  WITH CHECK (public.has_store_role(id, ARRAY['OWNER','ADMIN']::text[]));

-- Owners may save Economy preferences, but cannot change plans, modules,
-- payment credentials, fees, tenant identity or other SaaS-managed fields.
CREATE OR REPLACE FUNCTION public.phase1_guard_store_owner_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF current_user IN ('postgres','service_role','supabase_admin')
     OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;
  IF NOT public.has_store_role(OLD.id, ARRAY['OWNER','ADMIN']::text[])
     OR (to_jsonb(NEW) - ARRAY['economy_currency','economy_target_margin','updated_at']::text[])
        IS DISTINCT FROM
        (to_jsonb(OLD) - ARRAY['economy_currency','economy_target_margin','updated_at']::text[]) THEN
    RAISE EXCEPTION 'Solo se permite actualizar moneda y margen de la propia tienda'
      USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.phase1_guard_store_owner_update() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER phase1_guard_store_owner_update
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.phase1_guard_store_owner_update();

DROP POLICY IF EXISTS app_users_read_temp ON public.app_users;
DROP POLICY IF EXISTS app_users_write_store_access ON public.app_users;
CREATE POLICY app_users_member_read ON public.app_users FOR SELECT TO authenticated
 USING (public.has_store_access(store_id));
CREATE POLICY app_users_admin_insert ON public.app_users FOR INSERT TO authenticated
 WITH CHECK (public.has_store_role(store_id, ARRAY['OWNER','ADMIN']::text[]));
CREATE POLICY app_users_admin_update ON public.app_users FOR UPDATE TO authenticated
 USING (public.has_store_role(store_id, ARRAY['OWNER','ADMIN']::text[]))
 WITH CHECK (public.has_store_role(store_id, ARRAY['OWNER','ADMIN']::text[]));
CREATE POLICY app_users_admin_delete ON public.app_users FOR DELETE TO authenticated
 USING (public.has_store_role(store_id, ARRAY['OWNER','ADMIN']::text[]));

DROP POLICY IF EXISTS authenticated_staff_crud ON public.staff_users;
CREATE POLICY staff_users_member_read ON public.staff_users FOR SELECT TO authenticated
 USING (public.has_store_access(store_id));
CREATE POLICY staff_users_admin_insert ON public.staff_users FOR INSERT TO authenticated
 WITH CHECK (public.has_store_role(store_id, ARRAY['OWNER','ADMIN']::text[]));
CREATE POLICY staff_users_admin_update ON public.staff_users FOR UPDATE TO authenticated
 USING (public.has_store_role(store_id, ARRAY['OWNER','ADMIN']::text[]))
 WITH CHECK (public.has_store_role(store_id, ARRAY['OWNER','ADMIN']::text[]));
CREATE POLICY staff_users_admin_delete ON public.staff_users FOR DELETE TO authenticated
 USING (public.has_store_role(store_id, ARRAY['OWNER','ADMIN']::text[]));

-- Table SELECT overrides per-column revokes, so remove both forms first.
REVOKE SELECT ON public.stores, public.app_users, public.staff_users FROM PUBLIC, anon, authenticated;
DO $$
DECLARE t text; cols text; secret text;
BEGIN
  FOREACH t IN ARRAY ARRAY['stores','app_users','staff_users'] LOOP
    FOR secret IN SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t
        AND column_name = ANY(ARRAY['stripe_direct_secret_key','stripe_direct_webhook_secret','password_hash'])
    LOOP
      EXECUTE format('REVOKE SELECT (%I) ON public.%I FROM PUBLIC, anon, authenticated', secret, t);
    END LOOP;
    SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position) INTO cols
    FROM information_schema.columns WHERE table_schema='public' AND table_name=t
      AND column_name <> ALL(ARRAY['stripe_direct_secret_key','stripe_direct_webhook_secret','password_hash']);
    EXECUTE format('GRANT SELECT (%s) ON public.%I TO authenticated', cols, t);
    IF t='stores' THEN
      EXECUTE format('GRANT SELECT (%s) ON public.%I TO anon', cols, t);
    END IF;
  END LOOP;
END;
$$;
COMMIT;
