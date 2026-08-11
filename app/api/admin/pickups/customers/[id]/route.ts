import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";


// Vercel Pro: allow headroom for DB/storage/network work without applying a global timeout.
export const maxDuration = 60;
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
async function authorize(request: NextRequest, storeId: string) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const { data } = await supabaseAdmin.auth.getUser(token);
  if (!data.user) return fail("Sesión inválida.", 401);
  const { data: profile } = await supabaseAdmin.from("profiles").select("role,active").eq("id", data.user.id).maybeSingle();
  if (!profile?.active) return fail("Usuario inactivo.", 403);
  if (profile.role === "super_admin") return null;
  const { data: membership } = await supabaseAdmin.from("store_users").select("active").eq("store_id", storeId).eq("user_id", data.user.id).eq("active", true).maybeSingle();
  return membership ? null : fail("No tienes acceso a esta tienda.", 403);
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const storeId = String(request.nextUrl.searchParams.get("store_id") || "");
  if (!storeId) return fail("Falta la tienda.");
  const denied = await authorize(request, storeId); if (denied) return denied;
  const { data: customer, error } = await supabaseAdmin.from("pickup_customers").select("*").eq("id", id).eq("store_id", storeId).maybeSingle();
  if (error) return fail(error.message, 500); if (!customer) return fail("Cliente no encontrado.", 404);
  const { data: requests, error: historyError } = await supabaseAdmin.from("pickup_requests").select("id,request_code,status,created_at,confirmed_date,address_line_1,city,postal_code,request_source,package_type,package_count").eq("store_id", storeId).eq("customer_id", id).order("created_at", { ascending: false });
  if (historyError) return fail(historyError.message, 500);
  return NextResponse.json({ ok: true, customer, requests: requests || [] });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; const body = await request.json().catch(() => ({})); const storeId = String(body.store_id || "");
  if (!storeId) return fail("Falta la tienda."); const denied = await authorize(request, storeId); if (denied) return denied;
  const values = { name: String(body.name || "").trim(), email: String(body.email || "").trim() || null, address_line_1: String(body.address_line_1 || "").trim() || null, address_line_2: String(body.address_line_2 || "").trim() || null, city: String(body.city || "").trim() || null, region: String(body.region || "SC").trim(), postal_code: String(body.postal_code || "").trim() || null, notes: String(body.notes || "").trim() || null, updated_at: new Date().toISOString() };
  if (!values.name) return fail("El nombre es obligatorio.");
  const { data, error } = await supabaseAdmin.from("pickup_customers").update(values).eq("id", id).eq("store_id", storeId).select().single();
  if (error) return fail(error.message, 500); return NextResponse.json({ ok: true, customer: data });
}
