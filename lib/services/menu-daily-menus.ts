import { supabase } from "@/lib/supabase";

import type { DailyMenu, EligibleDailyMenuItem } from "@/lib/menu/types";

/* =========================================================
   MENÚS (Almuerzo, Cena, o los que el negocio cree)
========================================================= */

export async function getDailyMenusForAdmin(storeId: string) {
  return supabase
    .from("menu_daily_menus")
    .select("id, store_id, name, sort_order, is_active")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true }) as unknown as Promise<{
    data: DailyMenu[] | null;
    error: { message: string } | null;
  }>;
}

export async function createDailyMenu(storeId: string, name: string, sortOrder: number) {
  return supabase
    .from("menu_daily_menus")
    .insert({ store_id: storeId, name: name.trim(), sort_order: sortOrder })
    .select()
    .single();
}

export async function renameDailyMenu(id: string, name: string) {
  return supabase.from("menu_daily_menus").update({ name: name.trim() }).eq("id", id);
}

export async function deleteDailyMenu(id: string) {
  return supabase.from("menu_daily_menus").delete().eq("id", id);
}

/* =========================================================
   PLATILLOS ELEGIBLES — solo los que tienen inventario activo
   (cupo diario o permanente), que es lo único que tiene sentido
   curar día a día. Un platillo siempre disponible no necesita
   "elegirse", ya está en la carta general todo el tiempo.
========================================================= */

export async function getEligibleItemsForAdmin(storeId: string) {
  const { data, error } = await supabase
    .from("menu_items")
    .select("id, name, price, image_url, daily_stock_enabled, stock")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .or("daily_stock_enabled.eq.true,stock.not.is.null")
    .order("name", { ascending: true });

  return { data: (data as EligibleDailyMenuItem[]) || [], error };
}

/* =========================================================
   PERTENENCIA — qué platillos están hoy en cada menú
========================================================= */

export async function getDailyMenuItemIds(dailyMenuId: string) {
  const { data, error } = await supabase
    .from("menu_daily_menu_items")
    .select("menu_item_id")
    .eq("daily_menu_id", dailyMenuId)
    .order("sort_order", { ascending: true });

  return { data: (data || []).map((r) => r.menu_item_id), error };
}

export async function addItemToDailyMenu(dailyMenuId: string, menuItemId: string, sortOrder: number) {
  return supabase
    .from("menu_daily_menu_items")
    .insert({ daily_menu_id: dailyMenuId, menu_item_id: menuItemId, sort_order: sortOrder });
}

export async function removeItemFromDailyMenu(dailyMenuId: string, menuItemId: string) {
  return supabase
    .from("menu_daily_menu_items")
    .delete()
    .eq("daily_menu_id", dailyMenuId)
    .eq("menu_item_id", menuItemId);
}
