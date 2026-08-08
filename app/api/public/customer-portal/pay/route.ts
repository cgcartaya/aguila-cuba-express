import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStoreStripeContext } from "@/lib/services/stripe-admin";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const shipmentId = String(body.shipmentId || "").trim();
  if (!shipmentId) return NextResponse.json({ error: "Falta el envío." }, { status: 400 });

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
    .select("id, name, stripe_mode, stripe_account_id, stripe_charges_enabled, stripe_direct_secret_key")
    .eq("id", shipment.store_id)
    .maybeSingle();

  if (storeError || !store) return NextResponse.json({ error: "Tienda no encontrada." }, { status: 404 });

  const stripeCtx = getStoreStripeContext(store);
  if (!stripeCtx) {
    return NextResponse.json({ error: "Esta tienda todavía no tiene cobros en línea activos." }, { status: 503 });
  }

  const origin = request.headers.get("origin") || `https://${request.headers.get("host")}`;
  const amountCents = Math.round(Number(shipment.balance_due) * 100);
  // 2% — tu comisión como dueño de la plataforma. Solo aplica en modo
  // "connect"; en "direct" no hay cuenta conectada donde repartirla (la
  // comisión ya va incluida en el precio, vía el markup del 2.5%).
  const PLATFORM_FEE_RATE = 0.02;
  const applicationFeeCents = Math.round(amountCents * PLATFORM_FEE_RATE);

  const session = await stripeCtx.stripe.checkout.sessions.create(
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
      // de Águila (ni en la de ningún otro cliente conectado). Solo en
      // modo "connect" — ver comentario arriba.
      ...(stripeCtx.applyPlatformFee
        ? { payment_intent_data: { application_fee_amount: applicationFeeCents } }
        : {}),
      success_url: `${origin}/portal/pago-exitoso?tracking=${encodeURIComponent(shipment.tracking_code || "")}`,
      cancel_url: `${origin}/portal/pago-cancelado`,
      metadata: { shipment_id: shipment.id, store_id: store.id },
    },
    stripeCtx.requestOptions
  );

  await supabaseAdmin.from("shipment_payment_sessions").insert({
    store_id: store.id,
    shipment_id: shipment.id,
    stripe_checkout_session_id: session.id,
    amount: shipment.balance_due,
  });

  return NextResponse.json({ url: session.url });
}
