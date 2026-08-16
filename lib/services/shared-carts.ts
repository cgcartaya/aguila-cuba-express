import { supabase } from "@/lib/supabase";
import type { CartItem } from "@/types/cart";

export type SharedCart = {
  id: string;
  store_id: string;
  items: CartItem[];
  created_at: string;
};

function generateShareId() {
  // 10 caracteres alfanuméricos, suficiente para un enlace corto y
  // que no choque en la práctica (no es un id sensible/secreto real,
  // es solo para identificar el snapshot público).
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  }

  return Math.random().toString(36).slice(2, 12);
}

// Guarda una foto exacta del carrito actual y devuelve un id corto
// para compartir. No depende de que el destinatario tenga sesión ni
// de que el carrito siga existiendo en el localStorage de quien
// comparte.
export async function createSharedCart(storeId: string, cart: CartItem[]) {
  if (!storeId) {
    return {
      data: null,
      error: { message: "No se encontró la tienda activa." },
    };
  }

  if (!cart.length) {
    return {
      data: null,
      error: { message: "El carrito está vacío." },
    };
  }

  const id = generateShareId();

  const { data, error } = await supabase
    .from("shared_carts")
    .insert({ id, store_id: storeId, items: cart })
    .select()
    .single();

  return { data: data as SharedCart | null, error };
}

export async function getSharedCart(id: string) {
  const { data, error } = await supabase
    .from("shared_carts")
    .select("*")
    .eq("id", id)
    .single();

  return { data: data as SharedCart | null, error };
}
