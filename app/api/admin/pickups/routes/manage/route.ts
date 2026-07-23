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
