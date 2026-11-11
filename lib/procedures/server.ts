import { supabaseAdmin as db } from "@/lib/supabase-admin";
import { normalizeStoreHost } from "@/lib/saas/store-metadata";
import type { CatalogEntry } from "./catalog";

export const wfSlug = "wf-cago";

export async function wfStore() {
  const { data } = await db.from("stores").select("id,domain").eq("slug", wfSlug)
    .eq("is_active", true).maybeSingle();
  return data;
}

export async function publicStore(request: Request) {
  const store = await wfStore();
  const host = normalizeStoreHost(new URL(request.url).host);
  if (!store || !host) return null;
  return host === "wf-cargo.perlamarketplace.com" ||
    (store.domain && host === normalizeStoreHost(store.domain)) ? store : null;
}

export async function staff(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return null;
  const [{ data: auth }, store] = await Promise.all([db.auth.getUser(token), wfStore()]);
  if (!auth.user || !store) return null;
  const [{ data: profile }, { data: membership }] = await Promise.all([
    db.from("profiles").select("active").eq("id", auth.user.id).eq("active", true).maybeSingle(),
    db.from("store_users").select("role").eq("store_id", store.id).eq("user_id", auth.user.id)
      .eq("active", true).maybeSingle(),
  ]);
  if (!profile || !membership) return null;
  const role = String(membership.role).toUpperCase();
  if (!["OWNER", "ADMIN", "OPERATIONS"].includes(role)) return null;
  return { id: auth.user.id, store: store.id, supervisor: role !== "OPERATIONS" };
}

export async function catalog(store: string, published: boolean) {
  let query = db.from("procedure_catalog").select("service,version,configuration,published_at")
    .eq("store_id", store).order("version", { ascending: false });
  if (published) query = query.not("published_at", "is", null);
  const { data, error } = await query;
  if (error) throw error;
  const latest = new Map<string, CatalogEntry & { published_at: string | null }>();
  for (const row of data) if (!latest.has(row.service)) latest.set(row.service, row);
  return [...latest.values()];
}

export const response = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
