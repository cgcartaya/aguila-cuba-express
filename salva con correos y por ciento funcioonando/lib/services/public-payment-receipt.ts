import { supabase } from "@/lib/supabase";

export type PublicPaymentReceipt = {
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

  return {
    data: (data || null) as PublicPaymentReceipt | null,
    error: null,
  };
}
