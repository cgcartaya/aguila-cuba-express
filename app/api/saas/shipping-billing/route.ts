import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const reply = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function authorize(request: NextRequest) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  if (!data.user) return null;
  const { data: profile } = await supabaseAdmin.from("profiles").select("role,active").eq("id", data.user.id).maybeSingle();
  return profile?.active && profile.role === "super_admin" ? data.user.id : null;
}
export async function GET(request: NextRequest) {
  if (!await authorize(request)) return reply({ error: "Solo el superadministrador puede configurar esta comisión." }, 403);
  const storeId = request.nextUrl.searchParams.get("store_id") || "";
  if (!uuid.test(storeId)) return reply({ error: "Tienda inválida." }, 400);
  const { data, error } = await supabaseAdmin.rpc("get_shipping_platform_billing", { p_store_id: storeId });
  return error ? reply({ error: "No se pudo consultar la comisión de envíos." }, 500) : reply({ data });
}
export async function PUT(request: NextRequest) {
  const actor = await authorize(request);
  if (!actor) return reply({ error: "Solo el superadministrador puede configurar esta comisión." }, 403);
  const body = await request.json().catch(() => null);
  if (!body || !uuid.test(String(body.store_id || "")) || typeof body.enabled !== "boolean" || typeof body.fee_per_operation !== "number" || !Number.isFinite(body.fee_per_operation) || body.fee_per_operation < 0 || body.fee_per_operation > 10000 || Math.abs(body.fee_per_operation * 100 - Math.round(body.fee_per_operation * 100)) > 1e-7 || (body.enabled && body.fee_per_operation <= 0)) return reply({ error: "Indica una tarifa válida en USD, con máximo dos decimales." }, 400);
  const { data: store } = await supabaseAdmin.from("stores").select("id").eq("id", body.store_id).maybeSingle();
  if (!store) return reply({ error: "Tienda no encontrada." }, 404);
  const { error } = await supabaseAdmin.from("shipping_platform_billing").upsert({ store_id: body.store_id, enabled: body.enabled, fee_per_operation: body.fee_per_operation, updated_by: actor, updated_at: new Date().toISOString() });
  return error ? reply({ error: "No se pudo guardar la tarifa." }, 500) : reply({ ok: true });
}
