import { supabaseAdmin as db } from "@/lib/supabase-admin";
import { z } from "zod";
import { resolveStoreByHost } from "@/lib/saas/store-metadata";
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
  return [...latest.values()].filter(row => !published || row.configuration.active !== false)
    .sort((a, b) => (a.configuration.sortOrder || 0) - (b.configuration.sortOrder || 0));
}

export const response = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });


export async function procedurePublicStore(request: Request) {
  const tenant = await resolveStoreByHost(new URL(request.url).host) || await publicStore(request);
  if (!tenant) return null;
  const { data } = await db.from("stores").select("id,name")
    .eq("id", tenant.id).eq("is_active", true).eq("module_procedures_enabled", true)
    .eq("procedures_public_enabled", true).maybeSingle();
  return data;
}

export async function procedureStaff(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return null;
  const { data: auth } = await db.auth.getUser(token);
  if (!auth.user) return null;
  const { data: profile } = await db.from("profiles").select("active,role")
    .eq("id", auth.user.id).eq("active", true).maybeSingle();
  if (!profile) return null;
  const requested = request.headers.get("x-store-id");
  if (requested && !z.uuid().safeParse(requested).success) return null;
  let membershipQuery = db.from("store_users").select("store_id,role")
    .eq("user_id", auth.user.id).eq("active", true);
  if (requested) membershipQuery = membershipQuery.eq("store_id", requested);
  const { data: memberships, error } = await membershipQuery;
  if (error) return null;
  // Ambiguous membership requires an explicit, authorized store selection.
  const membership = memberships?.length === 1 ? memberships[0] : null;
  const storeId = profile.role === "super_admin" && requested ? requested : membership?.store_id;
  if (!storeId) return null;
  const role = String(membership?.role || "").toUpperCase();
  if (profile.role !== "super_admin" && !["OWNER", "ADMIN", "OPERATIONS"].includes(role)) return null;
  const { data: store } = await db.from("stores").select("id,slug,name,primary_color")
    .eq("id", storeId).eq("is_active", true).eq("module_procedures_enabled", true).maybeSingle();
  if (!store) return null;
  return { id: auth.user.id, store: store.id, slug: store.slug, name: store.name,
    color: store.primary_color, supervisor: profile.role === "super_admin" || role !== "OPERATIONS" };
}
