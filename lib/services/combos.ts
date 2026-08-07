import { supabase } from "@/lib/supabase";

/* =========================================================
   SERVICES - COMBOS
   Maneja combos y productos incluidos en cada combo
========================================================= */

const COMBO_PUBLIC_SELECT = `
  id,
  store_id,
  name,
  description,
  image_url,
  price,
  is_active,
  created_at,
  combo_items (
    id,
    quantity,
    product_id,
    products (
      id,
      name,
      price,
      image_url,
      stock,
      category,
      is_active,
      store_id
    )
  )
`;

export async function getCombosByStoreId(storeId: string) {
  return await supabase
    .from("combos")
    .select(COMBO_PUBLIC_SELECT)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
}

// Compatibilidad temporal: la tienda debe llegar explícitamente.
export async function getCombos(storeId?: string) {
  if (!storeId) {
    return {
      data: [],
      error: {
        message: "Se requiere storeId explícito para cargar combos.",
      },
    };
  }

  return getCombosByStoreId(storeId);
}

export async function getActiveCombosByStoreId(storeId: string) {
  return await supabase
    .from("combos")
    .select(COMBO_PUBLIC_SELECT)
    .eq("store_id", storeId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(8);
}

export async function getComboById(id: string, storeId: string) {
  return await supabase
    .from("combos")
    .select(COMBO_PUBLIC_SELECT)
    .eq("id", id)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .single();
}

export async function createComboForStore(
  storeId: string,
  combo: {
    name: string;
    description?: string;
    image_url?: string;
    price: number;
    is_active?: boolean;
  }
) {
  return await supabase
    .from("combos")
    .insert({
      ...combo,
      store_id: storeId,
    })
    .select()
    .single();
}

export async function createCombo(
  combo: {
    name: string;
    description?: string;
    image_url?: string;
    price: number;
    is_active?: boolean;
  },
  storeId?: string
) {
  if (!storeId) {
    return {
      data: null,
      error: {
        message: "Se requiere storeId explícito para crear el combo.",
      },
    };
  }

  return createComboForStore(storeId, combo);
}

export async function updateCombo(
  id: string,
  combo: {
    name?: string;
    description?: string;
    image_url?: string;
    price?: number;
    is_active?: boolean;
  },
  storeId: string
) {
  return await supabase
    .from("combos")
    .update({
      ...combo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("store_id", storeId)
    .select()
    .single();
}

export async function deleteCombo(id: string, storeId: string) {
  return await supabase
    .from("combos")
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("store_id", storeId);
}

async function comboBelongsToStore(comboId: string, storeId: string) {
  const { data, error } = await supabase
    .from("combos")
    .select("id")
    .eq("id", comboId)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .maybeSingle();

  return {
    ok: Boolean(data) && !error,
    error,
  };
}

async function productBelongsToStore(productId: string, storeId: string) {
  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .maybeSingle();

  return {
    ok: Boolean(data) && !error,
    error,
  };
}

export async function addProductToCombo(
  data: {
    combo_id: string;
    product_id: string;
    quantity: number;
  },
  storeId: string
) {
  const [comboCheck, productCheck] = await Promise.all([
    comboBelongsToStore(data.combo_id, storeId),
    productBelongsToStore(data.product_id, storeId),
  ]);

  if (!comboCheck.ok || !productCheck.ok) {
    return {
      data: null,
      error:
        comboCheck.error ||
        productCheck.error || {
          message:
            "El combo o el producto no pertenece a la tienda activa.",
        },
    };
  }

  return await supabase
    .from("combo_items")
    .insert(data)
    .select()
    .single();
}

export async function updateComboItemQuantity(
  comboItemId: string,
  comboId: string,
  quantity: number,
  storeId: string
) {
  const comboCheck = await comboBelongsToStore(comboId, storeId);

  if (!comboCheck.ok) {
    return {
      data: null,
      error:
        comboCheck.error || {
          message: "El combo no pertenece a la tienda activa.",
        },
    };
  }

  return await supabase
    .from("combo_items")
    .update({ quantity })
    .eq("id", comboItemId)
    .eq("combo_id", comboId)
    .select()
    .single();
}

export async function removeProductFromCombo(
  comboItemId: string,
  comboId: string,
  storeId: string
) {
  const comboCheck = await comboBelongsToStore(comboId, storeId);

  if (!comboCheck.ok) {
    return {
      data: null,
      error:
        comboCheck.error || {
          message: "El combo no pertenece a la tienda activa.",
        },
    };
  }

  return await supabase
    .from("combo_items")
    .delete()
    .eq("id", comboItemId)
    .eq("combo_id", comboId);
}
