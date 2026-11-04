import { supabaseAdmin } from "@/lib/supabase-admin";
import { CARD_SURCHARGE_RATE } from "@/lib/config/features";

export async function getCloverSettings(storeId: string) {
  const { data, error } = await supabaseAdmin.from("store_clover_settings").select("*").eq("store_id", storeId).maybeSingle();
  if (error) throw new Error("No se pudo consultar Clover.");
  return data;
}

export async function createCloverCheckout(settings: NonNullable<Awaited<ReturnType<typeof getCloverSettings>>>, params: {
  storeId: string; targetType: "order" | "shipment"; targetId: string;
  amountCents: number; name: string; successUrl: string; failureUrl: string;
  customer?: { firstName?: string; lastName?: string; email?: string };
}) {
  const { amountCents, storeId, targetType, targetId } = params;
  if (!settings.enabled || !Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error("Clover no está disponible para este importe.");
  const surcharge = Math.round(amountCents * CARD_SURCHARGE_RATE);
  // Reuse a live checkout. A unique partial index also blocks simultaneous requests.
  const now = new Date().toISOString();
  const { error: expiryError } = await supabaseAdmin.from("clover_payment_sessions").update({ status: "expired" })
    .eq("store_id", storeId).eq("target_type", targetType).eq("target_id", targetId)
    .in("status", ["creating", "pending"]).lt("expires_at", now);
  if (expiryError) throw new Error("No se pudo consultar el pago anterior.");
  const { data: active, error: activeError } = await supabaseAdmin.from("clover_payment_sessions").select("checkout_url,base_cents")
    .eq("store_id", storeId).eq("target_type", targetType).eq("target_id", targetId).in("status", ["creating", "pending"]).maybeSingle();
  if (activeError) throw new Error("No se pudo consultar el pago anterior.");
  if (active) {
    if (active.checkout_url && Number(active.base_cents) === amountCents) return active.checkout_url as string;
    throw new Error("Ya hay un cobro en curso. Espera a que venza antes de iniciar otro.");
  }
  const { data: reservation, error: insertError } = await supabaseAdmin.from("clover_payment_sessions").insert({
    store_id: storeId, target_type: targetType, target_id: targetId, merchant_id: settings.merchant_id,
    base_cents: amountCents, total_cents: amountCents + surcharge,
  }).select("id").single();
  if (insertError || !reservation) throw new Error("Ya hay un cobro en curso. Intenta de nuevo en unos segundos.");
  // No automatic POST retries: a timeout may still have created a checkout at Clover.
  const base = settings.environment === "sandbox" ? "https://apisandbox.dev.clover.com" : "https://api.clover.com";
  const returnUrl = new URL("/tienda/pago-clover", params.successUrl);
  const destination = new URL(params.successUrl);
  returnUrl.searchParams.set("session", reservation.id);
  returnUrl.searchParams.set("next", destination.pathname + destination.search);
  const response = await fetch(`${base}/invoicingcheckoutservice/v1/checkouts`, {
    method: "POST", signal: AbortSignal.timeout(20000),
    headers: { Authorization: `Bearer ${settings.private_token}`, "X-Clover-Merchant-Id": settings.merchant_id,
      "Content-Type": "application/json", Accept: "application/json", "User-Agent": "PerlaMarketplace/1.0" },
    body: JSON.stringify({ ...(settings.page_config_uuid ? { pageConfigUuid: settings.page_config_uuid } : {}), customer: params.customer || {}, tips: { enabled: false },
      redirectUrls: { success: returnUrl.toString(), failure: params.failureUrl },
      shoppingCart: { lineItems: [ { name: params.name, price: amountCents, unitQty: 1 },
        ...(surcharge > 0 ? [{ name: "Recargo por pago con tarjeta", price: surcharge, unitQty: 1 }] : []) ] },
    }), cache: "no-store",
  });
  if (!response.ok) {
    await supabaseAdmin.from("clover_payment_sessions").update({ status: "failed" }).eq("id", reservation.id);
    throw new Error("Clover rechazó la solicitud. Revisa las credenciales, el entorno y la configuración de Hosted Checkout.");
  }
  const result = await response.json();
  const url = new URL(result.href);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".clover.com") || !result.checkoutSessionId) throw new Error("Respuesta de Clover no válida.");
  const { error: saveError } = await supabaseAdmin.from("clover_payment_sessions").update({
    session_id: result.checkoutSessionId, checkout_url: result.href, status: "pending",
    expires_at: new Date(Number(result.expirationTime) || Date.now() + 16 * 60000).toISOString(),
  }).eq("id", reservation.id);
  if (saveError) throw new Error("No se pudo registrar la sesión de Clover.");
  return result.href as string;
}
