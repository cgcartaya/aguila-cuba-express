import { supabase } from "@/lib/supabase";

import type { MenuOrder, MenuOrderStatus } from "@/lib/menu/types";

/* =========================================================
   ADMIN — LISTA DE ÓRDENES
========================================================= */

const MENU_ORDER_ADMIN_SELECT = `
  id,
  store_id,
  order_type,
  table_number,
  delivery_address,
  delivery_fee,
  customer_name,
  customer_phone,
  customer_email,
  notes,
  subtotal,
  total,
  status,
  created_at,
  updated_at,
  menu_order_items ( id, order_id, menu_item_id, item_name, unit_price, quantity, selected_options, notes, line_total )
`;

export async function getMenuOrdersForAdmin(
  storeId: string,
  opts?: { status?: MenuOrderStatus; date?: string }
) {
  let query = supabase.from("menu_orders").select(MENU_ORDER_ADMIN_SELECT).eq("store_id", storeId);

  if (opts?.status) {
    query = query.eq("status", opts.status);
  }

  if (opts?.date) {
    const start = `${opts.date}T00:00:00`;
    const end = `${opts.date}T23:59:59`;
    query = query.gte("created_at", start).lte("created_at", end);
  }

  return query.order("created_at", { ascending: false }) as unknown as Promise<{
    data: MenuOrder[] | null;
    error: { message: string } | null;
  }>;
}

/* =========================================================
   ADMIN — CAMBIAR ESTADO
   Al cancelar, se devuelve al inventario todo lo que ese platillo
   había descontado (mismo criterio que restoreOrderStockServerSide
   en lib/services/order-stock-admin.ts, pero para menu_items — y
   con el guard stock_restored para nunca devolver dos veces).
========================================================= */

export async function updateMenuOrderStatus(orderId: string, status: MenuOrderStatus) {
  if (status === "cancelled") {
    const { data: order } = await supabase
      .from("menu_orders")
      .select("id, stock_restored")
      .eq("id", orderId)
      .maybeSingle();

    if (order && !order.stock_restored) {
      const { data: items } = await supabase
        .from("menu_order_items")
        .select("menu_item_id, quantity")
        .eq("order_id", orderId);

      for (const item of items || []) {
        if (!item.menu_item_id) continue;
        const { data: menuItem } = await supabase
          .from("menu_items")
          .select("id, stock")
          .eq("id", item.menu_item_id)
          .maybeSingle();

        if (menuItem && menuItem.stock !== null) {
          await supabase
            .from("menu_items")
            .update({ stock: Number(menuItem.stock) + Number(item.quantity || 0) })
            .eq("id", item.menu_item_id);
        }
      }

      await supabase.from("menu_orders").update({ stock_restored: true }).eq("id", orderId);
    }
  }

  return supabase
    .from("menu_orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .select()
    .single();
}

/* =========================================================
   ADMIN — CONTEO DE PENDIENTES (badge)
   Cuenta lo que todavía necesita atención: recién llegado o en
   preparación (no "listo", que ya está del lado del negocio).
========================================================= */

export async function getPendingMenuOrdersCount(storeId: string) {
  return supabase
    .from("menu_orders")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .in("status", ["received", "preparing"]);
}
