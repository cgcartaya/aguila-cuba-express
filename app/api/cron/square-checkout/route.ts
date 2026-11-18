import { supabaseAdmin } from "@/lib/supabase-admin";
import { squareRequest } from "@/lib/payments/square";
import { readSquareSettings, squareAccessToken } from "@/lib/services/square-admin";

export const maxDuration = 60;

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const { data: sessions, error } = await supabaseAdmin.from("square_payment_sessions")
    .select("id,store_id,environment,merchant_id,payment_link_id,square_order_id")
    .eq("status", "pending").lt("expires_at", new Date().toISOString()).order("expires_at").limit(20);
  if (error) return Response.json({ error: "No se pudieron consultar los cobros vencidos." }, { status: 503 });
  const results = await Promise.allSettled(sessions.map(async (session) => {
    const settings = await readSquareSettings(session.store_id);
    if (!settings || settings.environment !== session.environment || settings.merchant_id !== session.merchant_id) {
      throw new Error("Conexión Square no disponible.");
    }
    const token = await squareAccessToken(session.store_id, settings);
    const authorization = `Bearer ${token}`;
    // A previous execution might have canceled the link before saving the local result.
    await squareRequest(settings.environment, `/v2/online-checkout/payment-links/${encodeURIComponent(session.payment_link_id)}`, {
      method: "DELETE", authorization,
    }).catch(() => null);
    const { order } = await squareRequest<{ order: { state: string; tenders?: unknown[] } }>(
      settings.environment, `/v2/orders/${encodeURIComponent(session.square_order_id)}`, { authorization },
    );
    if (order.state === "CANCELED" && !order.tenders?.length) {
      const { error: expirationError } = await supabaseAdmin.rpc("expire_square_order", { p_session_id: session.id });
      if (expirationError) throw expirationError;
      return;
    }
    if (order.state === "COMPLETED" || order.state === "CANCELED") {
      const { error: reviewError } = await supabaseAdmin.from("square_payment_sessions")
        .update({ status: "review" }).eq("id", session.id).eq("status", "pending");
      if (reviewError) throw reviewError;
      return;
    }
    throw new Error("Square todavía permite el pago.");
  }));
  const failures = results.filter((result) => result.status === "rejected").length;
  return Response.json({ checked: sessions.length, failures }, { status: failures ? 503 : 200 });
}
