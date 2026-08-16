import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStoreBySlug } from "@/lib/services/stores";
import { getMenuAvailabilityMap } from "@/lib/services/menu-availability-public";
import {
  sendMenuOrderAdminAlertEmail,
  sendMenuOrderReceivedEmail,
} from "@/lib/notifications/menu-order-email";

import type { MenuCartSelectedOption, MenuOrderType } from "@/lib/menu/types";

/*
 * SOLO SERVIDOR — usa supabaseAdmin para poder validar/descontar
 * inventario y guardar la orden sin exponer nada de esto a un
 * cliente anónimo. El navegador nunca llama esto directamente.
 */

export type CreateMenuOrderLine = {
  menu_item_id: string;
  quantity: number;
  selected_options: MenuCartSelectedOption[];
  notes?: string;
};

export type CreateMenuOrderInput = {
  storeSlug: string;
  orderType: MenuOrderType;
  tableNumber?: string;
  deliveryAddress?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
  lines: CreateMenuOrderLine[];
};

export type CreateMenuOrderResult =
  | { ok: true; id: string; total: number }
  | { ok: false; status: number; error: string };

function lineTotal(basePrice: number, options: MenuCartSelectedOption[], quantity: number) {
  const optionsTotal = options.reduce((sum, o) => sum + (Number(o.price_delta) || 0), 0);
  return (basePrice + optionsTotal) * quantity;
}

