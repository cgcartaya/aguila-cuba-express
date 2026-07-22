import { supabase } from "@/lib/supabase";
import type { PickupRequest, PickupRequestStatus, PickupServiceSettings } from "@/lib/pickups/types";

export async function getPickupRequests(storeId: string) {
  const { data, error } = await supabase
    .from("pickup_requests")
    .select(`
      *,
      pickup_request_dates(preferred_date, priority)
    `)
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

export async function updatePickupRequestStatus(
  storeId: string,
  requestId: string,
  status: PickupRequestStatus
) {
  return supabase
    .from("pickup_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("store_id", storeId)
    .eq("id", requestId)
    .select()
    .single();
}

export async function confirmPickupRequestDate(
  storeId: string,
  requestId: string,
  confirmedDate: string | null
) {
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
  return supabase
    .from("pickup_service_settings")
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle<PickupServiceSettings>();
}

export async function upsertPickupServiceSettings(
  storeId: string,
  values: Partial<PickupServiceSettings>
) {
  return supabase
    .from("pickup_service_settings")
    .upsert(
      {
        store_id: storeId,
        ...values,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id" }
    )
    .select()
    .single<PickupServiceSettings>();
}
