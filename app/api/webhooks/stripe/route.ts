import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireStripe } from "@/lib/services/stripe-admin";
import { createPaymentReceipt } from "@/lib/services/receipts";

export async function POST(request: NextRequest) {
  let stripe;
  try {
    stripe = requireStripe();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET no configurada." }, { status: 500 });

  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature || "", webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Firma inválida: ${(err as Error).message}` }, { status: 400 });
  }

  if (event.type === "account.updated") {
    const account = event.data.object as { id: string; charges_enabled: boolean; details_submitted: boolean };
    await supabaseAdmin
      .from("stores")
      .update({ stripe_charges_enabled: account.charges_enabled, stripe_details_submitted: account.details_submitted })
      .eq("stripe_account_id", account.id);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as { id: string; metadata?: Record<string, string> };
    const shipmentId = session.metadata?.shipment_id;
    const orderId = session.metadata?.order_id;

    if (orderId) {
      // Pedido de la tienda pagado con tarjeta en el checkout.
      await supabaseAdmin.from("orders").update({ payment_status: "paid" }).eq("id", orderId);
    }

    if (shipmentId) {
      const { data: shipment } = await supabaseAdmin
        .from("shipments")
        .select("id, store_id, service_price, balance_due")
        .eq("id", shipmentId)
        .maybeSingle();

      if (shipment) {
        // El recibo debe reflejar lo que se cobró EN ESTA transacción, no
        // el total de la factura — importante si el envío ya traía un
        // pago parcial anterior (efectivo o tarjeta).
        const amountCollectedNow = Number(shipment.balance_due || 0);

        await supabaseAdmin
          .from("shipments")
          .update({ amount_paid: shipment.service_price, balance_due: 0, payment_status: "paid", payment_method: "card" })
          .eq("id", shipmentId);

        // Recibo de pago inmutable con folio consecutivo — separado de la
        // factura, que se genera desde que se crea el envío.
        const storeId = session.metadata?.store_id || shipment.store_id;
        if (storeId && amountCollectedNow > 0) {
          await createPaymentReceipt({
            storeId,
            shipmentId: shipment.id,
            amount: amountCollectedNow,
            paymentMethod: "card",
            stripeCheckoutSessionId: session.id,
          });
        }
      }

      await supabaseAdmin
        .from("shipment_payment_sessions")
        .update({ status: "paid" })
        .eq("stripe_checkout_session_id", session.id);
    }
  }

  return NextResponse.json({ received: true });
}
