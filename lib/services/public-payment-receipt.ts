import { getPublicStoreBranding } from "@/lib/services/store-branding";
import type { StoreBranding } from "@/lib/saas/store-branding";
import { supabase } from "@/lib/supabase";

export type PublicPaymentReceipt = {
  brand: StoreBranding;
  receipt: Record<string, any>;
  shipment: Record<string, any>;
  store_name: string;
};

export async function getPublicPaymentReceipt(folio: string) {
  const { data, error } = await supabase.rpc("get_public_payment_receipt", {
    p_folio: folio,
  });

  if (error) {
    return { data: null, error };
  }

  const brand = await getPublicStoreBranding(data?.receipt?.store_id);
  return {
    data: data ? { ...data, brand, store_name: brand.name } as PublicPaymentReceipt : null,
    error: null,
  };
}
