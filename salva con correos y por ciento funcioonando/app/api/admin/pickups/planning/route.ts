import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const WRITE_ROLES = new Set(["OWNER", "ADMIN", "OPERATIONS", "DISPATCHER"]);
const clean = (v: unknown, n = 120) => String(v ?? "").trim().slice(0, n);
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

async function access(request: NextRequest, storeId: string, write = false) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return fail("No se recibió la sesión.", 401);
  const { data } = await supabaseAdmin.auth.getUser(token);
  if (!data.user) return fail("Sesión inválida.", 401);
  const { data: profile } = await supabaseAdmin.from("profiles").select("role,active").eq("id", data.user.id).maybeSingle();
  if (!profile?.active) return fail("Usuario inactivo.", 403);
  if (profile.role === "super_admin") return null;
  const { data: membership } = await supabaseAdmin.from("store_users").select("role,active").eq("store_id", storeId).eq("user_id", data.user.id).eq("active", true).maybeSingle();
  if (!membership) return fail("No tienes acceso a esta tienda.", 403);
  if (write && !WRITE_ROLES.has(String(membership.role).toUpperCase())) return fail("Tu rol no permite planificar recogidas.", 403);
  return null;
}

export async function GET(request: NextRequest) {
  const storeId = clean(request.nextUrl.searchParams.get("store_id"), 64);
  if (!storeId) return fail("store_id es obligatorio.");
  const denied = await access(request, storeId); if (denied) return denied;

  const [{ data: zones, error: zoneError }, { data: requests, error: requestError }] = await Promise.all([
    supabaseAdmin.from("pickup_zones").select("id,name,color,is_active,sort_order").eq("store_id", storeId).order("sort_order").order("name"),
    supabaseAdmin.from("pickup_requests").select("*, pickup_request_dates(preferred_date,priority)").eq("store_id", storeId).order("created_at", { ascending: true }),
  ]);
  if (zoneError || requestError) return fail(zoneError?.message || requestError?.message || "No se pudo cargar la planificación.", 500);
  const zoneMap = new Map((zones || []).map((z: any) => [z.id, z]));
  const rows = (requests || []).map((row: any) => ({
    ...row,
    preferred_dates: (row.pickup_request_dates || []).sort((a: any,b: any) => a.priority-b.priority).map((d: any) => d.preferred_date),
    zone: zoneMap.get(row.assigned_zone_id || row.suggested_zone_id) || null,
  }));
  return NextResponse.json({ ok: true, zones: zones || [], requests: rows });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const storeId = clean(body.store_id, 64);
  const ids = Array.isArray(body.request_ids) ? body.request_ids.map((x: unknown) => clean(x,64)).filter(Boolean) : [];
  if (!storeId || !ids.length) return fail("Selecciona al menos una solicitud.");
  const denied = await access(request, storeId, true); if (denied) return denied;
  const values: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.assigned_zone_id !== undefined) {
    const zoneId = clean(body.assigned_zone_id, 64) || null;
    if (zoneId) {
      const { data: zone, error: zoneError } = await supabaseAdmin
        .from("pickup_zones")
        .select("id")
        .eq("id", zoneId)
        .eq("store_id", storeId)
        .eq("is_active", true)
        .maybeSingle();
      if (zoneError) return fail(zoneError.message, 500);
      if (!zone) return fail("La zona seleccionada no pertenece a esta tienda o está inactiva.", 400);
    }
    values.assigned_zone_id = zoneId;
  }
  if (body.status !== undefined) values.status = clean(body.status,40);
  if (body.internal_notes !== undefined) values.internal_notes = clean(body.internal_notes,1000) || null;
  const { data, error } = await supabaseAdmin.from("pickup_requests").update(values).eq("store_id", storeId).in("id", ids).select("id");
  if (error) return fail(error.message,500);
  return NextResponse.json({ ok: true, updated: data?.length || 0 });
}
