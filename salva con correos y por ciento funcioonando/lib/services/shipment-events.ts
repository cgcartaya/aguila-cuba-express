import { supabase } from "@/lib/supabase";
import type { ShipmentEvent } from "@/lib/shipping/types";

export async function getShipmentEvents(storeId: string, shipmentId: string) {
  return supabase
    .from("shipment_events")
    .select("*")
    .eq("store_id", storeId)
    .eq("shipment_id", shipmentId)
    .order("created_at", { ascending: false })
    .returns<ShipmentEvent[]>();
}
