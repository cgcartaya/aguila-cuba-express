import { supabase } from "@/lib/supabase";

import {
  DEFAULT_STORE_SLUG,
  type Store,
} from "@/lib/config/store";

/* =========================================================
   OBTENER TIENDA POR SLUG
========================================================= */

export async function getStoreBySlug(
  slug = DEFAULT_STORE_SLUG
) {
  const response = await supabase
    .from("stores")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  return response;
}

/* =========================================================
   TIENDA POR DEFECTO
========================================================= */

export async function getDefaultStore() {
  return getStoreBySlug(DEFAULT_STORE_SLUG);
}

/* =========================================================
   LISTAR TIENDAS
========================================================= */

export async function getStores() {
  return supabase
    .from("stores")
    .select("*")
    .order("created_at", {
      ascending: false,
    });
}

/* =========================================================
   CREAR TIENDA
========================================================= */

export async function createStore(
  store: Omit<Store, "id" | "created_at">
) {
  return supabase
    .from("stores")
    .insert(store)
    .select()
    .single();
}

/* =========================================================
   ACTUALIZAR TIENDA
========================================================= */

export async function updateStore(
  id: string,
  store: Partial<Store>
) {
  return supabase
    .from("stores")
    .update(store)
    .eq("id", id)
    .select()
    .single();
}

/* =========================================================
   ACTIVAR / DESACTIVAR
========================================================= */

export async function toggleStoreStatus(
  id: string,
  isActive: boolean
) {
  return supabase
    .from("stores")
    .update({
      is_active: !isActive,
    })
    .eq("id", id);
}