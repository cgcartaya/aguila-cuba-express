import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const ALLOWED_EVENTS = new Set([
  "page_view", "product_view", "menu_item_view", "add_to_cart", "view_cart",
  "begin_checkout", "reservation_started", "reservation_completed", "order_created",
]);
const clean = (value: unknown, max = 180) => String(value ?? "").trim().slice(0, max);
const optional = (value: unknown, max = 180) => clean(value, max) || null;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const incoming = Array.isArray(body?.events) ? body.events.slice(0, 25) : [];
  if (incoming.length === 0) return NextResponse.json({ ok: false }, { status: 400 });

  const rows = incoming
    .filter((event: Record<string, unknown>) => ALLOWED_EVENTS.has(clean(event.eventName, 40)))
    .map((event: Record<string, unknown>) => ({
      store_id: clean(event.storeId, 64),
      event_name: clean(event.eventName, 40),
      visitor_id: clean(event.visitorId, 100),
      session_id: clean(event.sessionId, 100),
      product_id: optional(event.productId, 100),
      menu_item_id: optional(event.menuItemId, 100),
      combo_id: optional(event.comboId, 100),
      order_id:
        event.eventName === "order_created" &&
        (event.metadata as { source?: unknown } | undefined)?.source !== "menu"
          ? optional(event.orderId, 100)
          : null,
      item_name: optional(event.itemName, 220),
      quantity: Math.max(0, Math.min(9999, Number(event.quantity) || 0)),
      value: Math.max(0, Math.min(99999999, Number(event.value) || 0)),
      path: optional(event.path, 300),
      campaign_source: optional(event.source, 120),
      campaign_medium: optional(event.medium, 120),
      campaign_name: optional(event.campaign, 160),
      campaign_content: optional(event.content, 160),
      metadata: event.metadata && typeof event.metadata === "object" ? event.metadata : {},
    }))
    .filter((row: { store_id: string; visitor_id: string; session_id: string }) => Boolean(row.store_id && row.visitor_id && row.session_id));

  if (rows.length === 0) return NextResponse.json({ ok: false }, { status: 400 });
  const { error } = await supabaseAdmin.from("analytics_events").insert(rows);
  if (error) {
    console.error("Error guardando analítica:", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // Limpieza oportunista: aproximadamente una de cada 100 tandas elimina
  // eventos detallados antiguos sin necesitar otro cron ni otra Function.
  if (Math.random() < 0.01) {
    const cutoff = new Date(Date.now() - 90 * 86400000).toISOString();
    await supabaseAdmin.from("analytics_events").delete().lt("created_at", cutoff);
  }
  return NextResponse.json({ ok: true, accepted: rows.length });
}
