import { supabase } from "@/lib/supabase";
import { getStoreBySlug } from "@/lib/services/stores";
import {
  getRestaurantNow,
  isMenuScheduleActive,
  normalizeMenuTimeZone,
  scheduleLabel,
} from "@/lib/menu/daytime";

import type {
  DailyMenuSchedule,
  FeaturedMenuItem,
  MenuCategory,
  MenuItem,
  MenuItemFormData,
  PublicDailyMenu,
} from "@/lib/menu/types";

const MENU_ITEM_SELECT = `
  id,
  store_id,
  category_id,
  name,
  description,
  price,
  image_url,
  is_active,
  is_featured,
  sort_order,
  stock,
  daily_stock_enabled,
  menu_item_option_groups (
    id,
    menu_item_id,
    name,
    is_required,
    max_selections,
    sort_order,
    menu_item_options (
      id,
      group_id,
      label,
      price_delta,
      sort_order,
      is_available
    )
  )
`;

export async function isMenuModuleEnabled(slug: string): Promise<boolean> {
  const store = await getStoreBySlug(slug);
  return store?.module_menu_enabled === true;
}

export async function getFeaturedMenuItems(
  slug: string,
  limit = 12
): Promise<FeaturedMenuItem[]> {
  const store = await getStoreBySlug(slug);
  if (!store || !store.module_menu_enabled) return [];

  const { data, error } = await supabase
    .from("menu_items")
    .select(
      `${MENU_ITEM_SELECT}, menu_categories!inner ( venue_type, is_active )`
    )
    .eq("store_id", store.id)
    .eq("is_active", true)
    .eq("is_featured", true)
    .eq("menu_categories.is_active", true)
    .order("sort_order", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("getFeaturedMenuItems error:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const { menu_categories, ...item } = row as unknown as MenuItem & {
      menu_categories: {
        venue_type: "bar" | "restaurant" | "general";
        is_active: boolean;
      };
    };

    return {
      ...item,
      venue_type: menu_categories?.venue_type ?? "general",
    };
  }) as FeaturedMenuItem[];
}

