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

export type RestaurantOnlyBlockInput = {
  enabled: boolean;
  days?: number;
  untilDate?: string;
  indefinite?: boolean;
  reason?: string;
};

export type MenuItemOperationalState = {
  manual_unavailable: boolean;
  available_delivery: boolean;
  available_takeaway: boolean;
  delivery_paused_date: string | null;
  delivery_pause_reason: string | null;
  restaurant_only_active: boolean;
  restaurant_only_indefinite: boolean;
  today: string;
};

const INDEFINITE_DATE = "9999-12-31";

async function getRestaurantDate(storeId: string) {
  const { data: settings } = await supabase
    .from("store_settings")
    .select("menu_timezone")
    .eq("store_id", storeId)
    .maybeSingle();

  return getRestaurantNow(
    normalizeMenuTimeZone(settings?.menu_timezone)
  ).date;
}

function addDays(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

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
  const [result, today] = await Promise.all([
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
    getRestaurantDate(storeId),
  ]);

  const { data, error } = result;

  const items: OperationMenuItem[] = (data || []).map((item: any) => {
    const activeUntil =
      item.delivery_paused_date && item.delivery_paused_date >= today
        ? item.delivery_paused_date
        : null;

    return {
      id: item.id,
      name: item.name,
      image_url: item.image_url || null,
      is_active: item.is_active,
      manual_unavailable: item.manual_unavailable ?? false,
      stock: item.stock,
      daily_stock_enabled: item.daily_stock_enabled,
      available_takeaway: item.available_takeaway !== false,
      available_delivery: item.available_delivery !== false,
      delivery_paused_date: activeUntil,
      delivery_pause_reason: activeUntil ? item.delivery_pause_reason : null,
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
    };
  });

  return { data: items, error };
}

export async function getMenuItemOperationalState(
  storeId: string,
  itemId: string
): Promise<MenuItemOperationalState | null> {
  const [{ data }, today] = await Promise.all([
    supabase
      .from("menu_items")
      .select(
        "manual_unavailable, available_takeaway, available_delivery, delivery_paused_date, delivery_pause_reason"
      )
      .eq("id", itemId)
      .eq("store_id", storeId)
      .maybeSingle(),
    getRestaurantDate(storeId),
  ]);

  if (!data) return null;

  const activeUntil =
    data.delivery_paused_date && data.delivery_paused_date >= today
      ? data.delivery_paused_date
      : null;

  return {
    manual_unavailable: Boolean(data.manual_unavailable),
    available_delivery: data.available_delivery !== false,
    available_takeaway: data.available_takeaway !== false,
    delivery_paused_date: activeUntil,
    delivery_pause_reason: activeUntil ? data.delivery_pause_reason : null,
    restaurant_only_active:
      data.available_delivery === false || Boolean(activeUntil),
    restaurant_only_indefinite: activeUntil === INDEFINITE_DATE,
    today,
  };
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

export async function setMenuItemRestaurantOnlyBlock(
  storeId: string,
  itemId: string,
  input: RestaurantOnlyBlockInput
) {
  let blockedUntil: string | null = null;

  if (input.enabled) {
    const today = await getRestaurantDate(storeId);

    if (input.indefinite) {
      blockedUntil = INDEFINITE_DATE;
    } else if (input.untilDate) {
      blockedUntil = input.untilDate < today ? today : input.untilDate;
    } else {
      const days = Math.max(1, Math.min(3650, Math.round(input.days || 1)));
      blockedUntil = addDays(today, days - 1);
    }
  }

  return supabase
    .from("menu_items")
    .update({
      delivery_paused_date: blockedUntil,
      delivery_pause_reason: input.enabled
        ? input.reason?.trim().slice(0, 160) ||
          "Solo disponible para consumir en el restaurante"
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
