import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStoreStripeContext } from "@/lib/services/stripe-admin";

const fail = (message: string, status = 400) => NextResponse.json({ success: false, message }, { status });

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const orderId = String(body.orderId || "").trim();
  const storeId = String(body.storeId || "").trim();

  if (!orderId || !storeId) {
    return fail("Falta la orden o la tienda.");
  }

  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("id, store_id, order_number, total, payment_status")
    .eq("id", orderId)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !order) return fail("Orden no encontrada.", 404);
  if (order.payment_status === "paid") return fail("Esta orden ya está pagada.");

  const { data: store, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id, name, stripe_mode, stripe_account_id, stripe_charges_enabled, stripe_direct_secret_key")
    .eq("id", storeId)
    .maybeSingle();

  if (storeError || !store) return fail("Tienda no encontrada.", 404);

  const stripeCtx = getStoreStripeContext(store);
  if (!stripeCtx) {
    return fail("Esta tienda todavía no tiene pagos con tarjeta activos.", 503);
  }

  const origin = request.headers.get("origin") || `https://${request.headers.get("host")}`;
  const amountCents = Math.round(Number(order.total) * 100);
  // Misma comisión de plataforma que ya usa el resto de la app — solo
  // aplica en modo "connect" (cuenta conectada). En modo "direct" no hay
  // application_fee_amount: la comisión ya va incluida en el precio.
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
            product_data: { name: `Pedido ${order.order_number || order.id.slice(0, 8)}` },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      ...(stripeCtx.applyPlatformFee
        ? { payment_intent_data: { application_fee_amount: applicationFeeCents } }
        : {}),
      success_url: `${origin}/tienda/pago-exitoso?order=${encodeURIComponent(order.order_number || order.id)}`,
      cancel_url: `${origin}/tienda/pago-cancelado?order=${encodeURIComponent(order.order_number || order.id)}`,
      metadata: {
        order_id: order.id,
        store_id: storeId,
      },
    },
    stripeCtx.requestOptions
  );

  return NextResponse.json({ success: true, url: session.url });
}
