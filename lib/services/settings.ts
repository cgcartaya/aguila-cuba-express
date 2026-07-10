import { supabase } from "@/lib/supabase";
import { getDefaultStore } from "@/lib/services/stores";

import type {
  Category,
  StoreSettings,
  Banner,
} from "@/components/admin/settings/types";

/* =========================================================
   TIPOS LOCALES - ZONAS DE ENTREGA
========================================================= */

export type DeliveryZone = {
  id: string;
  store_id?: string | null;
  municipality: string;
  zone_name: string;
  delivery_fee: number;
  minimum_order: number;
  free_delivery_from: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

/* =========================================================
   HELPERS MULTIEMPRESA
========================================================= */

function readCurrentStoreFromLocalStorage(): {
  id?: string;
  slug?: string;
} | null {
  if (typeof window === "undefined") return null;

  try {
    const savedStore = localStorage.getItem("saas-current-store");
    if (!savedStore) return null;

    const parsed = JSON.parse(savedStore);
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
}

async function resolveStoreId(storeId?: string | null) {
  if (storeId) return storeId;

  const currentStore = readCurrentStoreFromLocalStorage();
  if (currentStore?.id) return currentStore.id;

  const { data: store } = await getDefaultStore();
  return store?.id || null;
}

function cleanPayload<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

/* =========================================================
   CATEGORIES
========================================================= */

export async function getCategoriesByStoreId(storeId: string) {
  return supabase
    .from("categories")
    .select(
      "id, store_id, name, slug, color, icon, sort_order, is_active, created_at"
    )
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true });
}

export async function getCategories() {
  const { data: store } = await getDefaultStore();

  if (!store) {
    return { data: [], error: null };
  }

  return getCategoriesByStoreId(store.id);
}

export async function getActiveCategories() {
  const { data: store } = await getDefaultStore();

  if (!store) {
    return { data: [], error: null };
  }

  return getActiveCategoriesByStoreId(store.id);
}

export async function getActiveCategoriesByStoreId(storeId: string) {
  return supabase
    .from("categories")
    .select(
      "id, store_id, name, slug, color, icon, sort_order, is_active, created_at"
    )
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
}

export async function getAdminActiveCategories(storeId?: string) {
  if (storeId) {
    return getActiveCategoriesByStoreId(storeId);
  }

  return getActiveCategories();
}

export async function createCategoryForStore(
  storeId: string,
  category: Omit<Category, "id" | "created_at" | "store_id">
) {
  const payload = cleanPayload({
    ...category,
    store_id: storeId,
  });

  return supabase
    .from("categories")
    .insert(payload)
    .select(
      "id, store_id, name, slug, color, icon, sort_order, is_active, created_at"
    )
    .single();
}

export async function createCategory(
  category: Omit<Category, "id" | "created_at" | "store_id">
) {
  const storeId = await resolveStoreId();

  if (!storeId) {
    return {
      data: null,
      error: {
        message: "No se encontró la tienda activa",
      },
    };
  }

  return createCategoryForStore(storeId, category);
}

export async function updateCategory(
  id: string,
  category: Partial<Omit<Category, "id" | "created_at" | "store_id">>,
  storeId?: string
) {
  const payload = cleanPayload(category);

  let query = supabase
    .from("categories")
    .update(payload)
    .eq("id", id);

  if (storeId) {
    query = query.eq("store_id", storeId);
  }

  return query
    .select(
      "id, store_id, name, slug, color, icon, sort_order, is_active, created_at"
    )
    .single();
}

export async function deleteCategory(id: string, storeId?: string) {
  let query = supabase
    .from("categories")
    .delete()
    .eq("id", id);

  if (storeId) {
    query = query.eq("store_id", storeId);
  }

  return query;
}

/* =========================================================
   STORE SETTINGS - MULTIEMPRESA
========================================================= */

export async function getStoreSettings(storeId?: string | null) {
  const resolvedStoreId = await resolveStoreId(storeId);

  if (!resolvedStoreId) {
    return { data: null, error: null };
  }

  return supabase
    .from("store_settings")
    .select("*")
    .eq("store_id", resolvedStoreId)
    .maybeSingle();
}

