// Guardar en: app/api/cron/reminders/route.ts
//
// RECORDATORIOS AUTOMÁTICOS — carrito abandonado + orden sin pagar.
//
// Pensado para correr cada 30 min vía Vercel Cron (ver vercel.json).
// Protegido con CRON_SECRET: Vercel manda automáticamente el header
// "authorization: Bearer <CRON_SECRET>" cuando el cron está configurado
// con esa variable de entorno — cualquier otra llamada se rechaza.
//
// No manda WhatsApp (eso requeriría la API de WhatsApp Business de
// Meta, que no está integrada todavía) — solo email vía Resend, y deja
// todo lo que no se pudo contactar por email visible en el panel de
// admin (Marketing → Recordatorios) para que alguien lo mande por
// WhatsApp con un clic.
//
// Nunca lanza: cada envío individual está en su propio try/catch para
// que un error con un cliente no tumbe el resto de la corrida.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendAbandonedCartEmail, sendUnpaidOrderEmail } from "@/lib/notifications/reminder-email";

export const maxDuration = 60;

// Antes de este tiempo desde la última actividad, se considera que la
// persona todavía puede estar comprando — no se le manda nada.
const CART_MIN_IDLE_MINUTES = 60;
// Después de este tiempo, el snapshot es demasiado viejo para ser útil
// (productos/stock/precios pudieron cambiar) — se ignora.
const CART_MAX_AGE_HOURS = 48;

const ORDER_MIN_PENDING_MINUTES = 120;
const ORDER_MAX_AGE_HOURS = 48;

// LÍMITE DE VIDA: pasado este tiempo sin actividad, el carrito abandonado
// se borra de verdad de la base de datos (no solo deja de mostrarse).
// Es solo un snapshot de seguimiento, no un pedido real, así que
// borrarlo no afecta ventas ni contabilidad.
const CART_DELETE_AFTER_DAYS = 5;

