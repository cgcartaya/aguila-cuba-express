import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type StoreRole = "OWNER" | "ADMIN" | "OPERATIONS" | "BILLER" | "DISPATCHER" | "DRIVER" | "VIEWER";
const WRITE_ROLES = new Set<StoreRole>(["OWNER", "ADMIN", "OPERATIONS", "DISPATCHER"]);

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function cleanText(value: unknown, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}

function cleanDays(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort();
}

async function requireStoreAccess(request: NextRequest, storeId: string, write = false) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false as const, response: jsonError("No se recibió la sesión.", 401) };

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) return { ok: false as const, response: jsonError("Sesión inválida.", 401) };

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id,role,active")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError) return { ok: false as const, response: jsonError(profileError.message, 500) };
  if (!profile?.active) return { ok: false as const, response: jsonError("Usuario inactivo.", 403) };
  if (profile.role === "super_admin") return { ok: true as const };

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("store_users")
    .select("role,active")
    .eq("store_id", storeId)
    .eq("user_id", authData.user.id)
    .eq("active", true)
    .maybeSingle();

  if (membershipError) return { ok: false as const, response: jsonError(membershipError.message, 500) };
  if (!membership) return { ok: false as const, response: jsonError("No tienes acceso a esta tienda.", 403) };

  const role = String(membership.role || "VIEWER").toUpperCase() as StoreRole;
  if (write && !WRITE_ROLES.has(role)) {
    return { ok: false as const, response: jsonError("Tu rol no permite modificar zonas.", 403) };
  }
  return { ok: true as const };
}

export async function GET(request: NextRequest) {
  const storeId = cleanText(request.nextUrl.searchParams.get("store_id"), 64);
  if (!storeId) return jsonError("store_id es obligatorio.");
  const access = await requireStoreAccess(request, storeId, false);
  if (!access.ok) return access.response;

  const { data, error } = await supabaseAdmin
    .from("pickup_zones")
    .select("*, pickup_zone_cities(*)")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true, zones: (data || []).map((zone) => ({ ...zone, cities: zone.pickup_zone_cities || [] })) });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const storeId = cleanText(body.store_id, 64);
  const name = cleanText(body.name, 80);
  if (!storeId || !name) return jsonError("store_id y name son obligatorios.");
  const access = await requireStoreAccess(request, storeId, true);
  if (!access.ok) return access.response;

  const { data, error } = await supabaseAdmin.from("pickup_zones").insert({
    store_id: storeId,
    name,
    color: cleanText(body.color, 20) || null,
    description: cleanText(body.description, 500) || null,
    habitual_days: cleanDays(body.habitual_days),
  }).select().single();

  if (error) return jsonError(error.message, error.code === "23505" ? 409 : 500);
  return NextResponse.json({ ok: true, zone: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const storeId = cleanText(body.store_id, 64);
  const zoneId = cleanText(body.zone_id, 64);
  if (!storeId || !zoneId) return jsonError("store_id y zone_id son obligatorios.");
  const access = await requireStoreAccess(request, storeId, true);
  if (!access.ok) return access.response;

  if (Array.isArray(body.cities)) {
    const cities = [...new Set(body.cities.map((city: unknown) => cleanText(city, 120)).filter(Boolean))];
    const { data: zone } = await supabaseAdmin.from("pickup_zones").select("id").eq("id", zoneId).eq("store_id", storeId).maybeSingle();
    if (!zone) return jsonError("La zona no pertenece a esta tienda.", 404);

    const { error: deleteError } = await supabaseAdmin.from("pickup_zone_cities").delete().eq("zone_id", zoneId).eq("store_id", storeId);
    if (deleteError) return jsonError(deleteError.message, 500);
    if (cities.length) {
      const { error: insertError } = await supabaseAdmin.from("pickup_zone_cities").insert(
        cities.map((city) => ({ store_id: storeId, zone_id: zoneId, city_name: city, region_code: cleanText(body.region_code, 32) || null }))
      );
      if (insertError) return jsonError(insertError.message, insertError.code === "23505" ? 409 : 500);
    }
    return NextResponse.json({ ok: true });
  }

  const values: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) values.name = cleanText(body.name, 80);
  if (body.color !== undefined) values.color = cleanText(body.color, 20) || null;
  if (body.description !== undefined) values.description = cleanText(body.description, 500) || null;
  if (body.habitual_days !== undefined) values.habitual_days = cleanDays(body.habitual_days);
  if (body.is_active !== undefined) values.is_active = Boolean(body.is_active);
  if (body.sort_order !== undefined) values.sort_order = Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0;

  const { data, error } = await supabaseAdmin.from("pickup_zones").update(values).eq("id", zoneId).eq("store_id", storeId).select().single();
  if (error) return jsonError(error.message, error.code === "PGRST116" ? 404 : 500);
  return NextResponse.json({ ok: true, zone: data });
}

export async function DELETE(request: NextRequest) {
  const storeId = cleanText(request.nextUrl.searchParams.get("store_id"), 64);
  const zoneId = cleanText(request.nextUrl.searchParams.get("zone_id"), 64);
  if (!storeId || !zoneId) return jsonError("store_id y zone_id son obligatorios.");
  const access = await requireStoreAccess(request, storeId, true);
  if (!access.ok) return access.response;

  const { error } = await supabaseAdmin.from("pickup_zones").delete().eq("id", zoneId).eq("store_id", storeId);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
