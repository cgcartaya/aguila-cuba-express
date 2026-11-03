import type { SupabaseClient } from "@supabase/supabase-js";
import { publicSupabase } from "@/lib/supabase-public";
import { storeBranding, type BrandingStore, type BrandingSettings } from "@/lib/saas/store-branding";

/** Fetch an explicit tenant; no host, session, localStorage or default-store fallback. */
export async function getPublicStoreBranding(storeId?: string | null, client: SupabaseClient = publicSupabase) {
  if (!storeId) return storeBranding();
  const [store, settings] = await Promise.all([
    client.from("stores").select("id,name,slug,domain,subdomain,logo_url,has_landing,module_store_enabled").eq("id", storeId).maybeSingle(),
    client.from("store_settings").select("store_name,logo_url,whatsapp").eq("store_id", storeId).maybeSingle(),
  ]);
  // Do not display stale settings when the owning store cannot be resolved.
  if (!store.data) return storeBranding();
  return storeBranding(store.data as BrandingStore, settings.data as BrandingSettings | null);
}
