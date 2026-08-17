import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStoreBySlug } from "@/lib/services/stores";
import { getMenuAvailabilityMap } from "@/lib/services/menu-availability-public";
import {
  sendMenuOrderAdminAlertEmail,
  sendMenuOrderReceivedEmail,
} from "@/lib/notifications/menu-order-email";

import type {
  MenuCartSelectedOption,
  MenuOrderType,
} from "@/lib/menu/types";

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
  deliveryZoneId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
  lines: CreateMenuOrderLine[];
};

export type CreateMenuOrderResult =
  | { ok: true; id: string; total: number }
  | { ok: false; status: number; error: string };

type DbOption = {
  id: string;
  group_id: string;
  label: string;
  price_delta: number;
  is_available: boolean;
};

type DbGroup = {
  id: string;
  name: string;
  is_required: boolean;
  max_selections: number;
  menu_item_options: DbOption[];
};

function lineTotal(
  basePrice: number,
  options: MenuCartSelectedOption[],
  quantity: number
) {
  const optionsTotal = options.reduce(
    (sum, option) => sum + (Number(option.price_delta) || 0),
    0
  );
  return (basePrice + optionsTotal) * quantity;
}

export async function createMenuOrder(
  input: CreateMenuOrderInput
): Promise<CreateMenuOrderResult> {
  if (!input.lines.length) {
    return { ok: false, status: 400, error: "El pedido está vacío." };
  }

  const store = await getStoreBySlug(input.storeSlug);
  if (!store || !store.module_menu_enabled) {
    return {
      ok: false,
      status: 404,
      error: "Módulo de menú no disponible.",
    };
  }

  const { data: operationSettings } = await supabaseAdmin
    .from("store_settings")
    .select(
      "menu_orders_paused, menu_pause_message, menu_delivery_fee, menu_estimated_prep_minutes"
    )
    .eq("store_id", store.id)
    .maybeSingle();

  if (operationSettings?.menu_orders_paused) {
    return {
      ok: false,
      status: 423,
      error:
        operationSettings.menu_pause_message ||
        "El restaurante pausó temporalmente los pedidos en línea.",
    };
  }

  const itemIds = [
    ...new Set(input.lines.map((line) => line.menu_item_id)),
  ];

  const { data: items, error: itemsError } = await supabaseAdmin
    .from("menu_items")
    .select(`
      id,
      name,
      price,
      stock,
      is_active,
      manual_unavailable,
      menu_item_option_groups (
        id,
        name,
        is_required,
        max_selections,
        menu_item_options (
          id,
          group_id,
          label,
          price_delta,
          is_available
        )
      )
    `)
    .in("id", itemIds)
    .eq("store_id", store.id);

  if (itemsError || !items) {
    return {
      ok: false,
      status: 500,
      error: "No se pudieron validar los platillos.",
    };
  }

  const itemsById = new Map(items.map((item: any) => [item.id, item]));
  const neededByItem = new Map<string, number>();
  const canonicalLines: {
    menu_item_id: string;
    item_name: string;
    unit_price: number;
    quantity: number;
    selected_options: MenuCartSelectedOption[];
    notes: string | null;
    line_total: number;
  }[] = [];

  for (const line of input.lines) {
    const item: any = itemsById.get(line.menu_item_id);

    if (!item || !item.is_active || item.manual_unavailable) {
      return {
        ok: false,
        status: 422,
        error: "Uno de los platillos ya no está disponible.",
      };
    }

    const quantity = Math.max(1, Math.min(99, Number(line.quantity) || 1));
    neededByItem.set(
      line.menu_item_id,
      (neededByItem.get(line.menu_item_id) || 0) + quantity
    );

    const groups = (item.menu_item_option_groups || []) as DbGroup[];
    const selectedByGroup = new Map<string, string[]>();

    for (const incoming of line.selected_options || []) {
      if (!selectedByGroup.has(incoming.group_id)) {
        selectedByGroup.set(incoming.group_id, []);
      }
      selectedByGroup.get(incoming.group_id)!.push(incoming.option_id);
    }

    const canonicalOptions: MenuCartSelectedOption[] = [];

    for (const group of groups) {
      const selectedIds = [
        ...new Set(selectedByGroup.get(group.id) || []),
      ];

      if (group.is_required && selectedIds.length === 0) {
        return {
          ok: false,
          status: 422,
          error: `Falta seleccionar "${group.name}" en "${item.name}".`,
        };
      }

      if (selectedIds.length > Math.max(1, group.max_selections)) {
        return {
          ok: false,
          status: 422,
          error: `Hay demasiadas opciones seleccionadas en "${group.name}".`,
        };
      }

      for (const optionId of selectedIds) {
        const dbOption = (group.menu_item_options || []).find(
          (option) => option.id === optionId
        );

        if (!dbOption || dbOption.is_available === false) {
          return {
            ok: false,
            status: 422,
            error: `Una opción de "${item.name}" ya no está disponible.`,
          };
        }

        canonicalOptions.push({
          group_id: group.id,
          group_name: group.name,
          option_id: dbOption.id,
          option_label: dbOption.label,
          price_delta: Number(dbOption.price_delta) || 0,
        });
      }
    }

    canonicalLines.push({
      menu_item_id: item.id,
      item_name: item.name,
      unit_price: Number(item.price),
      quantity,
      selected_options: canonicalOptions,
      notes: line.notes?.slice(0, 300) || null,
      line_total: lineTotal(
        Number(item.price),
        canonicalOptions,
        quantity
      ),
    });
  }

  const availability = await getMenuAvailabilityMap(store.id);

  for (const [itemId, neededQty] of neededByItem) {
    const item: any = itemsById.get(itemId)!;
    const remaining = availability[itemId];

    if (
      remaining !== null &&
      remaining !== undefined &&
      remaining < neededQty
    ) {
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

  const subtotal = canonicalLines.reduce(
    (sum, line) => sum + line.line_total,
    0
  );

  let deliveryFee = 0;
  let deliveryZoneName: string | null = null;

  if (input.orderType === "delivery") {
    if (!input.deliveryZoneId) {
      return {
        ok: false,
        status: 400,
        error: "Selecciona una zona de entrega.",
      };
    }

    const { data: zone, error: zoneError } = await supabaseAdmin
      .from("menu_delivery_zones")
      .select("id, name, fee, minimum_order")
      .eq("id", input.deliveryZoneId)
      .eq("store_id", store.id)
      .eq("is_active", true)
      .maybeSingle();

    if (zoneError || !zone) {
      return {
        ok: false,
        status: 422,
        error: "La zona de entrega seleccionada no está disponible.",
      };
    }

    if (subtotal < Number(zone.minimum_order || 0)) {
      return {
        ok: false,
        status: 422,
        error:
          "El pedido mínimo para " +
          zone.name +
          " es $" +
          Number(zone.minimum_order).toFixed(2) +
          ".",
      };
    }

    deliveryFee = Number(zone.fee || 0);
    deliveryZoneName = zone.name;
  }

  const total = subtotal + deliveryFee;

  const { data: order, error: orderError } = await supabaseAdmin
    .from("menu_orders")
    .insert({
      store_id: store.id,
      order_type: input.orderType,
      table_number:
        input.orderType === "dine_in"
          ? input.tableNumber?.slice(0, 30) || null
          : null,
      delivery_address:
        input.orderType === "delivery"
          ? input.deliveryAddress?.slice(0, 300) || null
          : null,
      delivery_fee: deliveryFee,
      delivery_zone_id:
        input.orderType === "delivery"
          ? input.deliveryZoneId || null
          : null,
      delivery_zone_name: deliveryZoneName,
      customer_name: input.customerName.slice(0, 120),
      customer_phone: input.customerPhone.slice(0, 60),
      customer_email: input.customerEmail?.slice(0, 160) || null,
      notes: input.notes?.slice(0, 500) || null,
      subtotal,
      total,
      status: "received",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("createMenuOrder insert error:", orderError?.message);
    return {
      ok: false,
      status: 500,
      error: "No se pudo crear el pedido.",
    };
  }

  const { error: itemsInsertError } = await supabaseAdmin
    .from("menu_order_items")
    .insert(
      canonicalLines.map((line) => ({
        ...line,
        order_id: order.id,
      }))
    );

  if (itemsInsertError) {
    console.error(
      "createMenuOrder items insert error:",
      itemsInsertError.message
    );
  }

  for (const [itemId, neededQty] of neededByItem) {
    const item: any = itemsById.get(itemId)!;
    if (item.stock === null) continue;

    await supabaseAdmin
      .from("menu_items")
      .update({
        stock: Math.max(0, Number(item.stock) - neededQty),
      })
      .eq("id", itemId);
  }

  const emailLines = canonicalLines.map((line) => ({
    name: line.item_name,
    quantity: line.quantity,
    lineTotal: line.line_total,
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
        ? `https://${store.domain
            .replace(/^https?:\/\//, "")
            .replace(/^www\./, "")}`
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
