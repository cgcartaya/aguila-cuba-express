import { NextRequest, NextResponse } from "next/server";
import { requireStripe } from "@/lib/services/stripe-admin";
import { handleStripeWebhookEvent } from "@/lib/services/stripe-webhook-handler";

// Webhook de la PLATAFORMA — para tiendas en modo "connect" (cuentas
// conectadas v2). Firmado con STRIPE_WEBHOOK_SECRET, usando la secret key
// de la plataforma. Para tiendas en modo "direct" ver en su lugar
// app/api/webhooks/stripe-direct/[storeId]/route.ts.
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

  await handleStripeWebhookEvent(event);

  return NextResponse.json({ received: true });
}
