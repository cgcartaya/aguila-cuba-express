import { supabaseAdmin } from "@/lib/supabase-admin";

/* =========================================================
   RESTAURAR STOCK DE UNA ORDEN — VERSIÓN SERVER-SIDE
   ---------------------------------------------------------
   Misma lógica que restoreOrderInventory en
   lib/services/inventory.ts (esa usa el cliente `supabase` del
   navegador, pensada para el panel admin con sesión de staff).
   Esta versión usa supabaseAdmin porque se llama desde el
   webhook de Stripe, donde no hay sesión de usuario.

   Se usa cuando una sesión de pago con tarjeta vence sin
   completarse (checkout.session.expired) — ver
   lib/services/stripe-webhook-handler.ts.
========================================================= */

type OrderItemRow = {
  item_type: "product" | "combo" | null;
  product_id: string | null;
  combo_id: string | null;
  quantity: number | null;
};

async function restoreProductStock(productId: string, quantity: number) {
  if (!productId || !quantity) return;

  const { data: product } = await supabaseAdmin
    .from("products")
    .select("id, stock")
    .eq("id", productId)
    .maybeSingle();

  if (!product) return;

  await supabaseAdmin
    .from("products")
    .update({ stock: Number(product.stock || 0) + Number(quantity || 0) })
    .eq("id", productId);
}

async function restoreComboStock(comboId: string, comboQuantity: number) {
  if (!comboId || !comboQuantity) return;

  const { data: comboItems } = await supabaseAdmin
    .from("combo_items")
    .select("quantity, product_id")
    .eq("combo_id", comboId);

  for (const comboItem of comboItems || []) {
    const totalToRestore = Number(comboItem.quantity || 0) * Number(comboQuantity || 0);
    await restoreProductStock(comboItem.product_id, totalToRestore);
  }
}

/**
 * Devuelve al stock todos los productos (directos o dentro de combos) de
 * una orden. Segura de llamar más de una vez PERO quien la llama debe
 * evitar duplicar la devolución — ver el guard con `stock_restored` en
 * el webhook y en OrdersManager.tsx (sendOrderToTrash).
 */
export async function restoreOrderStockServerSide(orderId: string) {
  const { data: items, error } = await supabaseAdmin
    .from("order_items")
    .select("item_type, product_id, combo_id, quantity")
    .eq("order_id", orderId);

  if (error || !items) return;

  for (const item of items as OrderItemRow[]) {
    if (item.item_type === "product" && item.product_id) {
      await restoreProductStock(item.product_id, Number(item.quantity || 0));
    }

    if (item.item_type === "combo" && item.combo_id) {
      await restoreComboStock(item.combo_id, Number(item.quantity || 0));
    }
  }
}
