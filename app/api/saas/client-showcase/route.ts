import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
async function authorize(request: NextRequest) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return false;
  const { data: profile } = await supabaseAdmin.from("profiles").select("role,active").eq("id", data.user.id).maybeSingle();
  return profile?.active === true && profile.role === "super_admin";
}
export async function GET(request: NextRequest) {
  if (!await authorize(request)) return reply({ error: "Acceso exclusivo del superadministrador." }, 403);
  const storeId = request.nextUrl.searchParams.get("store_id") || "";
  if (!uuid.test(storeId)) return reply({ error: "Tienda inválida." }, 400);
  const { data, error } = await supabaseAdmin.from("perla_client_showcase").select("enabled").eq("store_id", storeId).maybeSingle();
  return error ? reply({ error: "No se pudo consultar la visibilidad." }, 500) : reply({ enabled: data?.enabled ?? false });
}
export async function PUT(request: NextRequest) {
  if (!await authorize(request)) return reply({ error: "Acceso exclusivo del superadministrador." }, 403);
  const body = await request.json().catch(() => null);
  if (!body || !uuid.test(String(body.store_id || "")) || typeof body.enabled !== "boolean") return reply({ error: "Datos inválidos." }, 400);
  const { data: store, error: storeError } = await supabaseAdmin.from("stores").select("id").eq("id", body.store_id).maybeSingle();
  if (storeError) return reply({ error: "No se pudo verificar la tienda." }, 500);
  if (!store) return reply({ error: "Tienda no encontrada." }, 404);
  const { error } = await supabaseAdmin.from("perla_client_showcase").upsert({ store_id: store.id, enabled: body.enabled, updated_at: new Date().toISOString() });
  return error ? reply({ error: "No se pudo guardar la visibilidad." }, 500) : reply({ enabled: body.enabled });
}
