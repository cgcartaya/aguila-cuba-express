import { supabase } from "@/lib/supabase";
import { getDefaultStore } from "@/lib/services/stores";

import type {
  Category,
  StoreSettings,
  Banner,
} from "@/components/admin/settings/types";

/* =========================================================
   TIPOS LOCALES - ZONAS DE ENTREGA

   Esta interfaz vive aquí para no romper el proyecto si todavía
   no has creado el tipo global en components/admin/settings/types.
========================================================= */

export type DeliveryZone = {
  id: string;
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
   CATEGORIES
========================================================= */

export async function getCategories() {
  /*
    Si estamos en el admin usamos la tienda
    seleccionada en el SaaS.
  */

  if (typeof window !== "undefined") {
    const savedStore = localStorage.getItem(
      "saas-current-store"
    )

    if (savedStore) {
      const currentStore = JSON.parse(savedStore)

      return supabase
        .from("categories")
        .select("id, store_id, name, color, icon, sort_order, is_active, created_at")
        .eq("store_id", currentStore.id)
        .order("sort_order", {
          ascending: true,
        })
    }
  }

  /*
    Fallback para producción actual
    (Águila).
  */

  const { data: store } = await getDefaultStore()

  if (!store) {
    return { data: [], error: null }
  }

  return supabase
    .from("categories")
    .select("id, store_id, name, color, icon, sort_order, is_active, created_at")
    .eq("store_id", store.id)
    .order("sort_order", {
      ascending: true,
    })
}

/* =========================================================
   CATEGORÍAS ACTIVAS
========================================================= */

export async function getActiveCategories() {
  /*
    TIENDA PÚBLICA (/tienda)
    Siempre debe usar la tienda por defecto
    (Águila Cuba Express).
  */

  const { data: store } = await getDefaultStore()

  if (!store) {
    return { data: [], error: null }
  }

  return supabase
    .from("categories")
    .select("id, store_id, name, color, icon, sort_order, is_active, created_at")
    .eq("store_id", store.id)
    .eq("is_active", true)
    .order("sort_order", {
      ascending: true,
    })
}

export async function getAdminActiveCategories() {
  if (typeof window !== "undefined") {
    const savedStore = localStorage.getItem(
      "saas-current-store"
    )

    if (savedStore) {
      const currentStore = JSON.parse(savedStore)

      return supabase
        .from("categories")
        .select("id, store_id, name, color, icon, sort_order, is_active, created_at")
        .eq("store_id", currentStore.id)
        .eq("is_active", true)
        .order("sort_order", {
          ascending: true,
        })
    }
  }

  return getActiveCategories()
}

export async function createCategory(
  category: Omit<Category, "id" | "created_at">
) {
  if (typeof window !== "undefined") {
    const savedStore = localStorage.getItem("saas-current-store")

    if (savedStore) {
      const currentStore = JSON.parse(savedStore)

      return supabase
        .from("categories")
        .insert({
          ...category,
          store_id: currentStore.id,
        })
        .select()
        .single()
    }
  }

  const { data: store } = await getDefaultStore()

  if (!store) {
    return {
      data: null,
      error: {
        message: "No se encontró la tienda activa",
      },
    }
  }

  return supabase
    .from("categories")
    .insert({
      ...category,
      store_id: store.id,
    })
    .select()
    .single()
}

export async function updateCategory(
  id: string,
  category: Partial<Category>
) {
  return supabase
    .from("categories")
    .update(category)
    .eq("id", id)
    .select()
    .single();
}

export async function deleteCategory(id: string) {
  return supabase
    .from("categories")
    .delete()
    .eq("id", id);
}

/* =========================================================
   STORE SETTINGS

   De momento seguimos utilizando la configuración
   actual global.

   Más adelante también se convertirá en multi-tienda.
========================================================= */

export async function getStoreSettings() {
  return supabase
    .from("store_settings")
    .select("*")
    .limit(1)
    .single();
}

export async function saveStoreSettings(
  settings: Partial<StoreSettings>
) {
  const existing = await getStoreSettings();

  if (existing.data) {
    return supabase
      .from("store_settings")
      .update(settings)
      .eq("id", existing.data.id)
      .select()
      .single();
  }

  return supabase
    .from("store_settings")
    .insert(settings)
    .select()
    .single();
}

/* =========================================================
   DELIVERY ZONES

   De momento siguen siendo globales.
========================================================= */

export async function getDeliveryZones() {
  return supabase
    .from("delivery_zones")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("municipality", { ascending: true })
    .order("zone_name", { ascending: true });
}

export async function getActiveDeliveryZones() {
  return supabase
    .from("delivery_zones")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("municipality", { ascending: true })
    .order("zone_name", { ascending: true });
}

export async function createDeliveryZone(
  zone: Omit<DeliveryZone, "id" | "created_at">
) {
  return supabase
    .from("delivery_zones")
    .insert(zone)
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
  /*
    TIENDA PÚBLICA /tienda
    Siempre debe usar Águila Cuba Express.
    Nunca debe leer localStorage del admin.
  */

  const { data: store } = await getDefaultStore()

  if (!store) {
    return { data: [], error: null }
  }

  return supabase
    .from("banners")
    .select("id, store_id, title, subtitle, image_url, button_text, button_link, is_active, sort_order, layout_type, background_color, text_color, accent_color, badge_text, product_image_url, category_id, created_at")
    .eq("store_id", store.id)
    .eq("is_active", true)
    .order("sort_order", {
      ascending: true,
    })
    .limit(8)
}

export async function getAdminBanners() {
  if (typeof window !== "undefined") {
    const savedStore = localStorage.getItem(
      "saas-current-store"
    )

    if (savedStore) {
      const currentStore = JSON.parse(savedStore)

      return supabase
        .from("banners")
        .select("id, store_id, title, subtitle, image_url, button_text, button_link, is_active, sort_order, layout_type, background_color, text_color, accent_color, badge_text, product_image_url, category_id, created_at")
        .eq("store_id", currentStore.id)
        .order("sort_order", {
          ascending: true,
        })
    }
  }

  return getBanners()
}

/* =========================================================
   BANNERS POR ID DE TIENDA
========================================================= */

export async function getBannersByStoreId(
  storeId: string
) {
  return supabase
    .from("banners")
    .select("id, store_id, title, subtitle, image_url, button_text, button_link, is_active, sort_order, layout_type, background_color, text_color, accent_color, badge_text, product_image_url, category_id, created_at")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("sort_order", {
      ascending: true,
    })
    .limit(8)
}

export async function createBanner(
  banner: Omit<Banner, "id" | "created_at">
) {
  /*
    ADMIN → usa la tienda seleccionada
  */

  if (typeof window !== "undefined") {
    const savedStore = localStorage.getItem(
      "saas-current-store"
    )

    if (savedStore) {
      const currentStore = JSON.parse(savedStore)

      return supabase
        .from("banners")
        .insert({
          ...banner,
          store_id: currentStore.id,
        })
        .select()
        .single()
    }
  }

  /*
    Fallback → tienda por defecto
  */

  const { data: store } = await getDefaultStore()

  if (!store) {
    return {
      data: null,
      error: {
        message: "No se encontró la tienda activa",
      },
    }
  }

  return supabase
    .from("banners")
    .insert({
      ...banner,
      store_id: store.id,
    })
    .select()
    .single()
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
    .single()
}

export async function deleteBanner(id: string) {
  return supabase
    .from("banners")
    .delete()
    .eq("id", id)
}
export async function getActiveCategoriesByStoreId(storeId: string) {
  return supabase
    .from("categories")
    .select("id, store_id, name, color, icon, sort_order, is_active, created_at")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
}