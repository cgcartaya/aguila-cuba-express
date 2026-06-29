/* =========================================================
   STORES SERVICE

   Servicio central para manejar tiendas/clientes del SaaS.

   IMPORTANTE:

   De momento todo el sistema utilizará automáticamente
   la tienda "aguila".

   Más adelante este servicio detectará la tienda según:

   - dominio
   - subdominio
   - slug
========================================================= */

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
  return supabase
    .from("stores")
    .select("*")
    .eq("slug", slug)
    .single<Store>();
}

/* =========================================================
   TIENDA POR DEFECTO

   Actualmente devuelve Águila.

   En el futuro:

   const hostname = headers().get("host")

========================================================= */

export async function getDefaultStore() {
  return getStoreBySlug(DEFAULT_STORE_SLUG);
}

/* =========================================================
   LISTAR TODAS LAS TIENDAS

   Útil para la futura administración SaaS.
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
   DESACTIVAR TIENDA
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