export async function createMenuOrder(input: CreateMenuOrderInput): Promise<CreateMenuOrderResult> {
  if (!input.lines.length) {
    return { ok: false, status: 400, error: "El pedido está vacío." };
  }

  const store = await getStoreBySlug(input.storeSlug);
  if (!store || !store.module_menu_enabled) {
    return { ok: false, status: 404, error: "Módulo de menú no disponible." };
  }

  // 1) Traer todos los platillos pedidos de una vez, para validar
  //    precio real (nunca confiar en lo que mande el navegador) y
  //    disponibilidad de inventario.
  const itemIds = [...new Set(input.lines.map((l) => l.menu_item_id))];
  const { data: items, error: itemsError } = await supabaseAdmin
    .from("menu_items")
    .select("id, name, price, stock, is_active")
    .in("id", itemIds)
    .eq("store_id", store.id);

  if (itemsError || !items) {
    return { ok: false, status: 500, error: "No se pudieron validar los platillos." };
  }

  const itemsById = new Map(items.map((i) => [i.id, i]));

  // 2) Validar TODO primero (existe, activo, alcanza cupo/inventario)
  //    antes de descontar nada — mismo criterio que
  //    reactivateExpiredOrder en order-stock-admin.ts: nunca dejar un
  //    descuento a medias. La disponibilidad combina cupo diario e
  //    inventario permanente en un solo cálculo (ver
  //    getMenuAvailabilityMap) para que nunca se desincronicen.
  const neededByItem = new Map<string, number>();
  for (const line of input.lines) {
    const item = itemsById.get(line.menu_item_id);
    if (!item || !item.is_active) {
      return { ok: false, status: 422, error: "Uno de los platillos ya no está disponible." };
    }
    neededByItem.set(line.menu_item_id, (neededByItem.get(line.menu_item_id) || 0) + line.quantity);
  }

  const availability = await getMenuAvailabilityMap(store.id);
  for (const [itemId, neededQty] of neededByItem) {
    const item = itemsById.get(itemId)!;
    const remaining = availability[itemId];
    if (remaining !== null && remaining !== undefined && remaining < neededQty) {
      return {
        ok: false,
        status: 422,
        error:
          remaining === 0
            ? `"${item.name}" ya no está disponible.`
            : `Ya no queda suficiente "${item.name}" (quedan ${remaining}).`,
      };
    }
  }

  // 3) Armar líneas con precio real del servidor (ignora cualquier
  //    precio que hubiera llegado del cliente) y calcular el total.
  const orderLines = input.lines.map((line) => {
    const item = itemsById.get(line.menu_item_id)!;
    const total = lineTotal(Number(item.price), line.selected_options, line.quantity);
    return {
      menu_item_id: item.id,
      item_name: item.name,
      unit_price: Number(item.price),
      quantity: line.quantity,
      selected_options: line.selected_options,
      notes: line.notes || null,
      line_total: total,
    };
  });

  const subtotal = orderLines.reduce((sum, l) => sum + l.line_total, 0);

  let deliveryFee = 0;
  if (input.orderType === "delivery") {
    const { data: settings } = await supabaseAdmin
      .from("store_settings")
      .select("menu_delivery_fee")
      .eq("store_id", store.id)
      .maybeSingle();
    deliveryFee = Number(settings?.menu_delivery_fee || 0);
  }

  const total = subtotal + deliveryFee;

  // 4) Insertar la orden.
  const { data: order, error: orderError } = await supabaseAdmin
    .from("menu_orders")
    .insert({
      store_id: store.id,
      order_type: input.orderType,
      table_number: input.orderType === "dine_in" ? input.tableNumber || null : null,
      delivery_address: input.orderType === "delivery" ? input.deliveryAddress || null : null,
      delivery_fee: deliveryFee,
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      customer_email: input.customerEmail || null,
      notes: input.notes || null,
      subtotal,
      total,
      status: "received",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("createMenuOrder insert error:", orderError?.message);
    return { ok: false, status: 500, error: "No se pudo crear el pedido." };
  }

  // 5) Insertar las líneas.
  const { error: itemsInsertError } = await supabaseAdmin
    .from("menu_order_items")
    .insert(orderLines.map((l) => ({ ...l, order_id: order.id })));

  if (itemsInsertError) {
    console.error("createMenuOrder items insert error:", itemsInsertError.message);
    // La orden ya quedó creada — mejor dejarla con líneas parciales
    // (visible en el admin) que perder el pedido por completo.
  }

  // 6) Descontar inventario de los platillos que sí lo controlan.
  for (const [itemId, neededQty] of neededByItem) {
    const item = itemsById.get(itemId)!;
    if (item.stock === null) continue;
    await supabaseAdmin
      .from("menu_items")
      .update({ stock: Math.max(0, item.stock - neededQty) })
      .eq("id", itemId);
  }

  // 7) Emails — ninguno debe tumbar la orden ya creada.
  const emailLines = orderLines.map((l) => ({
    name: l.item_name,
    quantity: l.quantity,
    lineTotal: l.line_total,
  }));

  if (input.customerEmail) {
    try {
      await sendMenuOrderReceivedEmail({
        to: input.customerEmail,
        storeName: store.name,
        customerFirstName: input.customerName,
        orderType: input.orderType,
        tableNumber: input.tableNumber,
        deliveryAddress: input.deliveryAddress,
        lines: emailLines,
        total,
      });
    } catch (error) {
      console.error("createMenuOrder email cliente error:", error);
    }
  }

  try {
    const { data: settings } = await supabaseAdmin
      .from("store_settings")
      .select("order_notification_email")
      .eq("store_id", store.id)
      .maybeSingle();

    if (settings?.order_notification_email) {
      const baseUrl = store.domain
        ? `https://${store.domain.replace(/^https?:\/\//, "").replace(/^www\./, "")}`
        : "https://perlamarketplace.com";

      await sendMenuOrderAdminAlertEmail({
        to: settings.order_notification_email,
        storeName: store.name,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        orderType: input.orderType,
        tableNumber: input.tableNumber,
        deliveryAddress: input.deliveryAddress,
        lines: emailLines,
        total,
        adminUrl: `${baseUrl}/admin/menu/ordenes`,
      });
    }
  } catch (error) {
    console.error("createMenuOrder email negocio error:", error);
  }

  return { ok: true, id: order.id, total };
}
