import { supabase } from "@/lib/supabase";
import type {
  Category,
  StoreSettings,
  Banner,
} from "@/components/admin/settings/types";

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

   Utilizado por:
   - Crear producto
   - Editar producto
   - Menú sticky de la tienda
   - Filtros públicos

   Solo devuelve categorías activas.
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
  return supabase
    .from("categories")
    .insert(category)
    .select()
    .single();
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
   BANNERS
========================================================= */

export async function getBanners() {
  return supabase
    .from("banners")
    .select("*")
    .order("sort_order", { ascending: true });
}

export async function createBanner(
  banner: Omit<Banner, "id" | "created_at">
) {
  return supabase
    .from("banners")
    .insert(banner)
    .select()
    .single();
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