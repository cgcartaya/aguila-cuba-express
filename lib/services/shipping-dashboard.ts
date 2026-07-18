import { supabase } from "@/lib/supabase";
import type { ShippingDashboardData } from "@/lib/shipping/dashboard-types";

export async function getShippingDashboard(
  storeId: string
) {
  const { data, error } = await supabase.rpc(
    "get_shipping_operational_dashboard",
    {
      p_store_id: storeId,
    }
  );

  return {
    data: (data || null) as ShippingDashboardData | null,
    error,
  };
}
