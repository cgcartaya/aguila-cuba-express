import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const clean = (value: unknown, max = 180) => String(value ?? "").trim().slice(0, max);
const digits = (value: unknown) => clean(value, 40).replace(/\D/g, "");
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

async function authorize(request: NextRequest, storeId: string) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return fail("No se recibió la sesión.", 401);
  const { data } = await supabaseAdmin.auth.getUser(token);
  if (!data.user) return fail("Sesión inválida.", 401);
  const { data: profile } = await supabaseAdmin.from("profiles").select("role,active").eq("id", data.user.id).maybeSingle();
  if (!profile?.active) return fail("Usuario inactivo.", 403);
  if (profile.role === "super_admin") return null;
  const { data: membership } = await supabaseAdmin.from("store_users").select("active").eq("store_id", storeId).eq("user_id", data.user.id).eq("active", true).maybeSingle();
  return membership ? null : fail("No tienes acceso a esta tienda.", 403);
}

export async function GET(request: NextRequest) {
  const storeId = clean(request.nextUrl.searchParams.get("store_id"), 64);
  const query = clean(request.nextUrl.searchParams.get("q"), 100);
  if (!storeId) return fail("Falta la tienda.");
  const denied = await authorize(request, storeId);
  if (denied) return denied;

  let builder = supabaseAdmin.from("pickup_customers").select("*").eq("store_id", storeId).order("last_pickup_at", { ascending: false, nullsFirst: false }).limit(query ? 8 : 500);
  if (query) {
    const phone = digits(query);
    builder = builder.or(`name.ilike.%${query.replace(/[%_,]/g, "")}%,phone_normalized.ilike.%${phone}%`);
  }
  const { data, error } = await builder;
  if (error) return fail(error.message, 500);
  return NextResponse.json({ ok: true, customers: data || [] });
}
