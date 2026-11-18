import { squareConfig, squareRequest } from "@/lib/payments/square";
import type { SquareEnvironment } from "@/lib/payments/square";
import { readSquareSettings, squareAccessToken } from "@/lib/services/square-admin";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type StorePaymentProvider = "stripe" | "clover" | "square";

export function squareWebhookConfig(environment: SquareEnvironment) {
  const prefix = environment === "sandbox" ? "SQUARE_SANDBOX_" : "SQUARE_PRODUCTION_";
  const url = process.env[prefix + "WEBHOOK_URL"] ?? "";
  const key = process.env[prefix + "WEBHOOK_SIGNATURE_KEY"] ?? "";
  if (!url.startsWith("https://") || !key) throw new Error("Webhook Square pendiente de configurar.");
  return { url, key };
}

export async function squareCheckoutAvailable(storeId: string) {
  const settings = await readSquareSettings(storeId);
  if (!settings?.location_id || settings.connection_status !== "connected") return false;
  const gate = settings.environment === "production" ? "SQUARE_ENABLE_PRODUCTION" : "SQUARE_ENABLE_SANDBOX_CHECKOUT";
  if (process.env[gate] !== "true") return false;
  try {
    squareConfig(settings.environment);
    squareWebhookConfig(settings.environment);
    return true;
  } catch {
    return false;
  }
}

export async function createSquareCheckout(input: {
  storeId: string; orderId: string; amountCents: number; name: string; returnUrl: string;
}) {
  const settings = await readSquareSettings(input.storeId);
  if (!settings?.location_id || !await squareCheckoutAvailable(input.storeId)) throw new Error("Square no está disponible.");
  const { error: reservationError } = await supabaseAdmin.from("square_payment_sessions").upsert({
    store_id: input.storeId, order_id: input.orderId, environment: settings.environment,
    merchant_id: settings.merchant_id, location_id: settings.location_id,
    amount_cents: input.amountCents, item_name: input.name,
    return_url: settings.environment === "sandbox"
      ? new URL(new URL(input.returnUrl).pathname, squareConfig("sandbox").redirectUri).toString()
      : input.returnUrl,
  }, { onConflict: "order_id", ignoreDuplicates: true });
  if (reservationError) throw reservationError;
  const { data: session, error } = await supabaseAdmin.from("square_payment_sessions")
    .select("*").eq("store_id", input.storeId).eq("order_id", input.orderId).single();
  if (error || !session || !["creating", "pending"].includes(session.status) ||
      session.environment !== settings.environment || session.merchant_id !== settings.merchant_id ||
      session.amount_cents !== input.amountCents) throw new Error("La sesión Square requiere revisión.");
  if (session.expires_at && Date.parse(session.expires_at) <= Date.now()) {
    throw new Error("El enlace Square está venciendo.");
  }
  if (session.checkout_url) return session.checkout_url as string;
  const accessToken = await squareAccessToken(input.storeId, settings);
  const result = await squareRequest<{ payment_link?: { id: string; order_id: string; url: string } }>(
    settings.environment, "/v2/online-checkout/payment-links", {
      method: "POST", authorization: `Bearer ${accessToken}`,
      body: {
        idempotency_key: session.id,
        quick_pay: { name: session.item_name, location_id: session.location_id,
          price_money: { amount: session.amount_cents, currency: session.currency } },
        checkout_options: { redirect_url: session.return_url, allow_tipping: false },
      },
    },
  );
  const link = result.payment_link;
  if (!link?.id || !link.order_id || !link.url || new URL(link.url).protocol !== "https:") {
    throw new Error("Square no devolvió un enlace válido.");
  }
  const { data, error: saveError } = await supabaseAdmin.from("square_payment_sessions").update({
    payment_link_id: link.id, square_order_id: link.order_id, checkout_url: link.url, status: "pending",
    expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
  }).eq("id", session.id).eq("status", "creating").select("id").maybeSingle();
  if (saveError) throw new Error("No se pudo registrar el enlace Square.");
  if (!data) {
    const { data: current } = await supabaseAdmin.from("square_payment_sessions").select("status,payment_link_id")
      .eq("id", session.id).single();
    if (current?.status !== "pending" || current.payment_link_id !== link.id) {
      throw new Error("La sesión Square cambió.");
    }
  }
  return link.url;
}
