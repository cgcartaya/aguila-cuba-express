import { getPublicStoreBranding } from "@/lib/services/store-branding";
import type { StoreBranding } from "@/lib/saas/store-branding";
import type { Shipment, ShipmentItem } from "@/lib/shipping/types";
import { supabase } from "@/lib/supabase";

export type PublicShippingInvoice = {
  brand: StoreBranding;
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

  const brand = await getPublicStoreBranding(data?.shipment?.store_id);
  return {
    data: data ? { ...data, brand } as PublicShippingInvoice : null,
    error: null,
  };
}
