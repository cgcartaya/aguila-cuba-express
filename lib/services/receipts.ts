import { supabaseAdmin } from "@/lib/supabase-admin";

export type PaymentMethod = "cash" | "card";

export async function createPaymentReceipt(params: {
  storeId: string;
  shipmentId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  stripeCheckoutSessionId?: string | null;
  createdBy?: string | null;
}) {
  const { data, error } = await supabaseAdmin
    .from("payment_receipts")
    .insert({
      store_id: params.storeId,
      shipment_id: params.shipmentId,
      amount: params.amount,
      payment_method: params.paymentMethod,
      stripe_checkout_session_id: params.stripeCheckoutSessionId || null,
      created_by: params.createdBy || null,
    })
    .select("id, folio, folio_number, created_at")
    .single();

  return { data, error };
}

export async function getReceiptByShipmentId(shipmentId: string) {
  const { data, error } = await supabaseAdmin
    .from("payment_receipts")
    .select("id, folio, amount, payment_method, created_at")
    .eq("shipment_id", shipmentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { data, error };
}