export async function getPublicMenu(slug: string): Promise<{
  store: Awaited<ReturnType<typeof getStoreBySlug>>;
  categories: MenuCategory[];
  dailyMenus: PublicDailyMenu[];
} | null> {
  const store = await getStoreBySlug(slug);
  if (!store) return null;

  const [
    { data, error },
    { data: dailyMenuRows, error: dailyMenuError },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from("menu_categories")
      .select(`
        id,
        store_id,
        name,
        venue_type,
        sort_order,
        is_active,
        menu_items (
          ${MENU_ITEM_SELECT}
        )
      `)
      .eq("store_id", store.id)
      .eq("is_active", true)
      .eq("menu_items.is_active", true)
      .order("sort_order", { ascending: true }),

    supabase
      .from("menu_daily_menus")
      .select(`
        id,
        name,
        sort_order,
        weekdays,
        start_time,
        end_time,
        menu_daily_menu_items ( menu_item_id ),
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
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),

    supabase
      .from("store_settings")
      .select("menu_timezone")
      .eq("store_id", store.id)
      .maybeSingle(),
  ]);

  if (error) {
    console.error("getPublicMenu error:", error.message);
    return { store, categories: [], dailyMenus: [] };
  }

  if (dailyMenuError) {
    console.error(
      "getPublicMenu dailyMenus error:",
      dailyMenuError.message
    );
  }

  const timeZone = normalizeMenuTimeZone(
    settings?.menu_timezone
  );
  const now = getRestaurantNow(timeZone);

  type DailyRow = {
    id: string;
    name: string;
    weekdays: number[] | null;
    start_time: string | null;
    end_time: string | null;
    menu_daily_menu_items: {
      menu_item_id: string;
    }[];
    menu_daily_menu_schedules: DailyMenuSchedule[];
  };

  const rows =
    (dailyMenuRows ?? []) as unknown as DailyRow[];

  const activeRows = rows
    .map((row) => {
      const activeRules = (
        row.menu_daily_menu_schedules || []
      )
        .filter((rule) => rule.is_active)
        .filter((rule) =>
          isMenuScheduleActive({
            weekdays: rule.weekdays,
            startTime: rule.start_time,
            endTime: rule.end_time,
            now,
          })
        );

      const legacyActive =
        (row.menu_daily_menu_schedules || []).length === 0 &&
        isMenuScheduleActive({
          weekdays: row.weekdays,
          startTime: row.start_time,
          endTime: row.end_time,
          now,
        });

      if (!legacyActive && activeRules.length === 0) {
        return null;
      }

      return {
        row,
        activeRules,
        legacyActive,
      };
    })
    .filter(Boolean) as {
    row: DailyRow;
    activeRules: DailyMenuSchedule[];
    legacyActive: boolean;
  }[];

  const activeMenuIds = activeRows.map(
    (item) => item.row.id
  );

  let overrides: {
    daily_menu_id: string;
    menu_item_id: string;
    is_included: boolean;
  }[] = [];

  if (activeMenuIds.length > 0) {
    const {
      data: overrideRows,
      error: overrideError,
    } = await supabase
      .from("menu_daily_menu_item_overrides")
      .select(
        "daily_menu_id, menu_item_id, is_included"
      )
      .eq("store_id", store.id)
      .eq("override_date", now.date)
      .in("daily_menu_id", activeMenuIds);

    if (overrideError) {
      console.error(
        "getPublicMenu overrides error:",
        overrideError.message
      );
    }

    overrides = overrideRows || [];
  }

  const categories = (data ?? []).map((category) => ({
    ...category,
    menu_items: sortItems(
      (category.menu_items ?? []) as MenuItem[]
    ),
  })) as MenuCategory[];

  const dailyMenus: PublicDailyMenu[] = activeRows.map(
    ({ row, activeRules }) => {
      const base = new Set(
        (row.menu_daily_menu_items || []).map(
          (item) => item.menu_item_id
        )
      );

      for (const override of overrides.filter(
        (candidate) =>
          candidate.daily_menu_id === row.id
      )) {
        if (override.is_included) {
          base.add(override.menu_item_id);
        } else {
          base.delete(override.menu_item_id);
        }
      }

      const label =
        activeRules.length > 0
          ? activeRules
              .map(
                (rule) =>
                  rule.label ||
                  scheduleLabel(
                    rule.weekdays,
                    rule.start_time,
                    rule.end_time
                  )
              )
              .join(" · ")
          : scheduleLabel(
              row.weekdays,
              row.start_time,
              row.end_time
            );

      return {
        id: row.id,
        name: row.name,
        itemIds: [...base],
        scheduleLabel: label,
      };
    }
  );

  return {
    store,
    categories,
    dailyMenus,
  };
}

function sortItems(items: MenuItem[]) {
  return [...items]
    .filter(Boolean)
    .sort(
      (a, b) => a.sort_order - b.sort_order
    )
    .map((item) => ({
      ...item,
      menu_item_option_groups: [
        ...(item.menu_item_option_groups ?? []),
      ]
        .sort(
          (a, b) => a.sort_order - b.sort_order
        )
        .map((group) => ({
          ...group,
          menu_item_options: [
            ...(group.menu_item_options ?? []),
          ].sort(
            (a, b) =>
              a.sort_order - b.sort_order
          ),
        })),
    }));
}

export async function getMenuCategoriesForAdmin(
  storeId: string
) {
  return supabase
    .from("menu_categories")
    .select(
      "id, store_id, name, venue_type, sort_order, is_active"
    )
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true });
}

export async function saveMenuCategory(
  storeId: string,
  category: {
    id?: string;
    name: string;
    venue_type:
      | "bar"
      | "restaurant"
      | "general";
    sort_order: number;
    is_active: boolean;
  }
) {
  if (category.id) {
    return supabase
      .from("menu_categories")
      .update({
        name: category.name,
        venue_type: category.venue_type,
        sort_order: category.sort_order,
        is_active: category.is_active,
      })
      .eq("id", category.id)
      .select()
      .single();
  }

  return supabase
    .from("menu_categories")
    .insert({
      store_id: storeId,
      name: category.name,
      venue_type: category.venue_type,
      sort_order: category.sort_order,
      is_active: category.is_active,
    })
    .select()
    .single();
}

export async function deleteMenuCategory(id: string) {
  return supabase
    .from("menu_categories")
    .delete()
    .eq("id", id);
}

export async function getMenuItemsForAdmin(
  storeId: string
) {
  return supabase
    .from("menu_items")
    .select(MENU_ITEM_SELECT)
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true });
}

export async function getMenuItemById(id: string) {
  return supabase
    .from("menu_items")
    .select(MENU_ITEM_SELECT)
    .eq("id", id)
    .single();
}

export async function saveMenuItem(
  storeId: string,
  form: MenuItemFormData
) {
  const basePayload = {
    store_id: storeId,
    category_id: form.category_id,
    name: form.name,
    description: form.description || null,
    price: form.price,
    image_url: form.image_url,
    is_active: form.is_active,
    is_featured: form.is_featured,
    sort_order: form.sort_order,
    stock: form.track_stock
      ? Math.max(0, form.stock)
      : null,
    daily_stock_enabled:
      form.daily_stock_enabled,
  };

  let itemId = form.id;

  if (itemId) {
    const { error } = await supabase
      .from("menu_items")
      .update(basePayload)
      .eq("id", itemId);

    if (error) {
      return {
        data: null,
        error,
      };
    }

    const { error: clearError } =
      await supabase
        .from("menu_item_option_groups")
        .delete()
        .eq("menu_item_id", itemId);

    if (clearError) {
      return {
        data: null,
        error: clearError,
      };
    }
  } else {
    const { data, error } = await supabase
      .from("menu_items")
      .insert(basePayload)
      .select("id")
      .single();

    if (error) {
      return {
        data: null,
        error,
      };
    }

    itemId = data.id;
  }

  if (!itemId) {
    return {
      data: null,
      error: new Error(
        "No se pudo determinar el id del platillo guardado."
      ),
    };
  }

  for (const group of form.option_groups) {
    const {
      data: savedGroup,
      error: groupError,
    } = await supabase
      .from("menu_item_option_groups")
      .insert({
        menu_item_id: itemId,
        name: group.name,
        is_required: group.is_required,
        max_selections:
          group.max_selections,
        sort_order: group.sort_order,
      })
      .select("id")
      .single();

    if (groupError) {
      return {
        data: null,
        error: groupError,
      };
    }

    if (group.options.length > 0) {
      const { error: optionsError } =
        await supabase
          .from("menu_item_options")
          .insert(
            group.options.map((option) => ({
              group_id: savedGroup.id,
              label: option.label,
              price_delta:
                option.price_delta,
              sort_order: option.sort_order,
              is_available: true,
            }))
          );

      if (optionsError) {
        return {
          data: null,
          error: optionsError,
        };
      }
    }
  }

  return getMenuItemById(itemId);
}

export async function deleteMenuItem(id: string) {
  return supabase
    .from("menu_items")
    .delete()
    .eq("id", id);
}
