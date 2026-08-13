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

/**
 * Suma cuánto necesita cada producto (id -> cantidad), expandiendo los
 * combos a los productos reales que contienen. Se usa tanto para validar
 * disponibilidad como para descontar, así los dos pasos siempre miran
 * exactamente la misma lista.
 */
async function collectProductNeeds(orderId: string) {
  const needs = new Map<string, number>();

  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("item_type, product_id, combo_id, quantity")
    .eq("order_id", orderId);

  for (const item of (items || []) as OrderItemRow[]) {
    if (item.item_type === "product" && item.product_id) {
      needs.set(item.product_id, (needs.get(item.product_id) || 0) + Number(item.quantity || 0));
      continue;
    }

    if (item.item_type === "combo" && item.combo_id) {
      const { data: comboItems } = await supabaseAdmin
        .from("combo_items")
        .select("quantity, product_id")
        .eq("combo_id", item.combo_id);

      for (const comboItem of comboItems || []) {
        if (!comboItem.product_id) continue;
        const need = Number(comboItem.quantity || 0) * Number(item.quantity || 0);
        needs.set(comboItem.product_id, (needs.get(comboItem.product_id) || 0) + need);
      }
    }
  }

  return needs;
}

export type ReactivateOrderResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Cuando alguien vuelve a una orden que ya quedó marcada "expired" (el
 * pago con tarjeta se venció sin completarse y el stock ya se devolvió,
 * ver checkout.session.expired en stripe-webhook-handler.ts) y quiere
 * retomar el pago, hay que volver a apartar el stock antes de mandarlo
 * a Stripe otra vez — si alguien más se llevó lo que quedaba mientras
 * tanto, no se puede seguir adelante como si nada.
 *
 * Se usa desde app/api/checkout/pay-with-card/route.ts justo antes de
 * crear la nueva sesión de Stripe, solo cuando payment_status === "expired".
 */
export async function reactivateExpiredOrder(orderId: string): Promise<ReactivateOrderResult> {
  const needs = await collectProductNeeds(orderId);

  // 1) Validar TODO primero, antes de descontar nada — así nunca se
  //    queda a medio descontar si un producto ya no alcanza.
  for (const [productId, neededQty] of needs) {
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("stock, name")
      .eq("id", productId)
      .maybeSingle();

    if (!product || Number(product.stock || 0) < neededQty) {
      return {
        ok: false,
        message: `Ya no hay suficiente stock de "${product?.name || "un producto de tu pedido"}" para retomar este pedido tal como estaba.`,
      };
    }
  }

  // 2) Todo disponible: descontar de nuevo y reactivar la orden.
  for (const [productId, neededQty] of needs) {
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("stock")
      .eq("id", productId)
      .maybeSingle();

    if (!product) continue;

    await supabaseAdmin
      .from("products")
      .update({ stock: Number(product.stock || 0) - neededQty })
      .eq("id", productId);
  }

  await supabaseAdmin
    .from("orders")
    .update({ payment_status: "pending", stock_restored: false })
    .eq("id", orderId);

  return { ok: true };
}
