import { supabase } from "@/lib/supabase";

/* =========================================================
   SERVICES - COMBOS
   Maneja combos y productos incluidos en cada combo
========================================================= */

export async function getCombos() {
  return await supabase
    .from("combos")
    .select(`
      *,
      combo_items (
        id,
        quantity,
        product_id,
        products (*)
      )
    `)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
}

export async function getActiveCombos() {
  return await supabase
    .from("combos")
    .select(`
      *,
      combo_items (
        id,
        quantity,
        product_id,
        products (*)
      )
    `)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
}

export async function getActiveCombosByStoreId(storeId: string) {
  return await supabase
    .from("combos")
    .select(`
      *,
      combo_items (
        id,
        quantity,
        product_id,
        products (*)
      )
    `)
    .eq("store_id", storeId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
}

export async function getComboById(id: string) {
  return await supabase
    .from("combos")
    .select(`
      *,
      combo_items (
        id,
        quantity,
        product_id,
        products (*)
      )
    `)
    .eq("id", id)
    .is("deleted_at", null)
    .single();
}

export async function createCombo(combo: {
  name: string;
  description?: string;
  image_url?: string;
  price: number;
  is_active?: boolean;
}) {
  if (typeof window !== "undefined") {
    const savedStore = localStorage.getItem("saas-current-store");

    if (savedStore) {
      const currentStore = JSON.parse(savedStore);

      return await supabase
        .from("combos")
        .insert({
          ...combo,
          store_id: currentStore.id,
        })
        .select()
        .single();
    }
  }

  return await supabase
    .from("combos")
    .insert(combo)
    .select()
    .single();
}

export async function updateCombo(
  id: string,
  combo: {
    name?: string;
    description?: string;
    image_url?: string;
    price?: number;
    is_active?: boolean;
  }
) {
  return await supabase
    .from("combos")
    .update({
      ...combo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
}

export async function deleteCombo(id: string) {
  return await supabase
    .from("combos")
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq("id", id);
}

export async function addProductToCombo(data: {
  combo_id: string;
  product_id: string;
  quantity: number;
}) {
  return await supabase
    .from("combo_items")
    .insert(data)
    .select()
    .single();
}

export async function updateComboItemQuantity(
  comboItemId: string,
  quantity: number
) {
  return await supabase
    .from("combo_items")
    .update({ quantity })
    .eq("id", comboItemId)
    .select()
    .single();
}

export async function removeProductFromCombo(comboItemId: string) {
  return await supabase
    .from("combo_items")
    .delete()
    .eq("id", comboItemId);
}