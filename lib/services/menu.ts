import { supabase } from "@/lib/supabase";
import { getStoreBySlug } from "@/lib/services/stores";

import type {
  FeaturedMenuItem,
  MenuCategory,
  MenuItem,
  MenuItemFormData,
} from "@/lib/menu/types";

/* =========================================================
   SELECTS
========================================================= */

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
      sort_order
    )
  )
`;

/* =========================================================
   HELPER — usado desde landings (ej. app/deparis/page.tsx) para
   decidir si mostrar el link "Pedir menú en línea" hacia
   /menu/[slug]. Falla cerrado (false) ante cualquier error, para
   nunca mostrar un link roto en una landing pública.
========================================================= */

export async function isMenuModuleEnabled(slug: string): Promise<boolean> {
  const store = await getStoreBySlug(slug);
  return store?.module_menu_enabled === true;
}

/**
 * Trae hasta `limit` platillos marcados "Destacar en la landing"
 * (is_featured) de una tienda, para mostrarlos en su landing (ej.
 * app/deparis). Trae también el venue_type de la categoría de cada
 * ítem (bar/restaurant/general) para que la landing pueda separarlos
 * en "Platos principales" y "Bebidas principales" en vez de mezclar
 * todo en una sola vitrina. Falla cerrado (array vacío) ante
 * cualquier error, para que la landing nunca se rompa por esto.
 */
export async function getFeaturedMenuItems(
  slug: string,
  limit = 12
): Promise<FeaturedMenuItem[]> {
  const store = await getStoreBySlug(slug);
  if (!store || !store.module_menu_enabled) return [];

  const { data, error } = await supabase
    .from("menu_items")
    .select(`${MENU_ITEM_SELECT}, menu_categories!inner ( venue_type, is_active )`)
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
      menu_categories: { venue_type: "bar" | "restaurant" | "general"; is_active: boolean };
    };
    return { ...item, venue_type: menu_categories?.venue_type ?? "general" };
  }) as FeaturedMenuItem[];
}

/* =========================================================
   PÚBLICO — /menu/[slug]
   Solo trae categorías/ítems activos, ya ordenados.
========================================================= */

export async function getPublicMenu(slug: string): Promise<{
  store: Awaited<ReturnType<typeof getStoreBySlug>>;
  categories: MenuCategory[];
} | null> {
  const store = await getStoreBySlug(slug);
  if (!store) return null;

  const { data, error } = await supabase
    .from("menu_categories")
    .select(
      `
      id,
      store_id,
      name,
      venue_type,
      sort_order,
      is_active,
      menu_items (
        ${MENU_ITEM_SELECT}
      )
    `
    )
    .eq("store_id", store.id)
    .eq("is_active", true)
    .eq("menu_items.is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("getPublicMenu error:", error.message);
    return { store, categories: [] };
  }

  const categories = (data ?? []).map((cat) => ({
    ...cat,
    menu_items: sortItems((cat.menu_items ?? []) as MenuItem[]),
  })) as MenuCategory[];

  return { store, categories };
}

function sortItems(items: MenuItem[]) {
  return [...items]
    .filter((item) => item != null)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => ({
      ...item,
      menu_item_option_groups: [...(item.menu_item_option_groups ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((group) => ({
          ...group,
          menu_item_options: [...(group.menu_item_options ?? [])].sort(
            (a, b) => a.sort_order - b.sort_order
          ),
        })),
    }));
}

/* =========================================================
   ADMIN — CATEGORÍAS
========================================================= */

export async function getMenuCategoriesForAdmin(storeId: string) {
  return supabase
    .from("menu_categories")
    .select("id, store_id, name, venue_type, sort_order, is_active")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true });
}

export async function saveMenuCategory(
  storeId: string,
  category: {
    id?: string;
    name: string;
    venue_type: "bar" | "restaurant" | "general";
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
  // Borra en cascada items/grupos/opciones de esa categoría (FK on delete cascade).
  return supabase.from("menu_categories").delete().eq("id", id);
}

/* =========================================================
   ADMIN — ÍTEMS (con sus grupos de opciones)
========================================================= */

export async function getMenuItemsForAdmin(storeId: string) {
  return supabase
    .from("menu_items")
    .select(MENU_ITEM_SELECT)
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true });
}

export async function getMenuItemById(id: string) {
  return supabase.from("menu_items").select(MENU_ITEM_SELECT).eq("id", id).single();
}

/**
 * Guarda un ítem completo: datos base + reemplaza por completo sus
 * grupos de opciones y opciones (borra los existentes y crea los
 * nuevos). Más simple y confiable que hacer un diff fino, y el
 * volumen de opciones por platillo es siempre pequeño.
 */
export async function saveMenuItem(storeId: string, form: MenuItemFormData) {
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
    stock: form.track_stock ? Math.max(0, form.stock) : null,
    daily_stock_enabled: form.daily_stock_enabled,
  };

  let itemId = form.id;

  if (itemId) {
    const { error } = await supabase
      .from("menu_items")
      .update(basePayload)
      .eq("id", itemId);
    if (error) return { data: null, error };

    // Limpia grupos/opciones previos (cascada borra menu_item_options).
    const { error: clearError } = await supabase
      .from("menu_item_option_groups")
      .delete()
      .eq("menu_item_id", itemId);
    if (clearError) return { data: null, error: clearError };
  } else {
    const { data, error } = await supabase
      .from("menu_items")
      .insert(basePayload)
      .select("id")
      .single();
    if (error) return { data: null, error };
    itemId = data.id;
  }

  if (!itemId) {
    return { data: null, error: new Error("No se pudo determinar el id del platillo guardado.") };
  }

  for (const group of form.option_groups) {
    const { data: savedGroup, error: groupError } = await supabase
      .from("menu_item_option_groups")
      .insert({
        menu_item_id: itemId,
        name: group.name,
        is_required: group.is_required,
        max_selections: group.max_selections,
        sort_order: group.sort_order,
      })
      .select("id")
      .single();

    if (groupError) return { data: null, error: groupError };

    if (group.options.length > 0) {
      const { error: optionsError } = await supabase
        .from("menu_item_options")
        .insert(
          group.options.map((opt) => ({
            group_id: savedGroup.id,
            label: opt.label,
            price_delta: opt.price_delta,
            sort_order: opt.sort_order,
          }))
        );
      if (optionsError) return { data: null, error: optionsError };
    }
  }

  return getMenuItemById(itemId);
}

export async function deleteMenuItem(id: string) {
  return supabase.from("menu_items").delete().eq("id", id);
}
