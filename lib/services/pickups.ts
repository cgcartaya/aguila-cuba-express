import { supabase } from "@/lib/supabase";
import type {
  PickupRequest,
  PickupRequestStatus,
  PickupRoute,
  PickupRouteStatus,
  PickupRouteStopStatus,
  PickupServiceSettings,
} from "@/lib/pickups/types";

export async function getPickupRequests(storeId: string) {
  const { data, error } = await supabase
    .from("pickup_requests")
    .select(`*, pickup_request_dates(preferred_date, priority)`)
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  const rows = (data || []).map((row: any) => ({
    ...row,
    preferred_dates: (row.pickup_request_dates || [])
      .sort((a: any, b: any) => a.priority - b.priority)
      .map((item: any) => item.preferred_date),
  })) as PickupRequest[];

  return { data: rows, error };
}

export async function updatePickupRequestStatus(storeId: string, requestId: string, status: PickupRequestStatus) {
  return supabase
    .from("pickup_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("store_id", storeId)
    .eq("id", requestId)
    .select()
    .single();
}

export async function confirmPickupRequestDate(storeId: string, requestId: string, confirmedDate: string | null) {
  return supabase
    .from("pickup_requests")
    .update({
      confirmed_date: confirmedDate,
      status: confirmedDate ? "confirmed" : "pending_confirmation",
      updated_at: new Date().toISOString(),
    })
    .eq("store_id", storeId)
    .eq("id", requestId)
    .select()
    .single();
}

export async function getPickupServiceSettings(storeId: string) {
  return supabase.from("pickup_service_settings").select("*").eq("store_id", storeId).maybeSingle<PickupServiceSettings>();
}

export async function upsertPickupServiceSettings(storeId: string, values: Partial<PickupServiceSettings>) {
  return supabase
    .from("pickup_service_settings")
    .upsert({ store_id: storeId, ...values, updated_at: new Date().toISOString() }, { onConflict: "store_id" })
    .select()
    .single<PickupServiceSettings>();
}

export async function getPickupRoutes(storeId: string) {
  const { data, error } = await supabase
    .from("pickup_routes")
    .select(`*, pickup_route_stops(id, status, stop_order, pickup_request_id)`)
    .eq("store_id", storeId)
    .order("route_date", { ascending: false });

  return { data: (data || []).map((route: any) => ({ ...route, stops: route.pickup_route_stops || [] })) as PickupRoute[], error };
}

export async function getPickupRoute(storeId: string, routeId: string) {
  const { data, error } = await supabase
    .from("pickup_routes")
    .select(`
      *,
      pickup_route_stops(
        id, route_id, pickup_request_id, stop_order, estimated_arrival, status, notes, completed_at,
        pickup_requests(*, pickup_request_dates(preferred_date, priority))
      )
    `)
    .eq("store_id", storeId)
    .eq("id", routeId)
    .single();

  if (!data) return { data: null, error };
  const stops = (data.pickup_route_stops || [])
    .map((stop: any) => ({
      ...stop,
      pickup_request: stop.pickup_requests
        ? {
            ...stop.pickup_requests,
            preferred_dates: (stop.pickup_requests.pickup_request_dates || [])
              .sort((a: any, b: any) => a.priority - b.priority)
              .map((item: any) => item.preferred_date),
          }
        : undefined,
    }))
    .sort((a: any, b: any) => a.stop_order - b.stop_order);

  return { data: { ...data, stops } as PickupRoute, error };
}

export async function createPickupRoute(input: {
  storeId: string;
  name: string;
  routeDate: string;
  driverName?: string;
  driverPhone?: string;
  vehicleName?: string;
  notes?: string;
  zoneId?: string | null;
  requestIds: string[];
}) {
  const { data: route, error } = await supabase
    .from("pickup_routes")
    .insert({
      store_id: input.storeId,
      name: input.name,
      route_date: input.routeDate,
      driver_name: input.driverName || null,
      driver_phone: input.driverPhone || null,
      vehicle_name: input.vehicleName || null,
      notes: input.notes || null,
      zone_id: input.zoneId || null,
      status: "draft",
    })
    .select()
    .single();

  if (error || !route) return { data: null, error };

  if (input.requestIds.length > 0) {
    const { error: stopsError } = await supabase.from("pickup_route_stops").insert(
      input.requestIds.map((pickupRequestId, index) => ({
        route_id: route.id,
        pickup_request_id: pickupRequestId,
        stop_order: index + 1,
        status: "pending",
      }))
    );
    if (stopsError) {
      await supabase.from("pickup_routes").delete().eq("id", route.id);
      return { data: null, error: stopsError };
    }
    const { error: statusError } = await supabase
      .from("pickup_requests")
      .update({ status: "assigned", updated_at: new Date().toISOString() })
      .eq("store_id", input.storeId)
      .in("id", input.requestIds);
    if (statusError) {
      await supabase.from("pickup_routes").delete().eq("id", route.id);
      return { data: null, error: statusError };
    }
  }

  return { data: route as PickupRoute, error: null };
}

export async function updatePickupRoute(routeId: string, storeId: string, values: Partial<PickupRoute>) {
  return supabase
    .from("pickup_routes")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", routeId)
    .eq("store_id", storeId)
    .select()
    .single();
}

export async function updatePickupRouteStatus(routeId: string, storeId: string, status: PickupRouteStatus) {
  const values: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "published") {
    values.is_public = true;
    values.published_at = new Date().toISOString();
  }
  return supabase.from("pickup_routes").update(values).eq("id", routeId).eq("store_id", storeId).select().single();
}

export async function deletePickupRoute(routeId: string, storeId: string) {
  return supabase.from("pickup_routes").delete().eq("id", routeId).eq("store_id", storeId);
}

export async function reorderPickupRouteStops(routeId: string, orderedStopIds: string[]) {
  const updates = orderedStopIds.map((id, index) =>
    supabase.from("pickup_route_stops").update({ stop_order: index + 1 }).eq("id", id).eq("route_id", routeId)
  );
  const results = await Promise.all(updates);
  return { error: results.find((result) => result.error)?.error || null };
}

export async function updatePickupRouteStopStatus(stopId: string, routeId: string, status: PickupRouteStopStatus) {
  return supabase
    .from("pickup_route_stops")
    .update({ status, completed_at: status === "picked_up" ? new Date().toISOString() : null })
    .eq("id", stopId)
    .eq("route_id", routeId)
    .select()
    .single();
}

export async function removePickupRouteStop(stopId: string, routeId: string) {
  return supabase.from("pickup_route_stops").delete().eq("id", stopId).eq("route_id", routeId);
}

export async function getPublicPickupRoutes(storeId: string, limit = 4) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("pickup_routes")
    .select(`
      id, name, route_date, public_summary, start_city, end_city, color,
      pickup_route_stops(stop_order, pickup_requests(city))
    `)
    .eq("store_id", storeId)
    .eq("is_public", true)
    .eq("status", "published")
    .gte("route_date", today)
    .order("route_date", { ascending: true })
    .limit(limit);
  return { data: data || [], error };
}
