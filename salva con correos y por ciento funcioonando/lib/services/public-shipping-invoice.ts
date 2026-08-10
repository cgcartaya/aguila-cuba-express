import { supabase } from "@/lib/supabase";

export type PublicShippingInvoice = {
  shipment: Record<string, any>;
  items: Array<Record<string, any>>;
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
