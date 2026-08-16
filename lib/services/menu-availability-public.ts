import { supabaseAdmin } from "@/lib/supabase-admin";

/*
 * SOLO SERVIDOR. Combina las dos formas de inventario en un solo
 * mapa de "cuánto queda" por platillo, para que tanto el portal
 * público (mostrar "Quedan 12" / "Agotado") como la validación al
 * crear una orden usen exactamente el mismo cálculo — nunca deben
 * poder desincronizarse.
 *
 * null en el mapa = ese platillo no tiene ninguna restricción
 * (ni cupo diario ni inventario permanente) — se puede pedir sin
 * límite. Un número = eso es lo que queda ahora mismo (0 = agotado).
 */

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

export async function getMenuAvailabilityMap(
  storeId: string,
  date = todayISO()
): Promise<Record<string, number | null>> {
  const map: Record<string, number | null> = {};

  const { data: items } = await supabaseAdmin
    .from("menu_items")
    .select("id, stock, daily_stock_enabled")
    .eq("store_id", storeId)
    .eq("is_active", true);

  const dailyItemIds = (items || []).filter((i) => i.daily_stock_enabled).map((i) => i.id);

  let dailyStockByItem = new Map<string, number>();
  let soldTodayByItem = new Map<string, number>();

  if (dailyItemIds.length > 0) {
    const [{ data: quotas }, { data: orderItems }] = await Promise.all([
      supabaseAdmin
        .from("menu_daily_stock")
        .select("menu_item_id, quantity")
        .eq("store_id", storeId)
        .eq("stock_date", date)
        .in("menu_item_id", dailyItemIds),
      supabaseAdmin
        .from("menu_order_items")
        .select("menu_item_id, quantity, menu_orders!inner(store_id, status, created_at)")
        .eq("menu_orders.store_id", storeId)
        .neq("menu_orders.status", "cancelled")
        .gte("menu_orders.created_at", `${date}T00:00:00`)
        .lte("menu_orders.created_at", `${date}T23:59:59`)
        .in("menu_item_id", dailyItemIds),
    ]);

    dailyStockByItem = new Map((quotas || []).map((q) => [q.menu_item_id, q.quantity]));

    for (const row of (orderItems || []) as { menu_item_id: string | null; quantity: number }[]) {
      if (!row.menu_item_id) continue;
      soldTodayByItem.set(row.menu_item_id, (soldTodayByItem.get(row.menu_item_id) || 0) + row.quantity);
    }
  }

  for (const item of items || []) {
    if (item.daily_stock_enabled) {
      // Sin cupo puesto hoy = no disponible para pedir en línea ese
      // día (no "ilimitado") — el negocio tiene que decir cuántos
      // tiene cada día para que esto tenga sentido.
      const quota = dailyStockByItem.has(item.id) ? dailyStockByItem.get(item.id)! : 0;
      const sold = soldTodayByItem.get(item.id) || 0;
      map[item.id] = Math.max(0, quota - sold);
      continue;
    }

    if (item.stock !== null) {
      map[item.id] = item.stock;
      continue;
    }

    map[item.id] = null;
  }

  return map;
}
