import { normalizeStoreHost, resolveStoreByHost, resolveStoreBySlug } from "@/lib/saas/store-metadata";

/** Explicit slug wins on shared URLs; unknown hosts never resolve to another tenant. */
export async function resolvePublicStore(slug: string, host: string) {
  const cleanSlug = slug.trim().toLowerCase();
  if (cleanSlug) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSlug)) return null;
    return resolveStoreBySlug(cleanSlug);
  }
  return resolveStoreByHost(normalizeStoreHost(host));
}
