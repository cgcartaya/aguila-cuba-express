import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { STRIPE_API_VERSION } from "@/lib/services/stripe-admin";
import { handleStripeWebhookEvent } from "@/lib/services/stripe-webhook-handler";

// Webhook para tiendas en modo "direct" — cuenta de Stripe PROPIA de la
// tienda, sin relación de Connect con la plataforma. Cada tienda en modo
// "direct" configura, en SU PROPIO dashboard de Stripe, un endpoint que
// apunte aquí:
//
//   https://tu-dominio.com/api/webhooks/stripe-direct/<store_id>
//
// y copia el "Signing secret" que Stripe le da ahí dentro de
// stores.stripe_direct_webhook_secret (Ajustes → Pagos, en el admin).
// El store_id en la URL es lo que nos dice de cuál tienda es el evento —
// no hace falta (ni se debe) confiar en session.metadata para eso, porque
// la cuenta que firma este webhook es la del dueño de la tienda, no la
// de la plataforma.
export async function POST(request: NextRequest, { params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  if (!storeId) return NextResponse.json({ error: "Falta store_id en la URL." }, { status: 400 });

  const { data: store, error } = await supabaseAdmin
    .from("stores")
    .select("id, stripe_mode, stripe_direct_secret_key, stripe_direct_webhook_secret")
    .eq("id", storeId)
    .maybeSingle();

  if (error || !store) return NextResponse.json({ error: "Tienda no encontrada." }, { status: 404 });
  if (store.stripe_mode !== "direct" || !store.stripe_direct_secret_key || !store.stripe_direct_webhook_secret) {
    return NextResponse.json({ error: "Esta tienda no tiene configurado el modo directo." }, { status: 400 });
  }

  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  // constructEvent solo valida la firma (criptografía local) — no llama a
  // la API de Stripe, así que cualquier instancia sirve. Usamos la secret
  // key propia de la tienda por prolijidad, aunque no es estrictamente
  // necesaria para este paso.
  const directStripe = new Stripe(store.stripe_direct_secret_key, {
    apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion,
  });

  let event;
  try {
    event = directStripe.webhooks.constructEvent(rawBody, signature || "", store.stripe_direct_webhook_secret);
  } catch (err) {
    return NextResponse.json({ error: `Firma inválida: ${(err as Error).message}` }, { status: 400 });
  }

  await handleStripeWebhookEvent(event, storeId);

  return NextResponse.json({ received: true });
}
