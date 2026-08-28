import { supabaseAdmin } from "@/lib/supabase-admin";
import type { MenuChannelAvailability } from "@/lib/menu/types";

async function restaurantDateISO(storeId: string) {
  const { data } = await supabaseAdmin
    .from("store_settings")
    .select("menu_timezone")
    .eq("store_id", storeId)
    .maybeSingle();

  const timeZone = data?.menu_timezone || "America/Havana";

  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export async function getMenuAvailabilityMap(
  storeId: string,
  requestedDate?: string
): Promise<Record<string, number | null>> {
  const date = requestedDate || (await restaurantDateISO(storeId));
  const map: Record<string, number | null> = {};

  const { data: items } = await supabaseAdmin
    .from("menu_items")
    .select("id, stock, daily_stock_enabled, manual_unavailable")
    .eq("store_id", storeId)
    .eq("is_active", true);

  const dailyItemIds = (items || [])
    .filter((i) => i.daily_stock_enabled)
    .map((i) => i.id);

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

    dailyStockByItem = new Map(
      (quotas || []).map((q) => [q.menu_item_id, q.quantity])
    );

    for (const row of (orderItems || []) as {
      menu_item_id: string | null;
      quantity: number;
    }[]) {
      if (!row.menu_item_id) continue;
      soldTodayByItem.set(
        row.menu_item_id,
        (soldTodayByItem.get(row.menu_item_id) || 0) + row.quantity
      );
    }
  }

  for (const item of items || []) {
    if (item.manual_unavailable) {
      map[item.id] = 0;
      continue;
    }

    if (item.daily_stock_enabled) {
      const quota = dailyStockByItem.has(item.id)
        ? dailyStockByItem.get(item.id)!
        : 0;
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

export async function getMenuChannelAvailabilityMap(
  storeId: string,
  requestedDate?: string
): Promise<Record<string, MenuChannelAvailability>> {
  const date = requestedDate || (await restaurantDateISO(storeId));
  const { data: items } = await supabaseAdmin
    .from("menu_items")
    .select(
      "id, available_dine_in, available_takeaway, available_delivery, delivery_paused_date, delivery_pause_reason"
    )
    .eq("store_id", storeId)
    .eq("is_active", true);

  return Object.fromEntries(
    (items || []).map((item) => {
      const deliveryPausedToday = item.delivery_paused_date === date;
      const permanentlyRestaurantOnly = item.available_delivery === false;
      const restaurantOnly = deliveryPausedToday || permanentlyRestaurantOnly;

      const reason = deliveryPausedToday
        ? item.delivery_pause_reason || "Solo disponible para consumir en el restaurante hoy"
        : permanentlyRestaurantOnly
          ? item.delivery_pause_reason || "Solo disponible para consumir en el restaurante"
          : null;

      return [
        item.id,
        {
          dine_in: item.available_dine_in !== false,
          // Regla comercial: si no sale por delivery tampoco sale para recogida.
          // Conservamos las columnas existentes, pero exponemos una única regla
          // coherente a menú, carrito y checkout.
          takeaway: restaurantOnly ? false : item.available_takeaway !== false,
          delivery: restaurantOnly ? false : item.available_delivery !== false,
          delivery_reason: reason,
        },
      ];
    })
  );
}
