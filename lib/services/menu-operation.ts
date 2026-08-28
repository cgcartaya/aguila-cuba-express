import { supabase } from "@/lib/supabase";
import { getRestaurantNow, normalizeMenuTimeZone } from "@/lib/menu/daytime";

export type MenuOperationSettings = {
  menu_orders_paused: boolean;
  menu_pause_message: string | null;
  menu_estimated_prep_minutes: number;
};

export type OperationMenuOption = {
  id: string;
  label: string;
  price_delta: number;
  is_available: boolean;
};

export type OperationMenuGroup = {
  id: string;
  name: string;
  options: OperationMenuOption[];
};

export type OperationMenuItem = {
  id: string;
  name: string;
  image_url: string | null;
  is_active: boolean;
  manual_unavailable: boolean;
  stock: number | null;
  daily_stock_enabled: boolean;
  available_takeaway: boolean;
  available_delivery: boolean;
  delivery_paused_date: string | null;
  delivery_pause_reason: string | null;
  groups: OperationMenuGroup[];
};

export async function getMenuOperationSettings(storeId: string) {
  const { data, error } = await supabase
    .from("store_settings")
    .select("menu_orders_paused, menu_pause_message, menu_estimated_prep_minutes")
    .eq("store_id", storeId)
    .maybeSingle();

  return {
    data: {
      menu_orders_paused: data?.menu_orders_paused ?? false,
      menu_pause_message: data?.menu_pause_message ?? null,
      menu_estimated_prep_minutes: Number(data?.menu_estimated_prep_minutes || 25),
    } as MenuOperationSettings,
    error,
  };
}

export async function saveMenuOperationSettings(
  storeId: string,
  settings: MenuOperationSettings
) {
  return supabase
    .from("store_settings")
    .upsert(
      {
        store_id: storeId,
        menu_orders_paused: settings.menu_orders_paused,
        menu_pause_message: settings.menu_pause_message?.trim() || null,
        menu_estimated_prep_minutes: Math.max(
          0,
          Math.round(settings.menu_estimated_prep_minutes || 0)
        ),
      },
      { onConflict: "store_id" }
    )
    .select("menu_orders_paused, menu_pause_message, menu_estimated_prep_minutes")
    .single();
}

export async function getOperationMenuItems(storeId: string) {
  const [{ data, error }, { data: settings }] = await Promise.all([
    supabase
      .from("menu_items")
      .select(`
      id,
      name,
      image_url,
      is_active,
      manual_unavailable,
      stock,
      daily_stock_enabled,
      available_takeaway,
      available_delivery,
      delivery_paused_date,
      delivery_pause_reason,
      menu_item_option_groups (
        id,
        name,
        sort_order,
        menu_item_options (
          id,
          label,
          price_delta,
          sort_order,
          is_available
        )
      )
      `)
      .eq("store_id", storeId)
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("store_settings")
      .select("menu_timezone")
      .eq("store_id", storeId)
      .maybeSingle(),
  ]);

  const today = getRestaurantNow(
    normalizeMenuTimeZone(settings?.menu_timezone)
  ).date;

  const items: OperationMenuItem[] = (data || []).map((item: any) => ({
    id: item.id,
    name: item.name,
    image_url: item.image_url || null,
    is_active: item.is_active,
    manual_unavailable: item.manual_unavailable ?? false,
    stock: item.stock,
    daily_stock_enabled: item.daily_stock_enabled,
    available_takeaway: item.available_takeaway !== false,
    available_delivery: item.available_delivery !== false,
    delivery_paused_date:
      item.delivery_paused_date === today ? item.delivery_paused_date : null,
    delivery_pause_reason:
      item.delivery_paused_date === today ? item.delivery_pause_reason : null,
    groups: (item.menu_item_option_groups || [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((group: any) => ({
        id: group.id,
        name: group.name,
        options: (group.menu_item_options || [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((option: any) => ({
            id: option.id,
            label: option.label,
            price_delta: Number(option.price_delta) || 0,
            is_available: option.is_available !== false,
          })),
      })),
  }));

  return { data: items, error };
}

export async function setMenuItemManualUnavailable(
  itemId: string,
  unavailable: boolean
) {
  return supabase
    .from("menu_items")
    .update({ manual_unavailable: unavailable })
    .eq("id", itemId)
    .select("id, manual_unavailable")
    .single();
}

// Conservamos los nombres de columna por compatibilidad con la base actual.
// En la experiencia pública esta pausa significa "solo en el restaurante hoy":
// bloquea tanto recogida como delivery hasta cambiar el día del restaurante.
export async function setMenuItemDeliveryPausedToday(
  storeId: string,
  itemId: string,
  paused: boolean,
  reason?: string
) {
  const { data: settings } = await supabase
    .from("store_settings")
    .select("menu_timezone")
    .eq("store_id", storeId)
    .maybeSingle();

  const today = getRestaurantNow(
    normalizeMenuTimeZone(settings?.menu_timezone)
  ).date;

  return supabase
    .from("menu_items")
    .update({
      delivery_paused_date: paused ? today : null,
      delivery_pause_reason: paused
        ? reason?.trim().slice(0, 160) || "Solo disponible para consumir en el restaurante hoy"
        : null,
    })
    .eq("id", itemId)
    .eq("store_id", storeId)
    .select("id, delivery_paused_date, delivery_pause_reason")
    .single();
}

export async function setMenuOptionAvailability(
  optionId: string,
  available: boolean
) {
  return supabase
    .from("menu_item_options")
    .update({ is_available: available })
    .eq("id", optionId)
    .select("id, is_available")
    .single();
}
