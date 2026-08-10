import { supabase } from "@/lib/supabase";

/* =========================================================
   INVENTORY SERVICE

   Maneja:
   - Validación de stock
   - Descuento automático de stock
   - Restauración de stock al enviar órdenes a papelera
   - Re-descuento de stock al restaurar órdenes desde papelera
========================================================= */

export async function validateOrderStock(
  orderItems: any[],
  storeId: string
) {
  if (!storeId) {
    throw new Error("No se encontró la tienda de la orden.");
  }
  for (const item of orderItems || []) {
    if (item.item_type === "product") {
      await validateProductStock(
        item.product_id,
        item.quantity,
        item.product_name,
        storeId
      );
    }

    if (item.item_type === "combo") {
      await validateComboStock(item.combo_id, item.quantity, storeId);
    }
  }
}

async function validateProductStock(
  productId: string,
  quantity: number,
  productName: string,
  storeId: string
) {
  if (!productId) {
    throw new Error(`El producto ${productName || "del pedido"} no tiene ID.`);
  }

  const { data: product, error } = await supabase
    .from("products")
    .select("stock")
    .eq("id", productId)
    .eq("store_id", storeId)
    .single();

  if (error || !product) {
    throw new Error(`El producto ${productName} ya no está disponible.`);
  }

  if (Number(product.stock || 0) < Number(quantity || 0)) {
    throw new Error(
      `Stock insuficiente para ${productName}. Disponibles: ${product.stock}`
    );
  }
}

async function validateComboStock(
  comboId: string,
  comboQuantity: number,
  storeId: string
) {
  if (!comboId) {
    throw new Error("El combo del pedido no tiene ID.");
  }

  const { data: combo, error: comboError } = await supabase
    .from("combos")
    .select("id")
    .eq("id", comboId)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .maybeSingle();

  if (comboError || !combo) {
    throw new Error("El combo ya no está disponible en esta tienda.");
  }

  const { data: comboItems, error } = await supabase
    .from("combo_items")
    .select(`
      quantity,
      product_id,
      products (
        name,
        stock
      )
    `)
    .eq("combo_id", comboId);

  if (error) throw error;

  for (const item of comboItems || []) {
    const totalNeeded = Number(item.quantity || 0) * Number(comboQuantity || 0);

    const product = Array.isArray(item.products)
      ? item.products[0]
      : item.products;

    if (!product) continue;

    if (Number(product.stock || 0) < totalNeeded) {
      throw new Error(`Stock insuficiente para ${product.name}.`);
    }
  }
}

/* =========================================================
   DESCONTAR INVENTARIO AL CREAR / RESTAURAR ORDEN
========================================================= */

export async function processOrderInventory(
  orderItems: any[],
  storeId: string
) {
  if (!storeId) {
    throw new Error("No se encontró la tienda de la orden.");
  }
  for (const item of orderItems || []) {
    if (item.item_type === "product") {
      await discountProductStock(item.product_id, item.quantity, storeId);
    }

    if (item.item_type === "combo") {
      await discountComboStock(item.combo_id, item.quantity, storeId);
    }
  }
}

async function discountProductStock(
  productId: string,
  quantity: number,
  storeId: string
) {
  if (!productId) return;

  const { data: product, error } = await supabase
    .from("products")
    .select("id, stock")
    .eq("id", productId)
    .eq("store_id", storeId)
    .single();

  if (error || !product) {
    throw new Error(`Producto no encontrado: ${productId}`);
  }

  const newStock = Number(product.stock || 0) - Number(quantity || 0);

  if (newStock < 0) {
    throw new Error("Stock insuficiente para completar la orden.");
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({ stock: newStock })
    .eq("id", productId)
    .eq("store_id", storeId);

  if (updateError) throw updateError;
}

async function discountComboStock(
  comboId: string,
  comboQuantity: number,
  storeId: string
) {
  if (!comboId) return;

  const { data: combo, error: comboError } = await supabase
    .from("combos")
    .select("id")
    .eq("id", comboId)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .maybeSingle();

  if (comboError || !combo) {
    throw new Error("El combo no pertenece a la tienda de la orden.");
  }

  const { data: comboItems, error } = await supabase
    .from("combo_items")
    .select(`
      quantity,
      product_id
    `)
    .eq("combo_id", comboId);

  if (error) throw error;

  for (const comboItem of comboItems || []) {
    const totalToDiscount =
      Number(comboItem.quantity || 0) * Number(comboQuantity || 0);

    await discountProductStock(
      comboItem.product_id,
      totalToDiscount,
      storeId
    );
  }
}

/* =========================================================
   RESTAURAR INVENTARIO AL ENVIAR ORDEN A PAPELERA
========================================================= */

export async function restoreOrderInventory(
  orderItems: any[],
  storeId: string
) {
  if (!storeId) {
    throw new Error("No se encontró la tienda de la orden.");
  }
  for (const item of orderItems || []) {
    if (item.item_type === "product") {
      await restoreProductStock(item.product_id, item.quantity, storeId);
    }

    if (item.item_type === "combo") {
      await restoreComboStock(item.combo_id, item.quantity, storeId);
    }
  }
}

async function restoreProductStock(
  productId: string,
  quantity: number,
  storeId: string
) {
  if (!productId) return;

  const { data: product, error } = await supabase
    .from("products")
    .select("id, stock")
    .eq("id", productId)
    .eq("store_id", storeId)
    .single();

  if (error || !product) {
    throw new Error(`Producto no encontrado para restaurar stock: ${productId}`);
  }

  const newStock = Number(product.stock || 0) + Number(quantity || 0);

  const { error: updateError } = await supabase
    .from("products")
    .update({ stock: newStock })
    .eq("id", productId)
    .eq("store_id", storeId);

  if (updateError) throw updateError;
}

async function restoreComboStock(
  comboId: string,
  comboQuantity: number,
  storeId: string
) {
  if (!comboId) return;

  const { data: combo, error: comboError } = await supabase
    .from("combos")
    .select("id")
    .eq("id", comboId)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .maybeSingle();

  if (comboError || !combo) {
    throw new Error("El combo no pertenece a la tienda de la orden.");
  }

  const { data: comboItems, error } = await supabase
    .from("combo_items")
    .select(`
      quantity,
      product_id
    `)
    .eq("combo_id", comboId);

  if (error) throw error;

  for (const comboItem of comboItems || []) {
    const totalToRestore =
      Number(comboItem.quantity || 0) * Number(comboQuantity || 0);

    await restoreProductStock(
      comboItem.product_id,
      totalToRestore,
      storeId
    );
  }
}
