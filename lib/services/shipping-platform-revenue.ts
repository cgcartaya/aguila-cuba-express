import { supabase } from "@/lib/supabase";

export type ShippingRevenueRow = {
  shipment_id: string;
  store_id: string;
  amount: number | string;
};

/** Read issued charges at their historical price, including deleted shipments. */
export async function getShippingPlatformRevenue(from: string, to: string) {
  const rows: ShippingRevenueRow[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("shipping_platform_charges")
      .select("shipment_id,store_id,amount")
      .gte("created_at", from)
      .lt("created_at", to)
      .order("shipment_id")
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if ((data?.length || 0) < pageSize) return rows;
  }
}
