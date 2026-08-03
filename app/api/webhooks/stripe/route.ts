import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireStripe } from "@/lib/services/stripe-admin";

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

    if (shipmentId) {
      const { data: shipment } = await supabaseAdmin
        .from("shipments")
        .select("id, service_price")
        .eq("id", shipmentId)
        .maybeSingle();

      if (shipment) {
        await supabaseAdmin
          .from("shipments")
          .update({ amount_paid: shipment.service_price, balance_due: 0, payment_status: "paid" })
          .eq("id", shipmentId);
      }

      await supabaseAdmin
        .from("shipment_payment_sessions")
        .update({ status: "paid" })
        .eq("stripe_checkout_session_id", session.id);
    }
  }

  return NextResponse.json({ received: true });
}
