import { supabaseAdmin as db } from "@/lib/supabase-admin";
import { storeModuleStaff, wfSlug } from "@/lib/procedures/server";
import { normalizeStoreHost, resolveStoreByHost } from "@/lib/saas/store-metadata";
import { isWfCargoHost } from "@/lib/saas/wfcargo-hosts";

export async function resolveLockerStore(rawHost: string) {
  const host = normalizeStoreHost(rawHost);
  const fields = "id,slug,name,logo_url,domain,subdomain,locker_receiving_address,locker_whatsapp";
  const query = db.from("stores").select(fields)
    .eq("is_active", true).eq("module_lockers_enabled", true);
  if (isWfCargoHost(host)) {
    const { data } = await query.eq("slug", wfSlug).maybeSingle();
    return data;
  }
  const tenant = await resolveStoreByHost(host);
  if (!tenant) return null;
  const { data } = await query.eq("id", tenant.id).maybeSingle();
  return data;
}

export function lockerStaff(request: Request) {
  return storeModuleStaff(request, "module_lockers_enabled");
}

export function lockerRegistration(slug: string) {
  return slug === wfSlug
    ? { code: "WF", rules_version: "WF-2026-11" }
    : { code: "CV", rules_version: "PERLA-2026-11" };
}
