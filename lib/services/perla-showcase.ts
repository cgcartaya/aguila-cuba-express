import { publicSupabase } from "@/lib/supabase-public";
import { getStorePublicBaseUrl } from "@/lib/saas/store-metadata";

export type PerlaClient = { id: string; slug?: string; name: string; url: string; logo: string | null; modules: string[] };

export async function getPerlaShowcase(): Promise<PerlaClient[]> {
  const { data: visible, error: visibilityError } = await publicSupabase
    .from("perla_client_showcase").select("store_id").eq("enabled", true);
  if (visibilityError) { console.error("Perla showcase visibility unavailable", visibilityError); return []; }
  if (!visible?.length) return [];
  const { data, error } = await publicSupabase.from("stores")
    .select("id,name,slug,domain,subdomain,logo_url,module_store_enabled,module_menu_enabled,module_shipping_enabled")
    .eq("is_active", true).in("id", visible.map(row => row.store_id)).order("name");
  if (error) { console.error("Perla showcase clients unavailable", error); return []; }
  return (data || []).map(store => ({
    id: store.id, slug: store.slug, name: store.name, url: getStorePublicBaseUrl(store), logo: store.logo_url,
    modules: [store.module_store_enabled && "Tienda online", store.module_menu_enabled && "Menú digital", store.module_shipping_enabled && "Envíos"].filter(Boolean) as string[],
  }));
}
