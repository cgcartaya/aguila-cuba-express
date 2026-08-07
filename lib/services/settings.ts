import { supabase } from "@/lib/supabase";

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

  // Compatibilidad temporal para pantallas admin antiguas:
  // solo usamos la tienda seleccionada explícitamente por el usuario.
  // Nunca existe fallback a una "tienda por defecto".
  const currentStore = readCurrentStoreFromLocalStorage();
  return currentStore?.id || null;
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
      "id, store_id, name, slug, color, icon, sort_order, is_active, minimum_order_exempt, delivery_included, created_at"
    )
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true });
}

export async function getCategories(storeId?: string | null) {
  const resolvedStoreId = await resolveStoreId(storeId);

  if (!resolvedStoreId) {
    return {
      data: [],
      error: {
        message: "Se requiere una tienda activa para cargar categorías.",
      },
    };
  }

  return getCategoriesByStoreId(resolvedStoreId);
}

export async function getActiveCategories(storeId?: string | null) {
  const resolvedStoreId = await resolveStoreId(storeId);

  if (!resolvedStoreId) {
    return {
      data: [],
      error: {
        message: "Se requiere una tienda activa para cargar categorías.",
      },
    };
  }

  return getActiveCategoriesByStoreId(resolvedStoreId);
}

export async function getActiveCategoriesByStoreId(storeId: string) {
  return supabase
    .from("categories")
    .select(
      "id, store_id, name, slug, color, icon, sort_order, is_active, minimum_order_exempt, delivery_included, created_at"
    )
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
}

export async function getAdminActiveCategories(storeId?: string) {
  return getActiveCategories(storeId);
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
      "id, store_id, name, slug, color, icon, sort_order, is_active, minimum_order_exempt, delivery_included, created_at"
    )
    .single();
}

export async function createCategory(
  category: Omit<Category, "id" | "created_at" | "store_id">,
  storeId?: string | null
) {
  const resolvedStoreId = await resolveStoreId(storeId);

  if (!resolvedStoreId) {
    return {
      data: null,
      error: {
        message: "Se requiere una tienda activa para crear la categoría.",
      },
    };
  }

  return createCategoryForStore(resolvedStoreId, category);
}

export async function updateCategory(
  id: string,
  category: Partial<Omit<Category, "id" | "created_at" | "store_id">>,
  storeId: string
) {
  const payload = cleanPayload(category);

  return supabase
    .from("categories")
    .update(payload)
    .eq("id", id)
    .eq("store_id", storeId)
    .select(
      "id, store_id, name, slug, color, icon, sort_order, is_active, minimum_order_exempt, delivery_included, created_at"
    )
    .single();
}

export async function deleteCategory(
  id: string,
  storeId: string
) {
  return supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("store_id", storeId);
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
  zone: Partial<DeliveryZone>,
  storeId?: string | null
) {
  const resolvedStoreId = await resolveStoreId(storeId || zone.store_id || undefined);

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
    .update({
      ...zone,
      store_id: resolvedStoreId,
    })
    .eq("id", id)
    .eq("store_id", resolvedStoreId)
    .select()
    .single();
}

export async function deleteDeliveryZone(
  id: string,
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

  return supabase
    .from("delivery_zones")
    .delete()
    .eq("id", id)
    .eq("store_id", resolvedStoreId);
}

/* =========================================================
   BANNERS
========================================================= */

export async function getBanners(storeId?: string | null) {
  const resolvedStoreId = await resolveStoreId(storeId);

  if (!resolvedStoreId) {
    return {
      data: [],
      error: {
        message: "Se requiere una tienda activa para cargar banners.",
      },
    };
  }

  return getBannersByStoreId(resolvedStoreId);
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

export async function getAdminBanners(storeId?: string | null) {
  const resolvedStoreId = await resolveStoreId(storeId);

  if (!resolvedStoreId) {
    return {
      data: [],
      error: {
        message: "Se requiere una tienda activa para cargar banners.",
      },
    };
  }

  return getAdminBannersByStoreId(resolvedStoreId);
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
  banner: Omit<Banner, "id" | "created_at">,
  storeId?: string | null
) {
  const resolvedStoreId = await resolveStoreId(storeId);

  if (!resolvedStoreId) {
    return {
      data: null,
      error: {
        message: "Se requiere una tienda activa para crear el banner.",
      },
    };
  }

  return createBannerForStore(resolvedStoreId, banner);
}

export async function updateBanner(
  id: string,
  banner: Partial<Banner>,
  storeId?: string | null
) {
  const resolvedStoreId = await resolveStoreId(
    storeId || banner.store_id || undefined
  );

  if (!resolvedStoreId) {
    return {
      data: null,
      error: {
        message: "Se requiere una tienda activa para actualizar el banner.",
      },
    };
  }

  return supabase
    .from("banners")
    .update({
      ...banner,
      store_id: resolvedStoreId,
    })
    .eq("id", id)
    .eq("store_id", resolvedStoreId)
    .select()
    .single();
}

export async function deleteBanner(
  id: string,
  storeId?: string | null
) {
  const resolvedStoreId = await resolveStoreId(storeId);

  if (!resolvedStoreId) {
    return {
      data: null,
      error: {
        message: "Se requiere una tienda activa para eliminar el banner.",
      },
    };
  }

  return supabase
    .from("banners")
    .delete()
    .eq("id", id)
    .eq("store_id", resolvedStoreId);
}
