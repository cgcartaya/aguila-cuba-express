import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireStripe } from "@/lib/services/stripe-admin";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const shipmentId = String(body.shipmentId || "").trim();
  if (!shipmentId) return NextResponse.json({ error: "Falta el envío." }, { status: 400 });

  let stripe;
  try {
    stripe = requireStripe();
  } catch {
    return NextResponse.json({ error: "Los cobros en línea no están activos todavía." }, { status: 503 });
  }

  const { data: shipment, error } = await supabaseAdmin
    .from("shipments")
    .select("id, store_id, tracking_code, balance_due, payment_status")
    .eq("id", shipmentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !shipment) return NextResponse.json({ error: "Envío no encontrado." }, { status: 404 });
  if (shipment.payment_status === "paid" || Number(shipment.balance_due) <= 0) {
    return NextResponse.json({ error: "Este envío no tiene saldo pendiente." }, { status: 400 });
  }

  const { data: store, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id, name, stripe_account_id, stripe_charges_enabled")
    .eq("id", shipment.store_id)
    .maybeSingle();

  if (storeError || !store?.stripe_account_id || !store.stripe_charges_enabled) {
    return NextResponse.json({ error: "Esta tienda todavía no tiene cobros en línea activos." }, { status: 503 });
  }

  const origin = request.headers.get("origin") || `https://${request.headers.get("host")}`;
  const amountCents = Math.round(Number(shipment.balance_due) * 100);
  const PLATFORM_FEE_RATE = 0.03; // 3% — tu comisión como dueño de la plataforma
  const applicationFeeCents = Math.round(amountCents * PLATFORM_FEE_RATE);

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Envío ${shipment.tracking_code || shipment.id.slice(0, 8)}` },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      // Tu comisión como dueño de la plataforma: Stripe la separa
      // automáticamente y la deposita en tu cuenta principal, no en la
      // de Águila (ni en la de ningún otro cliente conectado).
      payment_intent_data: {
        application_fee_amount: applicationFeeCents,
      },
      success_url: `${origin}/portal/pago-exitoso?tracking=${encodeURIComponent(shipment.tracking_code || "")}`,
      cancel_url: `${origin}/portal/pago-cancelado`,
      metadata: { shipment_id: shipment.id, store_id: store.id },
    },
    { stripeAccount: store.stripe_account_id }
  );

  await supabaseAdmin.from("shipment_payment_sessions").insert({
    store_id: store.id,
    shipment_id: shipment.id,
    stripe_checkout_session_id: session.id,
    amount: shipment.balance_due,
  });

  return NextResponse.json({ url: session.url });
}
