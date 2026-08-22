import { supabase } from "@/lib/supabase";
import { getRestaurantNow, normalizeMenuTimeZone } from "@/lib/menu/daytime";

import type {
  DailyMenu,
  DailyMenuItemOverride,
  DailyMenuSchedule,
  EligibleDailyMenuItem,
} from "@/lib/menu/types";

export async function getDailyMenusForAdmin(storeId: string) {
  return supabase
    .from("menu_daily_menus")
    .select(`
      id,
      store_id,
      name,
      sort_order,
      is_active,
      weekdays,
      start_time,
      end_time,
      menu_daily_menu_schedules (
        id,
        daily_menu_id,
        weekdays,
        start_time,
        end_time,
        label,
        sort_order,
        is_active
      )
    `)
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true })
    .order("sort_order", { foreignTable: "menu_daily_menu_schedules", ascending: true }) as unknown as Promise<{
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

export async function updateDailyMenuMeta(
  id: string,
  payload: { name?: string; is_active?: boolean; sort_order?: number }
) {
  return supabase
    .from("menu_daily_menus")
    .update({
      ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
      ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {}),
      ...(payload.sort_order !== undefined ? { sort_order: payload.sort_order } : {}),
    })
    .eq("id", id)
    .select()
    .single();
}

export async function deleteDailyMenu(id: string) {
  return supabase.from("menu_daily_menus").delete().eq("id", id);
}

/* =========================================================
   REGLAS HORARIAS — un menú puede tener varias
========================================================= */

export async function createDailyMenuSchedule(
  dailyMenuId: string,
  payload: {
    weekdays: number[];
    start_time: string | null;
    end_time: string | null;
    label?: string | null;
    sort_order?: number;
  }
) {
  return supabase
    .from("menu_daily_menu_schedules")
    .insert({
      daily_menu_id: dailyMenuId,
      weekdays: payload.weekdays,
      start_time: payload.start_time || null,
      end_time: payload.end_time || null,
      label: payload.label?.trim() || null,
      sort_order: payload.sort_order ?? 0,
      is_active: true,
    })
    .select()
    .single();
}

export async function updateDailyMenuScheduleRule(
  id: string,
  payload: Partial<Omit<DailyMenuSchedule, "id" | "daily_menu_id">>
) {
  return supabase
    .from("menu_daily_menu_schedules")
    .update({
      ...(payload.weekdays !== undefined ? { weekdays: payload.weekdays } : {}),
      ...(payload.start_time !== undefined ? { start_time: payload.start_time || null } : {}),
      ...(payload.end_time !== undefined ? { end_time: payload.end_time || null } : {}),
      ...(payload.label !== undefined ? { label: payload.label?.trim() || null } : {}),
      ...(payload.sort_order !== undefined ? { sort_order: payload.sort_order } : {}),
      ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {}),
    })
    .eq("id", id)
    .select()
    .single();
}

export async function deleteDailyMenuScheduleRule(id: string) {
  return supabase.from("menu_daily_menu_schedules").delete().eq("id", id);
}

/* =========================================================
   PLATOS
========================================================= */

export async function getEligibleItemsForAdmin(storeId: string) {
  const { data, error } = await supabase
    .from("menu_items")
    .select(`
      id,
      category_id,
      name,
      price,
      image_url,
      daily_stock_enabled,
      stock,
      category:menu_categories!menu_items_category_id_fkey (
        id,
        name,
        venue_type,
        sort_order
      )
    `)
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("name", { ascending: true });

const normalizedItems: EligibleDailyMenuItem[] = (data || []).map((item) => {
  const category = Array.isArray(item.category)
    ? item.category[0] ?? null
    : item.category ?? null;

  return {
    id: item.id,
    category_id: item.category_id,
    name: item.name,
    price: Number(item.price),
    image_url: item.image_url,
    daily_stock_enabled: item.daily_stock_enabled,
    stock: item.stock,
    category,
  };
});

return { data: normalizedItems, error };
}

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
   EXCEPCIONES
========================================================= */

export async function getDailyMenuOverrides(storeId: string, dailyMenuId: string, date: string) {
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
   ZONA HORARIA
========================================================= */

export async function getMenuTimeZone(storeId: string) {
  const { data, error } = await supabase
    .from("store_settings")
    .select("menu_timezone")
    .eq("store_id", storeId)
    .maybeSingle();

  return { timeZone: normalizeMenuTimeZone(data?.menu_timezone), error };
}

export async function setMenuTimeZone(storeId: string, timeZone: string) {
  const safe = normalizeMenuTimeZone(timeZone);
  return supabase
    .from("store_settings")
    .upsert({ store_id: storeId, menu_timezone: safe }, { onConflict: "store_id" })
    .select("menu_timezone")
    .single();
}

export async function getMenuToday(storeId: string) {
  const { timeZone } = await getMenuTimeZone(storeId);
  return { ...getRestaurantNow(timeZone), timeZone };
}