export async function saveStoreSettings(
  settings: Partial<StoreSettings>,
  storeId?: string | null
) {
  const resolvedStoreId = await resolveStoreId(storeId);

  if (!resolvedStoreId) {
    return {
      data: null,
      error: {
        message: "No se encontró la tienda activa",
      },
    };
  }

  const payload = cleanPayload({
    ...settings,
    store_id: resolvedStoreId,
    updated_at: settings.updated_at || new Date().toISOString(),
  });

  const existing = await getStoreSettings(resolvedStoreId);

  if (existing.data) {
    return supabase
      .from("store_settings")
      .update(payload)
      .eq("id", existing.data.id)
      .select()
      .single();
  }

  return supabase
    .from("store_settings")
    .insert(payload)
    .select()
    .single();
}

/* =========================================================
   DELIVERY ZONES - MULTIEMPRESA
========================================================= */

export async function getDeliveryZones(storeId?: string | null) {
  const resolvedStoreId = await resolveStoreId(storeId);

  if (!resolvedStoreId) {
    return { data: [], error: null };
  }

  return supabase
    .from("delivery_zones")
    .select("*")
    .eq("store_id", resolvedStoreId)
    .order("sort_order", { ascending: true })
    .order("municipality", { ascending: true })
    .order("zone_name", { ascending: true });
}

export async function getActiveDeliveryZones(storeId?: string | null) {
  const resolvedStoreId = await resolveStoreId(storeId);

  if (!resolvedStoreId) {
    return { data: [], error: null };
  }

  return supabase
    .from("delivery_zones")
    .select("*")
    .eq("store_id", resolvedStoreId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("municipality", { ascending: true })
    .order("zone_name", { ascending: true });
}

export async function createDeliveryZone(
  zone: Omit<DeliveryZone, "id" | "created_at">,
  storeId?: string | null
) {
  const resolvedStoreId = await resolveStoreId(
    storeId || zone.store_id || undefined
  );

  if (!resolvedStoreId) {
    return {
      data: null,
      error: {
        message: "No se encontró la tienda activa",
      },
    };
  }

  return supabase
    .from("delivery_zones")
    .insert({
      ...zone,
      store_id: resolvedStoreId,
    })
    .select()
    .single();
}

export async function updateDeliveryZone(
  id: string,
  zone: Partial<DeliveryZone>
) {
  return supabase
    .from("delivery_zones")
    .update(zone)
    .eq("id", id)
    .select()
    .single();
}

export async function deleteDeliveryZone(id: string) {
  return supabase
    .from("delivery_zones")
    .delete()
    .eq("id", id);
}

/* =========================================================
   BANNERS
========================================================= */

export async function getBanners() {
  const { data: store } = await getDefaultStore();

  if (!store) {
    return { data: [], error: null };
  }

  return getBannersByStoreId(store.id);
}

export async function getAdminBannersByStoreId(storeId: string) {
  return supabase
    .from("banners")
    .select(
      "id, store_id, title, subtitle, image_url, button_text, button_link, is_active, sort_order, layout_type, background_color, text_color, accent_color, badge_text, product_image_url, category_id, created_at"
    )
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true });
}

export async function getAdminBanners() {
  const storeId = await resolveStoreId();

  if (!storeId) {
    return { data: [], error: null };
  }

  return getAdminBannersByStoreId(storeId);
}

export async function getBannersByStoreId(storeId: string) {
  return supabase
    .from("banners")
    .select(
      "id, store_id, title, subtitle, image_url, button_text, button_link, is_active, sort_order, layout_type, background_color, text_color, accent_color, badge_text, product_image_url, category_id, created_at"
    )
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(8);
}

export async function createBannerForStore(
  storeId: string,
  banner: Omit<Banner, "id" | "created_at">
) {
  return supabase
    .from("banners")
    .insert({
      ...banner,
      store_id: storeId,
    })
    .select()
    .single();
}

export async function createBanner(
  banner: Omit<Banner, "id" | "created_at">
) {
  const storeId = await resolveStoreId();

  if (!storeId) {
    return {
      data: null,
      error: {
        message: "No se encontró la tienda activa",
      },
    };
  }

  return createBannerForStore(storeId, banner);
}

export async function updateBanner(
  id: string,
  banner: Partial<Banner>
) {
  return supabase
    .from("banners")
    .update(banner)
    .eq("id", id)
    .select()
    .single();
}

export async function deleteBanner(id: string) {
  return supabase
    .from("banners")
    .delete()
    .eq("id", id);
}
