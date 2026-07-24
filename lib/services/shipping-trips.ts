import { supabase } from "@/lib/supabase";
import type {
  ShippingTrip,
  ShippingTripInput,
  ShippingTripStatus,
  ShippingTripWithStats,
} from "@/lib/shipping/types";

export function getShippingTripsByStoreId(storeId: string) {
  return supabase
    .from("shipping_trips")
    .select("*")
    .eq("store_id", storeId)
    .order("trip_number", { ascending: false })
    .returns<ShippingTrip[]>();
}

export async function getShippingTripsWithStats(storeId: string) {
  const { data: trips, error } = await getShippingTripsByStoreId(storeId);
  if (error || !trips) return { data: null, error };

  const { data: shipments, error: shipmentsError } = await supabase
    .from("shipments")
    .select("trip_id,status,weight_lb,service_price,amount_paid,balance_due")
    .eq("store_id", storeId)
    .is("deleted_at", null);

  if (shipmentsError) return { data: null, error: shipmentsError };

  const result: ShippingTripWithStats[] = trips.map((trip) => {
    const rows = (shipments || []).filter((shipment) => shipment.trip_id === trip.id);
    return {
      ...trip,
      stats: {
        total_shipments: rows.length,
        delivered_shipments: rows.filter((row) => row.status === "delivered").length,
        issue_shipments: rows.filter((row) => row.status === "issue").length,
        pending_shipments: rows.filter((row) => !["delivered", "issue"].includes(row.status)).length,
        total_weight_lb: rows.reduce((sum, row) => sum + Number(row.weight_lb || 0), 0),
        billed_total: rows.reduce((sum, row) => sum + Number(row.service_price || 0), 0),
        paid_total: rows.reduce((sum, row) => sum + Number(row.amount_paid || 0), 0),
        outstanding_total: rows.reduce((sum, row) => sum + Number(row.balance_due || 0), 0),
      },
    };
  });

  return { data: result, error: null };
}

export function getShippingTripById(storeId: string, tripId: string) {
  return supabase
    .from("shipping_trips")
    .select("*")
    .eq("store_id", storeId)
    .eq("id", tripId)
    .maybeSingle<ShippingTrip>();
}

export function getShipmentsByTripId(storeId: string, tripId: string) {
  return supabase
    .from("shipments")
    .select("*")
    .eq("store_id", storeId)
    .eq("trip_id", tripId)
    .is("deleted_at", null)
    .order("order_number", { ascending: false, nullsFirst: false });
}

export function createShippingTrip(storeId: string, input: ShippingTripInput) {
  return supabase.rpc("create_shipping_trip", {
    p_store_id: storeId,
    p_name: input.name,
    p_origin: input.origin || null,
    p_destination: input.destination || null,
    p_departure_date: input.departure_date || null,
    p_estimated_arrival_date: input.estimated_arrival_date || null,
    p_driver_name: input.driver_name || null,
    p_vehicle: input.vehicle || null,
    p_transport_mode: input.transport_mode,
    p_manifest_notes: input.manifest_notes || null,
    p_is_default: Boolean(input.is_default),
  });
}

export function changeShippingTripStatus(
  storeId: string,
  tripId: string,
  status: ShippingTripStatus
) {
  return supabase.rpc("change_shipping_trip_status", {
    p_store_id: storeId,
    p_trip_id: tripId,
    p_status: status,
  });
}

export function closeShippingTrip(storeId: string, tripId: string, force = false) {
  return supabase.rpc("close_shipping_trip", {
    p_store_id: storeId,
    p_trip_id: tripId,
    p_force: force,
  });
}

export function getOrCreatePreparingTrip(storeId: string) {
  return supabase.rpc("get_or_create_preparing_trip", { p_store_id: storeId });
}

export function getOpenShippingTripsByStoreId(storeId: string) {
  return supabase
    .from("shipping_trips")
    .select("*")
    .eq("store_id", storeId)
    .eq("status", "preparing")
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .order("departure_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .returns<ShippingTrip[]>();
}

export function setDefaultShippingTrip(storeId: string, tripId: string) {
  return supabase.rpc("set_default_shipping_trip", {
    p_store_id: storeId,
    p_trip_id: tripId,
  });
}


export async function deleteEmptyShippingTrip(storeId: string, tripId: string) {
  const { count, error: countError } = await supabase
    .from("shipments")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("trip_id", tripId)
    .is("deleted_at", null);

  if (countError) return { data: null, error: countError };

  if ((count || 0) > 0) {
    return {
      data: null,
      error: {
        message: `Este viaje contiene ${count} envío(s). Muévelos a otro viaje antes de eliminarlo.`,
      },
    };
  }

  return supabase
    .from("shipping_trips")
    .delete()
    .eq("store_id", storeId)
    .eq("id", tripId)
    .select("id")
    .single();
}
