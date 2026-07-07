import { supabase } from "@/lib/supabase";

/* =========================================================
   INVENTORY SERVICE

   Maneja:
   - Validación de stock
   - Descuento automático de stock
   - Restauración de stock al cancelar/eliminar órdenes
========================================================= */

export async function validateOrderStock(orderItems: any[]) {
  for (const item of orderItems) {
    if (item.item_type === "product") {
      await validateProductStock(
        item.product_id,
        item.quantity,
        item.product_name
      );
    }

    if (item.item_type === "combo") {
      await validateComboStock(item.combo_id, item.quantity);
    }
  }
}

/* =========================================================
   VALIDAR STOCK PRODUCTO
========================================================= */

async function validateProductStock(
  productId: string,
  quantity: number,
  productName: string
) {
  const { data: product, error } = await supabase
    .from("products")
    .select("stock")
    .eq("id", productId)
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

/* =========================================================
   VALIDAR STOCK COMBO
========================================================= */

async function validateComboStock(comboId: string, comboQuantity: number) {
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
   DESCONTAR INVENTARIO
========================================================= */

export async function processOrderInventory(orderItems: any[]) {
  for (const item of orderItems) {
    if (item.item_type === "product") {
      await discountProductStock(item.product_id, item.quantity);
    }

    if (item.item_type === "combo") {
      await discountComboStock(item.combo_id, item.quantity);
    }
  }
}

/* =========================================================
   DESCONTAR PRODUCTO
========================================================= */

async function discountProductStock(productId: string, quantity: number) {
  const { data: product, error } = await supabase
    .from("products")
    .select("id, stock")
    .eq("id", productId)
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
    .eq("id", productId);

  if (updateError) throw updateError;
}

/* =========================================================
   DESCONTAR COMBO
========================================================= */

async function discountComboStock(comboId: string, comboQuantity: number) {
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

    await discountProductStock(comboItem.product_id, totalToDiscount);
  }
}

/* =========================================================
   RESTAURAR INVENTARIO

   Se usa cuando una orden se envía a papelera/cancelación
   administrativa y queremos devolver el stock descontado.
========================================================= */

export async function restoreOrderInventory(orderItems: any[]) {
  for (const item of orderItems || []) {
    if (item.item_type === "product" && item.product_id) {
      await restoreProductStock(item.product_id, item.quantity);
    }

    if (item.item_type === "combo" && item.combo_id) {
      await restoreComboStock(item.combo_id, item.quantity);
    }
  }
}

/* =========================================================
   RESTAURAR PRODUCTO
========================================================= */

async function restoreProductStock(productId: string, quantity: number) {
  const { data: product, error } = await supabase
    .from("products")
    .select("id, stock")
    .eq("id", productId)
    .single();

  if (error || !product) {
    throw new Error(`Producto no encontrado para restaurar stock: ${productId}`);
  }

  const restoredStock = Number(product.stock || 0) + Number(quantity || 0);

  const { error: updateError } = await supabase
    .from("products")
    .update({ stock: restoredStock })
    .eq("id", productId);

  if (updateError) throw updateError;
}

/* =========================================================
   RESTAURAR COMBO
========================================================= */

async function restoreComboStock(comboId: string, comboQuantity: number) {
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

    await restoreProductStock(comboItem.product_id, totalToRestore);
  }
}
