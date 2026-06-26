import { supabase } from "@/lib/supabase";
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
  return supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
}

/* =========================================================
   CATEGORÍAS ACTIVAS
========================================================= */

export async function getActiveCategories() {
  return supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
}

export async function createCategory(
  category: Omit<Category, "id" | "created_at">
) {
  return supabase.from("categories").insert(category).select().single();
}

export async function updateCategory(id: string, category: Partial<Category>) {
  return supabase.from("categories").update(category).eq("id", id).select().single();
}

export async function deleteCategory(id: string) {
  return supabase.from("categories").delete().eq("id", id);
}

/* =========================================================
   STORE SETTINGS
========================================================= */

export async function getStoreSettings() {
  return supabase.from("store_settings").select("*").limit(1).single();
}

export async function saveStoreSettings(settings: Partial<StoreSettings>) {
  const existing = await getStoreSettings();

  if (existing.data) {
    return supabase
      .from("store_settings")
      .update(settings)
      .eq("id", existing.data.id)
      .select()
      .single();
  }

  return supabase.from("store_settings").insert(settings).select().single();
}

/* =========================================================
   DELIVERY ZONES

   Zonas reales de domicilio:
   - Municipio
   - Zona
   - Costo de entrega
   - Compra mínima
   - Domicilio gratis desde
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
  return supabase.from("delivery_zones").insert(zone).select().single();
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
  return supabase.from("delivery_zones").delete().eq("id", id);
}

/* =========================================================
   BANNERS
========================================================= */

export async function getBanners() {
  return supabase.from("banners").select("*").order("sort_order", {
    ascending: true,
  });
}

export async function createBanner(banner: Omit<Banner, "id" | "created_at">) {
  return supabase.from("banners").insert(banner).select().single();
}

export async function updateBanner(id: string, banner: Partial<Banner>) {
  return supabase.from("banners").update(banner).eq("id", id).select().single();
}

export async function deleteBanner(id: string) {
  return supabase.from("banners").delete().eq("id", id);
}