import type { Shipment, ShipmentItem } from "@/lib/shipping/types";
import { supabase } from "@/lib/supabase";

export type PublicShippingInvoice = {
  store?: { name?: string; logo_url?: string | null };
  shipment: Shipment;
  items: ShipmentItem[];
};

export async function getPublicShippingInvoice(
  trackingCode: string
) {
  const { data, error } = await supabase.rpc(
    "get_public_shipping_invoice",
    {
      p_tracking_code: trackingCode,
    }
  );

  if (error) {
    return {
      data: null,
      error,
    };
  }

  return {
    data: (data || null) as PublicShippingInvoice | null,
    error: null,
  };
}
