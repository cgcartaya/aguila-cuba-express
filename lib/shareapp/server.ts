import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin as db } from "@/lib/supabase-admin";
import { cookieName, verifyReceipt, UUID } from "./core";

export { db };
export const fail = (error: string, status = 400) =>
  NextResponse.json(
    { error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
export const json = (data: unknown) =>
  NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
export const secret = () =>
  process.env.SHAREAPP_ATTRIBUTION_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY!;
export class AccessError extends Error {
  constructor(
    message: string,
    public status = 403,
  ) {
    super(message);
  }
}
export function errorResponse(error: unknown) {
  if (error instanceof AccessError) return fail(error.message, error.status);
  console.error("ShareAPP:", error);
  return fail(
    "No se pudo completar la operación de ShareAPP. Comprueba que el módulo esté instalado.",
    500,
  );
}
export async function user(request: NextRequest) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!token) throw new AccessError("Inicia sesión para continuar.", 401);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new AccessError("La sesión ha caducado.", 401);
  // Gestores can have an auth account without an administrative profile.
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("role,active")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profileError) throw profileError;
  if (profile && !profile.active) throw new AccessError("Usuario inactivo.");
  return { id: data.user.id, superAdmin: profile?.role === "super_admin" };
}
export async function owner(request: NextRequest, storeId: string) {
  if (!UUID.test(storeId)) throw new AccessError("Tienda inválida.", 400);
  const actor = await user(request);
  if (!actor.superAdmin) {
    const { data, error } = await db
      .from("store_users")
      .select("role")
      .eq("store_id", storeId)
      .eq("user_id", actor.id)
      .eq("active", true)
      .maybeSingle();
    if (error) throw error;
    if (!data || !["OWNER", "ADMIN"].includes(String(data.role).toUpperCase()))
      throw new AccessError(
        "Solo el dueño o administrador puede gestionar este módulo.",
      );
  }
  return actor;
}
export async function settings(storeId: string) {
  const { data, error } = await db
    .from("shareapp_settings")
    .select("enabled,attribution_days")
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) throw error;
  return data || { enabled: false, attribution_days: 7 };
}
export async function member(request: NextRequest, storeId: string) {
  if (!UUID.test(storeId)) throw new AccessError("Tienda inválida.", 400);
  const actor = await user(request);
  const { data, error } = await db
    .from("shareapp_members")
    .select("id,store_id,display_name")
    .eq("store_id", storeId)
    .eq("user_id", actor.id)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  const { data: store, error: storeError } = await db
    .from("stores")
    .select(
      "id,slug,name,domain,subdomain,has_landing,is_active,module_store_enabled",
    )
    .eq("id", storeId)
    .maybeSingle();
  if (storeError) throw storeError;
  if (
    !data ||
    !store?.is_active ||
    !store.module_store_enabled ||
    !(await settings(storeId)).enabled
  )
    throw new AccessError(
      "No tienes autorización activa para promocionar esta tienda.",
    );
  return { ...data, store };
}
export async function resolveReceipt(storeId: string) {
  const cookie = (await cookies()).get(cookieName(storeId))?.value;
  if (!cookie) return null; // Existing checkouts never require the new schema.
  const config = await settings(storeId);
  if (!config.enabled) return null;
  const receipt = verifyReceipt(
    cookie,
    storeId,
    secret(),
    config.attribution_days,
  );
  if (!receipt) return null;
  const { data: link, error } = await db
    .from("shareapp_links")
    .select("id,member_id,active")
    .eq("id", receipt.linkId)
    .eq("store_id", storeId)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  if (!link) return null;
  const { data: promoter, error: memberError } = await db
    .from("shareapp_members")
    .select("id")
    .eq("id", link.member_id)
    .eq("store_id", storeId)
    .eq("active", true)
    .not("user_id", "is", null)
    .maybeSingle();
  if (memberError) throw memberError;
  return promoter ? { ...receipt, memberId: promoter.id } : null;
}
export async function attributeOrder(orderId: string, storeId: string) {
  try {
    const receipt = await resolveReceipt(storeId);
    if (!receipt) return;
    const { error } = await db.from("shareapp_order_attributions").insert({
      order_id: orderId,
      store_id: storeId,
      member_id: receipt.memberId,
      link_id: receipt.linkId,
      visit_id: receipt.visitId,
      referred_at: new Date(receipt.issuedAt).toISOString(),
    });
    if (error) throw error;
  } catch (error) {
    console.error("No se pudo atribuir el pedido ShareAPP:", error);
  }
}
