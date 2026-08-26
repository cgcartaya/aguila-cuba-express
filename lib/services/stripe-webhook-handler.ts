import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createPaymentReceipt } from "@/lib/services/receipts";
import { restoreOrderStockServerSide } from "@/lib/services/order-stock-admin";

/**
 * Lógica compartida para procesar eventos de Stripe, sin importar si
 * vinieron por el webhook de plataforma (cuentas conectadas / "connect")
 * o por el webhook directo de una tienda en modo "direct". La firma
 * (quién puede confiar en el evento) ya se validó antes de llamar esto —
 * ver app/api/webhooks/stripe/route.ts y
 * app/api/webhooks/stripe-direct/[storeId]/route.ts.
 *
 * knownStoreId: en modo "direct" ya sabemos de qué tienda es el evento
 * (viene en la URL), así que se lo pasamos aquí en vez de depender de
 * session.metadata.store_id — un poco más a prueba de fallos.
 */
export async function handleStripeWebhookEvent(
  event: Stripe.Event,
  knownStoreId?: string
) {
  if (event.type === "account.updated") {
    // Solo aplica al modo "connect" (cuentas conectadas viven bajo la
    // plataforma). En modo "direct" no se recibe este tipo de evento
    // porque no hay relación de cuenta conectada.
    const account = event.data.object as {
      id: string;
      charges_enabled: boolean;
      details_submitted: boolean;
    };
    await supabaseAdmin
      .from("stores")
      .update({
        stripe_charges_enabled: account.charges_enabled,
        stripe_details_submitted: account.details_submitted,
      })
      .eq("stripe_account_id", account.id);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id: string;
      amount_total?: number | null;
      metadata?: Record<string, string>;
    };
    const shipmentId = session.metadata?.shipment_id;
    const orderId = session.metadata?.order_id;

    const metadataStoreId = knownStoreId || session.metadata?.store_id;

    if (orderId && metadataStoreId) {
      // Pedido de tienda: el evento solo puede modificar la orden
      // indicada dentro del mismo tenant que quedó grabado en Stripe.
      const chargedTotal =
        typeof session.amount_total === "number"
          ? Math.round(session.amount_total) / 100
          : null;

      await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "paid",
          ...(chargedTotal != null ? { total: chargedTotal } : {}),
        })
        .eq("id", orderId)
        .eq("store_id", metadataStoreId)
        .is("deleted_at", null);
    }

    if (shipmentId) {
      let shipmentQuery = supabaseAdmin
        .from("shipments")
        .select("id, store_id, service_price, balance_due")
        .eq("id", shipmentId)
        .is("deleted_at", null);

      if (metadataStoreId) {
        shipmentQuery = shipmentQuery.eq("store_id", metadataStoreId);
      }

      const { data: shipment } = await shipmentQuery.maybeSingle();

      if (shipment) {
        // El recibo debe reflejar lo que se cobró EN ESTA transacción, no
        // el total de la factura — importante si el envío ya traía un
        // pago parcial anterior (efectivo o tarjeta).
        const amountCollectedNow = Number(shipment.balance_due || 0);

        await supabaseAdmin
          .from("shipments")
          .update({
            amount_paid: shipment.service_price,
            balance_due: 0,
            payment_status: "paid",
            payment_method: "card",
          })
          .eq("id", shipmentId)
          .eq("store_id", shipment.store_id)
          .is("deleted_at", null);

        // Recibo de pago inmutable con folio consecutivo — separado de la
        // factura, que se genera desde que se crea el envío.
        const receiptStoreId = metadataStoreId || shipment.store_id;
        if (receiptStoreId && amountCollectedNow > 0) {
          await createPaymentReceipt({
            storeId: receiptStoreId,
            shipmentId: shipment.id,
            amount: amountCollectedNow,
            paymentMethod: "card",
            stripeCheckoutSessionId: session.id,
          });
        }
      }

      let paymentSessionQuery = supabaseAdmin
        .from("shipment_payment_sessions")
        .update({ status: "paid" })
        .eq("stripe_checkout_session_id", session.id);

      if (metadataStoreId) {
        paymentSessionQuery = paymentSessionQuery.eq("store_id", metadataStoreId);
      }

      await paymentSessionQuery;
    }
  }

  if (event.type === "checkout.session.expired") {
    // La sesión de pago venció sin completarse (ver expires_at en
    // app/api/checkout/pay-with-card/route.ts, 30 min). Antes esto no se
    // escuchaba y la orden se quedaba en "pending" para siempre, sin
    // forma de saber si el cliente todavía iba a pagar o ya no.
    const session = event.data.object as { id: string; metadata?: Record<string, string> };
    const orderId = session.metadata?.order_id;
    const metadataStoreId = knownStoreId || session.metadata?.store_id;

    if (orderId && metadataStoreId) {
      // Update condicionado: solo marca como "expired" (y solo devuelve
      // stock) si la orden seguía genuinamente pendiente. Si ya estaba
      // pagada (carrera rara: el cliente pagó justo cuando venció) o si
      // ya se había marcado antes (reintento de Stripe reenviando el
      // mismo webhook), no hace nada — evita duplicar la devolución de
      // stock y evita pisar una orden que sí se pagó.
      const { data: updatedOrders } = await supabaseAdmin
        .from("orders")
        .update({ payment_status: "expired" })
        .eq("id", orderId)
        .eq("store_id", metadataStoreId)
        .eq("payment_status", "pending")
        .eq("stock_restored", false)
        .is("deleted_at", null)
        .select("id");

      if (updatedOrders && updatedOrders.length > 0) {
        await restoreOrderStockServerSide(orderId);
        await supabaseAdmin
          .from("orders")
          .update({ stock_restored: true })
          .eq("id", orderId);
      }
    }
  }
}
