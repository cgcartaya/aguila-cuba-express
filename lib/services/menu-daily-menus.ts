import { supabase } from "@/lib/supabase";
import { getRestaurantNow, normalizeMenuTimeZone } from "@/lib/menu/daytime";

import type {
  DailyMenu,
  DailyMenuItemOverride,
  EligibleDailyMenuItem,
} from "@/lib/menu/types";

/* =========================================================
   MENÚS (Almuerzo, Cena, Brunch, Happy Hour...)
========================================================= */

export async function getDailyMenusForAdmin(storeId: string) {
  return supabase
    .from("menu_daily_menus")
    .select("id, store_id, name, sort_order, is_active, weekdays, start_time, end_time")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true }) as unknown as Promise<{
    data: DailyMenu[] | null;
    error: { message: string } | null;
  }>;
}

export async function createDailyMenu(storeId: string, name: string, sortOrder: number) {
  return supabase
    .from("menu_daily_menus")
    .insert({
      store_id: storeId,
      name: name.trim(),
      sort_order: sortOrder,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      start_time: null,
      end_time: null,
      is_active: true,
    })
    .select()
    .single();
}

export async function updateDailyMenuSchedule(
  id: string,
  payload: {
    name?: string;
    weekdays: number[];
    start_time: string | null;
    end_time: string | null;
    is_active?: boolean;
  }
) {
  return supabase
    .from("menu_daily_menus")
    .update({
      ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
      weekdays: payload.weekdays,
      start_time: payload.start_time || null,
      end_time: payload.end_time || null,
      ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {}),
    })
    .eq("id", id)
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
   CATÁLOGO ELEGIBLE
   Ahora TODO plato activo puede pertenecer a Almuerzo/Cena.
   El control de inventario es independiente.
========================================================= */

export async function getEligibleItemsForAdmin(storeId: string) {
  const { data, error } = await supabase
    .from("menu_items")
    .select("id, name, price, image_url, daily_stock_enabled, stock")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  return { data: (data as EligibleDailyMenuItem[]) || [], error };
}

/* =========================================================
   PERTENENCIA BASE
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

/* =========================================================
   EXCEPCIONES DE HOY
   is_included=false => ocultar hoy aunque pertenezca normalmente.
   is_included=true  => mostrar solo hoy aunque no pertenezca.
========================================================= */

export async function getDailyMenuOverrides(
  storeId: string,
  dailyMenuId: string,
  date: string
) {
  const { data, error } = await supabase
    .from("menu_daily_menu_item_overrides")
    .select("daily_menu_id, menu_item_id, override_date, is_included")
    .eq("store_id", storeId)
    .eq("daily_menu_id", dailyMenuId)
    .eq("override_date", date);

  return { data: (data || []) as DailyMenuItemOverride[], error };
}

export async function setDailyMenuItemOverride(args: {
  storeId: string;
  dailyMenuId: string;
  menuItemId: string;
  date: string;
  isIncluded: boolean;
}) {
  return supabase
    .from("menu_daily_menu_item_overrides")
    .upsert(
      {
        store_id: args.storeId,
        daily_menu_id: args.dailyMenuId,
        menu_item_id: args.menuItemId,
        override_date: args.date,
        is_included: args.isIncluded,
      },
      { onConflict: "daily_menu_id,menu_item_id,override_date" }
    );
}

export async function clearDailyMenuItemOverride(
  dailyMenuId: string,
  menuItemId: string,
  date: string
) {
  return supabase
    .from("menu_daily_menu_item_overrides")
    .delete()
    .eq("daily_menu_id", dailyMenuId)
    .eq("menu_item_id", menuItemId)
    .eq("override_date", date);
}

/* =========================================================
   ZONA HORARIA DEL RESTAURANTE
========================================================= */

export async function getMenuTimeZone(storeId: string) {
  const { data, error } = await supabase
    .from("store_settings")
    .select("menu_timezone")
    .eq("store_id", storeId)
    .maybeSingle();

  return {
    timeZone: normalizeMenuTimeZone(data?.menu_timezone),
    error,
  };
}

export async function setMenuTimeZone(storeId: string, timeZone: string) {
  const safe = normalizeMenuTimeZone(timeZone);
  return supabase
    .from("store_settings")
    .upsert(
      { store_id: storeId, menu_timezone: safe },
      { onConflict: "store_id" }
    )
    .select("menu_timezone")
    .single();
}

export async function getMenuToday(storeId: string) {
  const { timeZone } = await getMenuTimeZone(storeId);
  return { ...getRestaurantNow(timeZone), timeZone };
}