function getBaseUrl(store: { domain?: string | null }) {
  if (store.domain) {
    return `https://${store.domain.replace(/^https?:\/\//, "").replace(/^www\./, "")}`;
  }
  return "https://perlamarketplace.com";
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const now = Date.now();
  const cartMinIdleCutoff = new Date(now - CART_MIN_IDLE_MINUTES * 60 * 1000).toISOString();
  const cartMaxAgeCutoff = new Date(now - CART_MAX_AGE_HOURS * 60 * 60 * 1000).toISOString();
  const orderMinPendingCutoff = new Date(now - ORDER_MIN_PENDING_MINUTES * 60 * 1000).toISOString();
  const orderMaxAgeCutoff = new Date(now - ORDER_MAX_AGE_HOURS * 60 * 60 * 1000).toISOString();

  let cartsEmailed = 0;
  let cartsSkippedNoEmail = 0;
  let ordersEmailed = 0;
  let ordersSkippedNoEmail = 0;

  // ---------------------------------------------------------
  // 1) Carritos abandonados
  // ---------------------------------------------------------
  const { data: abandonedCarts, error: cartsError } = await supabaseAdmin
    .from("checkout_abandonment")
    .select("id, store_id, customer_name, customer_email, items, subtotal")
    .is("converted_at", null)
    .is("email_reminded_at", null)
    .lte("last_seen_at", cartMinIdleCutoff)
    .gte("last_seen_at", cartMaxAgeCutoff)
    .not("customer_email", "is", null)
    .limit(200);

  if (cartsError) {
    console.error("Error leyendo checkout_abandonment:", cartsError);
  }

  if (abandonedCarts && abandonedCarts.length > 0) {
    const storeIds = Array.from(new Set(abandonedCarts.map((c) => c.store_id)));
    const { data: stores } = await supabaseAdmin
      .from("stores")
      .select("id, name, slug, domain")
      .in("id", storeIds);
    const storeById = new Map((stores || []).map((s) => [s.id, s]));

    for (const cartRow of abandonedCarts) {
      try {
        if (!cartRow.customer_email) {
          cartsSkippedNoEmail++;
          continue;
        }

        const store = storeById.get(cartRow.store_id);
        const storeName = store?.name || "la tienda";
        const baseUrl = getBaseUrl(store || {});
        const checkoutUrl = `${baseUrl}/tienda/${store?.slug || ""}/checkout`;

        const result = await sendAbandonedCartEmail({
          to: cartRow.customer_email,
          storeName,
          customerName: cartRow.customer_name || "",
          items: Array.isArray(cartRow.items) ? cartRow.items : [],
          subtotal: Number(cartRow.subtotal || 0),
          checkoutUrl,
        });

        if (result.sent) {
          cartsEmailed++;
          await supabaseAdmin
            .from("checkout_abandonment")
            .update({ email_reminded_at: new Date().toISOString() })
            .eq("id", cartRow.id);
        }
      } catch (err) {
        console.error("Error mandando recordatorio de carrito abandonado:", err);
      }
    }
  }

  // ---------------------------------------------------------
  // 2) Órdenes sin pagar
  // ---------------------------------------------------------
  const { data: unpaidOrders, error: ordersError } = await supabaseAdmin
    .from("orders")
    .select("id, order_number, store_id, customer_id, total, created_at")
    .eq("payment_status", "pending")
    .is("deleted_at", null)
    .is("email_reminded_at", null)
    .lte("created_at", orderMinPendingCutoff)
    .gte("created_at", orderMaxAgeCutoff)
    .limit(200);

  if (ordersError) {
    console.error("Error leyendo órdenes sin pagar:", ordersError);
  }

  if (unpaidOrders && unpaidOrders.length > 0) {
    const storeIds = Array.from(new Set(unpaidOrders.map((o) => o.store_id).filter(Boolean)));
    const customerIds = Array.from(new Set(unpaidOrders.map((o) => o.customer_id).filter(Boolean)));

    const [{ data: stores }, { data: customers }] = await Promise.all([
      supabaseAdmin.from("stores").select("id, name, slug, domain").in("id", storeIds),
      customerIds.length > 0
        ? supabaseAdmin.from("customers").select("id, name, email").in("id", customerIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const storeById = new Map((stores || []).map((s) => [s.id, s]));
    const customerById = new Map((customers || []).map((c) => [c.id, c]));

    for (const order of unpaidOrders) {
      try {
        const customer = order.customer_id ? customerById.get(order.customer_id) : null;

        if (!customer?.email) {
          ordersSkippedNoEmail++;
          continue;
        }

        const store = order.store_id ? storeById.get(order.store_id) : null;
        const storeName = store?.name || "la tienda";
        const baseUrl = getBaseUrl(store || {});
        const publicNumber = order.order_number || order.id;
        const orderUrl = `${baseUrl}/pedido/${encodeURIComponent(publicNumber)}`;

        const result = await sendUnpaidOrderEmail({
          to: customer.email,
          storeName,
          customerName: customer.name || "",
          orderNumber: publicNumber,
          total: Number(order.total || 0),
          orderUrl,
        });

        if (result.sent) {
          ordersEmailed++;
          await supabaseAdmin
            .from("orders")
            .update({ email_reminded_at: new Date().toISOString() })
            .eq("id", order.id);
        }
      } catch (err) {
        console.error("Error mandando recordatorio de orden sin pagar:", err);
      }
    }
  }

  // ---------------------------------------------------------
  // 3) Límite de vida: borrar carritos abandonados viejos de verdad
  // ---------------------------------------------------------
  let cartsDeleted = 0;
  const cartDeleteCutoff = new Date(now - CART_DELETE_AFTER_DAYS * 24 * 60 * 60 * 1000).toISOString();

  try {
    const { data: deletedCarts, error: deleteError } = await supabaseAdmin
      .from("checkout_abandonment")
      .delete()
      .lte("last_seen_at", cartDeleteCutoff)
      .select("id");

    if (deleteError) {
      console.error("Error borrando carritos abandonados vencidos:", deleteError);
    } else {
      cartsDeleted = deletedCarts?.length || 0;
    }
  } catch (err) {
    console.error("Error inesperado borrando carritos abandonados vencidos:", err);
  }

  return NextResponse.json({
    ok: true,
    cartsEmailed,
    cartsSkippedNoEmail,
    cartsDeleted,
    ordersEmailed,
    ordersSkippedNoEmail,
  });
}
