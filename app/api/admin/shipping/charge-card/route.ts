import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStoreStripeContext } from "@/lib/services/stripe-admin";

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

// Mismo patrón que mark-paid-cash: cualquier miembro activo de la tienda
// puede cobrar, no solo OWNER/ADMIN.
async function access(request: NextRequest, storeId: string) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return fail("No se recibió la sesión.", 401);
  const { data } = await supabaseAdmin.auth.getUser(token);
  if (!data.user) return fail("Sesión inválida.", 401);
  const { data: profile } = await supabaseAdmin.from("profiles").select("role,active").eq("id", data.user.id).maybeSingle();
  if (!profile?.active) return fail("Usuario inactivo.", 403);
  if (profile.role === "super_admin") return null;
  const { data: membership } = await supabaseAdmin.from("store_users").select("active").eq("store_id", storeId).eq("user_id", data.user.id).eq("active", true).maybeSingle();
  if (!membership) return fail("No tienes acceso a esta tienda.", 403);
  return null;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const shipmentId = String(body.shipmentId || "").trim();
  // "tablet" = se abre aquí mismo, en el dispositivo de quien cobra.
  // "customer" = el link se manda por WhatsApp o por QR para que el
  // cliente pague desde su propio teléfono; en ese caso no podemos
  // mandarlo de vuelta al panel admin (no tiene sesión), así que usa
  // las mismas páginas públicas que ya usa el portal de clientes.
  const deliveryChannel = body.deliveryChannel === "customer" ? "customer" : "tablet";
  if (!shipmentId) return fail("Falta el envío.");

  const { data: shipment, error } = await supabaseAdmin
    .from("shipments")
    .select("id, store_id, tracking_code, balance_due, payment_status")
    .eq("id", shipmentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !shipment) return fail("Envío no encontrado.", 404);

  const denied = await access(request, shipment.store_id);
  if (denied) return denied;

  if (shipment.payment_status === "paid" || Number(shipment.balance_due) <= 0) {
    return fail("Este envío no tiene saldo pendiente.");
  }

  const { data: store, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id, name, stripe_mode, stripe_account_id, stripe_charges_enabled, stripe_direct_secret_key")
    .eq("id", shipment.store_id)
    .maybeSingle();

  if (storeError || !store) return fail("Tienda no encontrada.", 404);

  const stripeCtx = getStoreStripeContext(store);
  if (!stripeCtx) {
    return fail("Esta tienda todavía no tiene cobros con tarjeta activos.", 503);
  }

  const origin = request.headers.get("origin") || `https://${request.headers.get("host")}`;
  const amountCents = Math.round(Number(shipment.balance_due) * 100);
  // 2% — misma comisión que el portal de clientes. Solo aplica en modo
  // "connect"; en "direct" no hay cuenta conectada donde repartirla.
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
            product_data: { name: `Envío ${shipment.tracking_code || shipment.id.slice(0, 8)} (cobro en recogida)` },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      ...(stripeCtx.applyPlatformFee
        ? { payment_intent_data: { application_fee_amount: applicationFeeCents } }
        : {}),
      success_url:
        deliveryChannel === "customer"
          ? `${origin}/portal/pago-exitoso?tracking=${encodeURIComponent(shipment.tracking_code || "")}`
          : `${origin}/admin/shipping/recoger?cobrado=1&shipment=${shipment.id}`,
      cancel_url:
        deliveryChannel === "customer"
          ? `${origin}/portal/pago-cancelado`
          : `${origin}/admin/shipping/recoger?cancelado=1&shipment=${shipment.id}`,
      metadata: { shipment_id: shipment.id, store_id: store.id, channel: `pickup-${deliveryChannel}` },
    },
    stripeCtx.requestOptions
  );

  await supabaseAdmin.from("shipment_payment_sessions").insert({
    store_id: store.id,
    shipment_id: shipment.id,
    stripe_checkout_session_id: session.id,
    amount: shipment.balance_due,
  });

  return NextResponse.json({ ok: true, url: session.url });
}
