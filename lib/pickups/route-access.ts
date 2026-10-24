import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function requirePickupRouteWrite(request: NextRequest, storeId: string) {
  const fail = (error: string, status: number) => NextResponse.json({ error }, { status });
  if (!/^[a-f0-9-]{36}$/i.test(storeId)) return fail("Tienda inválida.", 400);
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return fail("Inicia sesión para administrar rutas.", 401);
  const { data: auth } = await supabaseAdmin.auth.getUser(token);
  if (!auth.user) return fail("Sesión inválida.", 401);
  const [{ data: profile }, { data: store }] = await Promise.all([
    supabaseAdmin.from("profiles").select("active,role").eq("id", auth.user.id).maybeSingle(),
    supabaseAdmin.from("stores").select("is_active,module_pickups_enabled").eq("id", storeId).maybeSingle(),
  ]);
  if (!profile?.active) return fail("Usuario inactivo.", 403);
  if (!store?.is_active || !store.module_pickups_enabled) return fail("Recogidas no disponibles para esta tienda.", 403);
  if (profile.role === "super_admin") return null;
  const { data: member } = await supabaseAdmin.from("store_users").select("role").eq("store_id", storeId).eq("user_id", auth.user.id).eq("active", true).maybeSingle();
  if (!member || !["OWNER", "ADMIN", "OPERATIONS", "DISPATCHER"].includes(String(member.role).toUpperCase())) {
    return fail("No tienes permiso para administrar estas rutas.", 403);
  }
  return null;
}
