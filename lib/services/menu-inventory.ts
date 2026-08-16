import { supabase } from "@/lib/supabase";

import type { DailyStockRow, PermanentStockRow } from "@/lib/menu/types";

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

/* =========================================================
   PLATOS DEL DÍA (cupo diario)
========================================================= */

export async function getDailyStockDashboard(storeId: string, date = todayISO()) {
  const [{ data: items, error: itemsError }, { data: stockRows, error: stockError }, { data: orderItems, error: soldError }] =
    await Promise.all([
      supabase
        .from("menu_items")
        .select("id, name")
        .eq("store_id", storeId)
        .eq("daily_stock_enabled", true)
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from("menu_daily_stock")
        .select("menu_item_id, quantity")
        .eq("store_id", storeId)
        .eq("stock_date", date),
      // Vendido hoy = suma de líneas de órdenes NO canceladas creadas
      // hoy para cada platillo. Se calcula al vuelo (no se guarda un
      // contador aparte) para que nunca se desincronice de las
      // órdenes reales — cancelar una orden libera cupo automático.
      supabase
        .from("menu_order_items")
        .select("menu_item_id, quantity, menu_orders!inner(store_id, status, created_at)")
        .eq("menu_orders.store_id", storeId)
        .neq("menu_orders.status", "cancelled")
        .gte("menu_orders.created_at", `${date}T00:00:00`)
        .lte("menu_orders.created_at", `${date}T23:59:59`),
    ]);

  if (itemsError) console.error("getDailyStockDashboard items error:", itemsError.message);
  if (stockError) console.error("getDailyStockDashboard stock error:", stockError.message);
  if (soldError) console.error("getDailyStockDashboard sold error:", soldError.message);

  const quantityByItem = new Map((stockRows || []).map((r) => [r.menu_item_id, r.quantity]));

  const soldByItem = new Map<string, number>();
  for (const row of (orderItems || []) as { menu_item_id: string | null; quantity: number }[]) {
    if (!row.menu_item_id) continue;
    soldByItem.set(row.menu_item_id, (soldByItem.get(row.menu_item_id) || 0) + row.quantity);
  }

  const rows: DailyStockRow[] = (items || []).map((item) => {
    const quantity = quantityByItem.has(item.id) ? quantityByItem.get(item.id)! : null;
    const sold = soldByItem.get(item.id) || 0;
    return {
      menu_item_id: item.id,
      item_name: item.name,
      quantity,
      sold,
      remaining: quantity === null ? null : Math.max(0, quantity - sold),
    };
  });

  return rows;
}

export async function setDailyStockQuantity(storeId: string, menuItemId: string, quantity: number, date = todayISO()) {
  return supabase
    .from("menu_daily_stock")
    .upsert(
      {
        store_id: storeId,
        menu_item_id: menuItemId,
        stock_date: date,
        quantity: Math.max(0, quantity),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "menu_item_id,stock_date" }
    )
    .select()
    .single();
}

/* =========================================================
   INVENTARIO PERMANENTE (bebidas, contables)
========================================================= */

export async function getPermanentStockDashboard(storeId: string) {
  const { data, error } = await supabase
    .from("menu_items")
    .select("id, name, stock")
    .eq("store_id", storeId)
    .not("stock", "is", null)
    .order("stock", { ascending: true });

  if (error) {
    console.error("getPermanentStockDashboard error:", error.message);
    return [];
  }

  return (data || []).map((item) => ({
    menu_item_id: item.id,
    item_name: item.name,
    stock: item.stock ?? 0,
  })) as PermanentStockRow[];
}

/** Suma (o resta, con delta negativo) al inventario permanente —
 *  para reponer compras nuevas o corregir un conteo, sin tener que
 *  entrar a editar el platillo. */
export async function adjustPermanentStock(menuItemId: string, delta: number) {
  const { data: item, error: fetchError } = await supabase
    .from("menu_items")
    .select("id, stock")
    .eq("id", menuItemId)
    .maybeSingle();

  if (fetchError || !item || item.stock === null) {
    return { error: fetchError || { message: "Este platillo no controla inventario permanente." } };
  }

  return supabase
    .from("menu_items")
    .update({ stock: Math.max(0, Number(item.stock) + delta) })
    .eq("id", menuItemId)
    .select()
    .single();
}
