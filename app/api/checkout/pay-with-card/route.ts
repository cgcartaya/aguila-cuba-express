import { getCloverSettings, createCloverCheckout } from "@/lib/services/clover-admin";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStoreStripeContext } from "@/lib/services/stripe-admin";
import {
  CARD_SURCHARGE_RATE,
  PLATFORM_ORDER_FIXED_FEE,
} from "@/lib/config/features";
import { createSquareCheckout } from "@/lib/services/square-checkout";
import { getStorePublicBaseUrl } from "@/lib/saas/store-metadata";
import { reactivateExpiredOrder } from "@/lib/services/order-stock-admin";

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
    .select("id, store_id, order_number, total, payment_status, platform_fixed_fee_amount, customer_name, source_shipment_id, checkout_payment_provider, status, stock_restored, payment_method")
    .eq("id", orderId)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !order) return fail("Orden no encontrada.", 404);
  const { data: lymStore, error: lymStoreError } = await supabaseAdmin.from("stores").select("slug").eq("id", storeId).maybeSingle();
  if (lymStoreError || !lymStore) return fail("No se pudo verificar la tienda.", 500);
  if (lymStore.slug === "lym") return fail("LYM recibe solicitudes sin pago en línea. La tienda confirmará tu venta.", 409);
  if (order.source_shipment_id) return fail("Estos productos están incluidos en la factura del envío. El pago se gestiona desde Envíos.", 409);
  if (order.payment_status === "paid") return fail("Esta orden ya está pagada.");

  // El cliente está retomando el pago de una orden que ya había vencido
  // (el stock se devolvió automáticamente). Hay que volver a apartarlo
  // antes de mandarlo a Stripe — si alguien más se llevó lo que quedaba
  // mientras tanto, no se puede seguir como si nada.
  if (order.checkout_payment_provider === "square" && (
    order.payment_method !== "card" || order.payment_status !== "pending" || order.stock_restored || ["cancelled", "canceled"].includes(order.status)
  )) {
    return fail("Este pago Square requiere revisión de la tienda.", 409);
  }
  if (order.payment_status === "expired") {
    const reactivation = await reactivateExpiredOrder(orderId);
    if (!reactivation.ok) {
      return fail(reactivation.message, 409);
    }
  }

  const { data: store, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id, name, slug, domain, subdomain, is_active, module_store_enabled, stripe_mode, stripe_account_id, stripe_charges_enabled, stripe_direct_secret_key")
    .eq("id", storeId)
    .maybeSingle();

  if (storeError || !store) return fail("Tienda no encontrada.", 404);

  if (order.checkout_payment_provider === "square") {
    if (store.is_active === false || store.module_store_enabled === false) return fail("La tienda no está disponible.", 409);
    try {
      const publicBase = new URL(getStorePublicBaseUrl(store));
      const url = await createSquareCheckout({
        storeId, orderId: order.id, amountCents: Math.round(Number(order.total) * 100),
        name: `Pedido ${order.order_number || order.id.slice(0, 8)}`,
        returnUrl: new URL(`/pedido/${encodeURIComponent(order.order_number || order.id)}`, publicBase).toString(),
      });
      return NextResponse.json({ success: true, url });
    } catch {
      return fail("No se pudo iniciar el pago con Square.", 503);
    }
  }

  try {
    const clover = order.checkout_payment_provider === "stripe" ? null : await getCloverSettings(storeId);
    if (clover?.enabled) {
      const origin = request.nextUrl.origin;
      const url = await createCloverCheckout(clover, { storeId, targetType: "order", targetId: order.id,
        customer: { firstName: order.customer_name || "Cliente" },
        amountCents: Math.round(Number(order.total)*100), name: `Pedido ${order.order_number || order.id.slice(0,8)}`,
        successUrl: `${origin}/tienda/pago-exitoso?order=${encodeURIComponent(order.order_number || order.id)}`,
        failureUrl: `${origin}/tienda/pago-cancelado?order=${encodeURIComponent(order.order_number || order.id)}` });
      return NextResponse.json({ success:true, url });
    }
  } catch (error) { return fail(error instanceof Error ? error.message : "No se pudo iniciar Clover.",503); }

  if (order.checkout_payment_provider === "clover") return fail("Clover no está activo para este pedido.", 503);

  const stripeCtx = getStoreStripeContext(store);
  if (!stripeCtx) {
    return fail("Esta tienda todavía no tiene pagos con tarjeta activos.", 503);
  }

  const origin = request.headers.get("origin") || `https://${request.headers.get("host")}`;
  const amountCents = Math.round(Number(order.total) * 100);
  // Recargo por pagar con tarjeta — es para Frank, no para la plataforma.
  // Va como línea aparte en el Checkout, nunca mezclado con el precio del
  // pedido, para que quede claro que es un cargo distinto.
  const surchargeCents = Math.round(amountCents * CARD_SURCHARGE_RATE);
  // Misma comisión de plataforma que ya usa el resto de la app — solo
  // aplica en modo "connect" (cuenta conectada), y solo sobre el precio
  // del pedido, no sobre el recargo (el recargo es de Frank, no se reparte
  // con la plataforma). En modo "direct" no hay application_fee_amount: la
  // comisión ya va incluida en el precio.
  const PLATFORM_FEE_RATE = 0.02;
  // Al retomar el pago se respeta el fijo registrado en esa orden.
  const fixedPlatformFeeCents = Math.round(
    Number(order.platform_fixed_fee_amount ?? PLATFORM_ORDER_FIXED_FEE) * 100
  );
  const applicationFeeCents = Math.min(
    amountCents,
    Math.round(amountCents * PLATFORM_FEE_RATE) + fixedPlatformFeeCents
  );

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
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Recargo por pago con tarjeta (${(CARD_SURCHARGE_RATE * 100).toFixed(1)}%)` },
            unit_amount: surchargeCents,
          },
          quantity: 1,
        },
      ],
      ...(stripeCtx.applyPlatformFee
        ? { payment_intent_data: { application_fee_amount: applicationFeeCents } }
        : {}),
      success_url: `${origin}/tienda/pago-exitoso?order=${encodeURIComponent(order.order_number || order.id)}`,
      cancel_url: `${origin}/tienda/pago-cancelado?order=${encodeURIComponent(order.order_number || order.id)}`,
      // Vencimiento corto (30 min, el mínimo que permite Stripe) para que
      // un cliente que abre el link y no completa el pago no deje la
      // orden en un limbo ambiguo por horas — a los 30 min Stripe manda
      // el evento checkout.session.expired y el webhook marca la orden
      // como pago no completado y devuelve el stock. Ver
      // lib/services/stripe-webhook-handler.ts.
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      metadata: {
        order_id: order.id,
        store_id: storeId,
      },
    },
    stripeCtx.requestOptions
  );

  return NextResponse.json({ success: true, url: session.url });
}
