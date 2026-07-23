"use server";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const WRITE_ROLES = new Set(["OWNER", "ADMIN", "OPERATIONS", "DISPATCHER"]);
const TERMINAL_STOP_STATUSES = new Set(["picked_up", "failed", "skipped"]);

const clean = (value: unknown, max = 120) =>
  String(value ?? "").trim().slice(0, max);

const fail = (error: string, status = 400) =>
  NextResponse.json({ ok: false, error }, { status });

async function access(request: NextRequest, storeId: string) {
  const token = (request.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  if (!token) return fail("No se recibió la sesión.", 401);

  const { data: authData } = await supabaseAdmin.auth.getUser(token);
  if (!authData.user) return fail("Sesión inválida.", 401);

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role,active")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!profile?.active) return fail("Usuario inactivo.", 403);
  if (profile.role === "super_admin") return null;

  const { data: membership } = await supabaseAdmin
    .from("store_users")
    .select("role,active")
    .eq("store_id", storeId)
    .eq("user_id", authData.user.id)
    .eq("active", true)
    .maybeSingle();

  if (!membership) return fail("No tienes acceso a esta tienda.", 403);
  if (!WRITE_ROLES.has(String(membership.role).toUpperCase())) {
    return fail("Tu rol no permite administrar rutas.", 403);
  }

  return null;
}

async function loadRoute(storeId: string, routeId: string) {
  return supabaseAdmin
    .from("pickup_routes")
    .select(`
      *,
      pickup_route_stops(
        id,
        status,
        pickup_request_id,
        stop_order
      )
    `)
    .eq("id", routeId)
    .eq("store_id", storeId)
    .maybeSingle();
}

async function restorePendingRequests(
  storeId: string,
  stops: Array<{ status: string; pickup_request_id: string }>
) {
  const requestIds = stops
    .filter((stop) => stop.status !== "picked_up")
    .map((stop) => stop.pickup_request_id)
    .filter(Boolean);

  if (!requestIds.length) return { restored: 0, error: null };

  const { data: requests, error: readError } = await supabaseAdmin
    .from("pickup_requests")
    .select("id,confirmed_date,status")
    .eq("store_id", storeId)
    .in("id", requestIds);

  if (readError) return { restored: 0, error: readError };

  const confirmedIds = (requests || [])
    .filter((item) => Boolean(item.confirmed_date))
    .map((item) => item.id);
  const newIds = (requests || [])
    .filter((item) => !item.confirmed_date)
    .map((item) => item.id);

  if (confirmedIds.length) {
    const { error } = await supabaseAdmin
      .from("pickup_requests")
      .update({ status: "confirmed", updated_at: new Date().toISOString() })
      .eq("store_id", storeId)
      .in("id", confirmedIds);
    if (error) return { restored: 0, error };
  }

  if (newIds.length) {
    const { error } = await supabaseAdmin
      .from("pickup_requests")
      .update({ status: "new", updated_at: new Date().toISOString() })
      .eq("store_id", storeId)
      .in("id", newIds);
    if (error) return { restored: 0, error };
  }

  return { restored: confirmedIds.length + newIds.length, error: null };
}


export async function GET(request: NextRequest) {
  const storeId = clean(request.nextUrl.searchParams.get("store_id"), 64);
  const routeId = clean(request.nextUrl.searchParams.get("route_id"), 64);

  if (!storeId || !routeId) return fail("store_id y route_id son obligatorios.");

  const denied = await access(request, storeId);
  if (denied) return denied;

  const { data: route, error: routeError } = await loadRoute(storeId, routeId);
  if (routeError) return fail(routeError.message, 500);
  if (!route) return fail("La ruta no existe o no pertenece a esta tienda.", 404);

  const { data: assignedStops, error: stopsError } = await supabaseAdmin
    .from("pickup_route_stops")
    .select("pickup_request_id");

  if (stopsError) return fail(stopsError.message, 500);

  const assignedIds = new Set(
    (assignedStops || []).map((item) => item.pickup_request_id).filter(Boolean)
  );

  const { data: requests, error: requestsError } = await supabaseAdmin
    .from("pickup_requests")
    .select("*, pickup_request_dates(preferred_date, priority)")
    .eq("store_id", storeId)
    .in("status", ["new", "contacted", "pending_confirmation", "confirmed"])
    .order("created_at", { ascending: false });

  if (requestsError) return fail(requestsError.message, 500);

  const routeRequestIds = new Set(
    ((route.pickup_route_stops || []) as Array<{ pickup_request_id: string }>)
      .map((item) => item.pickup_request_id)
      .filter(Boolean)
  );

  const { data: routeRequests } = routeRequestIds.size
    ? await supabaseAdmin
        .from("pickup_requests")
        .select("city")
        .eq("store_id", storeId)
        .in("id", Array.from(routeRequestIds))
    : { data: [] as Array<{ city: string }> };

  const routeCities = new Set(
    (routeRequests || []).map((item) => clean(item.city).toLowerCase()).filter(Boolean)
  );

  const eligible = (requests || [])
    .filter((item) => !assignedIds.has(item.id))
    .map((item) => ({
      ...item,
      preferred_dates: (item.pickup_request_dates || [])
        .sort((a: any, b: any) => a.priority - b.priority)
        .map((date: any) => date.preferred_date),
      compatible_city: routeCities.size === 0 || routeCities.has(clean(item.city).toLowerCase()),
    }))
    .sort((a, b) => {
      if (a.compatible_city !== b.compatible_city) return a.compatible_city ? -1 : 1;
      return String(b.created_at).localeCompare(String(a.created_at));
    });

  return NextResponse.json({
    ok: true,
    requests: eligible,
    compatible_count: eligible.filter((item) => item.compatible_city).length,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const storeId = clean(body.store_id, 64);
  const routeId = clean(body.route_id, 64);
  const action = clean(body.action, 30);

  if (!storeId || !routeId || !action) {
    return fail("store_id, route_id y action son obligatorios.");
  }

  const denied = await access(request, storeId);
  if (denied) return denied;

  const { data: route, error: routeError } = await loadRoute(storeId, routeId);
  if (routeError) return fail(routeError.message, 500);
  if (!route) return fail("La ruta no existe o no pertenece a esta tienda.", 404);

  const stops = (route.pickup_route_stops || []) as Array<{
    id: string;
    status: string;
    pickup_request_id: string;
    stop_order: number;
  }>;


  if (action === "add_requests") {
    if (["completed", "cancelled"].includes(route.status)) {
      return fail("No se pueden agregar solicitudes a una ruta cerrada.");
    }

    const requestIds = Array.from(
      new Set(
        (Array.isArray(body.request_ids) ? body.request_ids : [])
          .map((value: unknown) => clean(value, 64))
          .filter(Boolean)
      )
    );

    if (!requestIds.length) return fail("Selecciona al menos una solicitud.");

    const { data: requests, error: requestsError } = await supabaseAdmin
      .from("pickup_requests")
      .select("id,status")
      .eq("store_id", storeId)
      .in("id", requestIds);

    if (requestsError) return fail(requestsError.message, 500);
    if ((requests || []).length !== requestIds.length) {
      return fail("Una o más solicitudes no existen o no pertenecen a esta tienda.");
    }

    const allowedStatuses = new Set(["new", "contacted", "pending_confirmation", "confirmed"]);
    const unavailableByStatus = (requests || []).filter((item) => !allowedStatuses.has(item.status));
    if (unavailableByStatus.length) {
      return fail("Una o más solicitudes ya no están disponibles para asignar.");
    }

    const { data: existingStops, error: existingError } = await supabaseAdmin
      .from("pickup_route_stops")
      .select("pickup_request_id")
      .in("pickup_request_id", requestIds);

    if (existingError) return fail(existingError.message, 500);
    if ((existingStops || []).length) {
      return fail("Una o más solicitudes ya pertenecen a otra ruta. Actualiza la lista e inténtalo de nuevo.");
    }

    const lastOrder = stops.reduce((max, stop) => Math.max(max, Number(stop.stop_order) || 0), 0);
    const rows = requestIds.map((pickupRequestId, index) => ({
      route_id: routeId,
      pickup_request_id: pickupRequestId,
      stop_order: lastOrder + index + 1,
      status: "pending",
    }));

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("pickup_route_stops")
      .insert(rows)
      .select("id");

    if (insertError) return fail(insertError.message, 500);

    const { error: statusError } = await supabaseAdmin
      .from("pickup_requests")
      .update({ status: "assigned", updated_at: new Date().toISOString() })
      .eq("store_id", storeId)
      .in("id", requestIds);

    if (statusError) {
      const insertedIds = (inserted || []).map((item) => item.id);
      if (insertedIds.length) {
        await supabaseAdmin.from("pickup_route_stops").delete().in("id", insertedIds);
      }
      return fail(statusError.message, 500);
    }

    return NextResponse.json({ ok: true, added: requestIds.length });
  }

  if (action === "cancel") {
    if (route.status === "completed") {
      return fail("Una ruta completada no puede cancelarse.");
    }

    const restored = await restorePendingRequests(storeId, stops);
    if (restored.error) return fail(restored.error.message, 500);

    const { error } = await supabaseAdmin
      .from("pickup_routes")
      .update({
        status: "cancelled",
        is_public: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", routeId)
      .eq("store_id", storeId);

    if (error) return fail(error.message, 500);

    await supabaseAdmin
      .from("pickup_route_stops")
      .update({ status: "skipped" })
      .eq("route_id", routeId)
      .neq("status", "picked_up");

    return NextResponse.json({
      ok: true,
      route_id: routeId,
      restored_requests: restored.restored,
    });
  }

  if (action === "complete") {
    if (route.status === "cancelled") {
      return fail("Una ruta cancelada no puede completarse.");
    }

    const unfinished = stops.filter(
      (stop) => !TERMINAL_STOP_STATUSES.has(stop.status)
    );

    if (unfinished.length) {
      return fail(
        `Todavía hay ${unfinished.length} parada(s) sin cerrar. Márcalas como recogidas, fallidas u omitidas.`
      );
    }

    const pickedUpIds = stops
      .filter((stop) => stop.status === "picked_up")
      .map((stop) => stop.pickup_request_id);

    if (pickedUpIds.length) {
      const { error: requestError } = await supabaseAdmin
        .from("pickup_requests")
        .update({
          status: "picked_up",
          updated_at: new Date().toISOString(),
        })
        .eq("store_id", storeId)
        .in("id", pickedUpIds);

      if (requestError) return fail(requestError.message, 500);
    }

    const { error } = await supabaseAdmin
      .from("pickup_routes")
      .update({
        status: "completed",
        is_public: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", routeId)
      .eq("store_id", storeId);

    if (error) return fail(error.message, 500);

    return NextResponse.json({ ok: true, route_id: routeId });
  }

  if (action === "delete") {
    if (route.status === "in_progress") {
      return fail("No se puede eliminar una ruta en recorrido. Cancélala primero.");
    }
    if (route.status === "completed") {
      return fail("Las rutas completadas se conservan como historial y no se eliminan.");
    }

    const restored = await restorePendingRequests(storeId, stops);
    if (restored.error) return fail(restored.error.message, 500);

    const { error } = await supabaseAdmin
      .from("pickup_routes")
      .delete()
      .eq("id", routeId)
      .eq("store_id", storeId);

    if (error) return fail(error.message, 500);

    return NextResponse.json({
      ok: true,
      route_id: routeId,
      restored_requests: restored.restored,
    });
  }

  if (action === "duplicate") {
    const { data: duplicated, error } = await supabaseAdmin
      .from("pickup_routes")
      .insert({
        store_id: storeId,
        name: `${route.name} (copia)`,
        route_date: route.route_date,
        status: "draft",
        driver_name: route.driver_name,
        driver_phone: route.driver_phone,
        vehicle_name: route.vehicle_name,
        public_summary: route.public_summary,
        is_public: false,
        color: route.color,
        notes: route.notes,
        zone_id: route.zone_id || null,
      })
      .select("id")
      .single();

    if (error || !duplicated) {
      return fail(error?.message || "No se pudo duplicar la ruta.", 500);
    }

    return NextResponse.json({
      ok: true,
      duplicated_route_id: duplicated.id,
    });
  }

  return fail("Acción no reconocida.");
}
