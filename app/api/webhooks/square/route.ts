import { revalidateTag } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifySquareSignature } from "@/lib/payments/square";
import { squareWebhookConfig } from "@/lib/services/square-checkout";

export const runtime = "nodejs";
const environments = ["sandbox", "production"] as const;

export async function POST(request: Request) {
  const signature = request.headers.get("x-square-hmacsha256-signature") ?? "";
  const raw = await request.text();
  const environment = environments.find((candidate) => {
    try {
      const { url, key } = squareWebhookConfig(candidate);
      return verifySquareSignature(raw, signature, url, key);
    } catch {
      return false;
    }
  });
  if (!environment) return Response.json({ error: "Firma inválida." }, { status: 401 });
  try {
    const event = JSON.parse(raw);
    if (event.type === "oauth.authorization.revoked") {
      if (typeof event.merchant_id !== "string" || !Number.isFinite(Date.parse(event.created_at))) {
        return Response.json({ error: "Evento incompleto." }, { status: 400 });
      }
      const { error } = await supabaseAdmin.from("store_square_settings").delete()
        .eq("environment", environment).eq("merchant_id", event.merchant_id).lte("connected_at", event.created_at);
      if (error) throw error;
      revalidateTag("payment-availability", { expire: 0 });
      return Response.json({ ok: true });
    }
    const refundEvent = ["refund.created", "refund.updated"].includes(event.type);
    if (!refundEvent && !["payment.created", "payment.updated"].includes(event.type)) return Response.json({ ok: true });
    const payment = event.data?.object?.payment;
    const refund = event.data?.object?.refund;
    if ((!refundEvent && payment?.status !== "COMPLETED") || (refundEvent && refund?.status !== "COMPLETED")) {
      return Response.json({ ok: true });
    }
    const paymentId = refundEvent ? refund?.payment_id : payment?.id;
    if (typeof paymentId !== "string" || typeof event.event_id !== "string" || typeof event.merchant_id !== "string") {
      return Response.json({ error: "Evento incompleto." }, { status: 400 });
    }
    if (!refundEvent && typeof payment.order_id !== "string") return Response.json({ ok: true });
    if (!refundEvent && (!Number.isSafeInteger(payment.total_money?.amount) || typeof payment.total_money?.currency !== "string")) {
      return Response.json({ error: "El pago no contiene un importe verificable." }, { status: 400 });
    }
    const { data: session, error } = await supabaseAdmin.from("square_payment_sessions").select("id")
      .eq("environment", environment).eq("merchant_id", event.merchant_id)
      .eq(refundEvent ? "payment_id" : "square_order_id", refundEvent ? paymentId : payment.order_id)
      .maybeSingle();
    if (error) throw error;
    if (!session) {
      // A refund can arrive before its payment notification has been applied.
      return Response.json({ ok: !refundEvent }, { status: refundEvent ? 503 : 200 });
    }
    const { error: settlementError } = await supabaseAdmin.rpc("settle_square_order", {
      p_session_id: session.id, p_event_id: event.event_id, p_event_type: event.type,
      p_payment_id: paymentId, p_location_id: payment?.location_id ?? null,
      p_amount_cents: payment?.total_money?.amount ?? null, p_currency: payment?.total_money?.currency ?? null,
    });
    if (settlementError) throw settlementError;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "No se pudo procesar el evento Square." }, { status: 503 });
  }
}
