import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

type EventRow = {
  event_name: string;
  session_id: string;
  product_id: string | null;
  menu_item_id: string | null;
  combo_id: string | null;
  item_name: string | null;
  quantity: number | null;
  value: number | string | null;
  campaign_name: string | null;
  created_at: string;
};

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

async function authorize(request: NextRequest, storeId: string) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  const { data } = await supabaseAdmin.auth.getUser(token);
  if (!data.user) return false;
  const { data: profile } = await supabaseAdmin.from("profiles").select("role,active").eq("id", data.user.id).maybeSingle();
  if (!profile?.active) return false;
  if (profile.role === "super_admin") return true;
  const { data: membership } = await supabaseAdmin
    .from("store_users")
    .select("id")
    .eq("store_id", storeId)
    .eq("user_id", data.user.id)
    .eq("active", true)
    .maybeSingle();
  return Boolean(membership);
}

async function loadEvents(storeId: string, since: string) {
  const rows: EventRow[] = [];
  const pageSize = 1000;
  for (let from = 0; from < 10000; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from("analytics_events")
      .select("event_name,session_id,product_id,menu_item_id,combo_id,item_name,quantity,value,campaign_name,created_at")
      .eq("store_id", storeId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...((data || []) as EventRow[]));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

function uniqueSessions(events: EventRow[], eventName: string) {
  return new Set(events.filter((event) => event.event_name === eventName).map((event) => event.session_id)).size;
}

function uniqueSessionsFor(events: EventRow[], eventNames: string[]) {
  const accepted = new Set(eventNames);
  return new Set(events.filter((event) => accepted.has(event.event_name)).map((event) => event.session_id)).size;
}

export async function GET(request: NextRequest) {
  const storeId = String(request.nextUrl.searchParams.get("storeId") || "").trim();
  const days = Math.min(90, Math.max(7, Number(request.nextUrl.searchParams.get("days")) || 30));
  if (!storeId) return fail("Falta la tienda.");
  if (!(await authorize(request, storeId))) return fail("No tienes acceso a esta tienda.", 403);

  const now = new Date();
  const currentSince = new Date(now.getTime() - days * 86400000);
  const previousSince = new Date(now.getTime() - days * 2 * 86400000);

  try {
    const allEvents = await loadEvents(storeId, previousSince.toISOString());
    const current = allEvents.filter((event) => new Date(event.created_at) >= currentSince);
    const previous = allEvents.filter((event) => new Date(event.created_at) < currentSince);

    const visits = uniqueSessions(current, "page_view");
    const orders = current.filter((event) => event.event_name === "order_created");
    const revenue = orders.reduce((sum, event) => sum + Number(event.value || 0), 0);
    const previousVisits = uniqueSessions(previous, "page_view");
    const previousOrders = previous.filter((event) => event.event_name === "order_created");
    const previousRevenue = previousOrders.reduce((sum, event) => sum + Number(event.value || 0), 0);

    const productMap = new Map<string, { id: string; name: string; type: string; visits: Set<string>; adds: number }>();
    for (const event of current) {
      const entityId = event.product_id || event.menu_item_id || event.combo_id;
      const entityType = event.product_id ? "product" : event.menu_item_id ? "menu_item" : event.combo_id ? "combo" : null;
      if (!entityId || !entityType) continue;
      const item = productMap.get(entityId) || {
        id: entityId,
        name: event.item_name || "Elemento sin nombre",
        type: entityType,
        visits: new Set<string>(),
        adds: 0,
      };
      if (event.event_name === "product_view" || event.event_name === "menu_item_view") item.visits.add(event.session_id);
      if (event.event_name === "add_to_cart") item.adds += Math.max(1, Number(event.quantity || 1));
      productMap.set(entityId, item);
    }

    const campaignMap = new Map<string, { name: string; sessions: Set<string>; orders: number }>();
    for (const event of current) {
      if (!event.campaign_name) continue;
      const campaign = campaignMap.get(event.campaign_name) || { name: event.campaign_name, sessions: new Set<string>(), orders: 0 };
      campaign.sessions.add(event.session_id);
      if (event.event_name === "order_created") campaign.orders += 1;
      campaignMap.set(event.campaign_name, campaign);
    }

    const daily = Array.from({ length: days }, (_, index) => {
      const date = new Date(currentSince.getTime() + (index + 1) * 86400000).toISOString().slice(0, 10);
      const dayEvents = current.filter((event) => event.created_at.slice(0, 10) === date);
      return {
        date,
        visits: new Set(dayEvents.filter((event) => event.event_name === "page_view").map((event) => event.session_id)).size,
        orders: dayEvents.filter((event) => event.event_name === "order_created").length,
      };
    });

    const change = (value: number, oldValue: number) => oldValue > 0 ? ((value - oldValue) / oldValue) * 100 : value > 0 ? 100 : 0;

    return NextResponse.json({
      days,
      totals: { visits, orders: orders.length, revenue, conversionRate: visits ? (orders.length / visits) * 100 : 0 },
      comparison: { visits: change(visits, previousVisits), orders: change(orders.length, previousOrders.length), revenue: change(revenue, previousRevenue) },
      funnel: [
        { name: "Visitas", value: visits },
        { name: "Productos o platos vistos", value: uniqueSessionsFor(current, ["product_view", "menu_item_view"]) },
        { name: "Agregaron al carrito", value: uniqueSessions(current, "add_to_cart") },
        { name: "Iniciaron checkout", value: uniqueSessions(current, "begin_checkout") },
        { name: "Órdenes", value: new Set(orders.map((event) => event.session_id)).size },
      ],
      products: Array.from(productMap.values()).map((item) => ({ id: item.id, name: item.name, type: item.type, visits: item.visits.size, adds: item.adds, addRate: item.visits.size ? (item.adds / item.visits.size) * 100 : 0 })).sort((a, b) => b.visits + b.adds - (a.visits + a.adds)).slice(0, 20),
      campaigns: Array.from(campaignMap.values()).map((item) => ({ name: item.name, visits: item.sessions.size, orders: item.orders })).sort((a, b) => b.visits - a.visits).slice(0, 12),
      daily,
      truncated: allEvents.length >= 10000,
    });
  } catch (error) {
    console.error("Error preparando resumen de analítica:", error);
    return fail("No se pudo cargar la analítica.", 500);
  }
}
