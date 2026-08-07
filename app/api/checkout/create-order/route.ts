import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeCustomerPhone } from "@/lib/utils/phone";

const clean = (value: unknown, max = 300) =>
  String(value ?? "").trim().slice(0, max);
const money = (value: unknown) => Math.round(Number(value || 0) * 100) / 100;
const fail = (message: string, status = 400) =>
  NextResponse.json({ success: false, message }, { status });

type CheckoutItem = {
  item_type?: "product" | "combo";
  product_id?: string | null;
  combo_id?: string | null;
  quantity?: number;
};

type CreateOrderBody = {
  storeId?: string;
  method?: "delivery" | "cuba";
  isLocalDelivery?: boolean;
  zoneId?: string | null;
  items?: CheckoutItem[];
  discountCampaignId?: string | null;
  discountCode?: string | null;
  customerPhone?: string;
  form?: {
    name?: string;
    email?: string;
    phone?: string;
    city?: string;
    municipality?: string;
    exact_address?: string;
    recipient_name?: string;
    recipient_phone?: string;
    recipient_phone_alt?: string;
    reference?: string;
    notes?: string;
  };
};

type PreparedItem = {
  item_type: "product" | "combo";
  product_id: string | null;
  combo_id: string | null;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
  minimum_order_exempt: boolean;
  delivery_included: boolean;
};

type StockChange = { productId: string; quantity: number };

type PriceTierRow = {
  min_quantity: number;
  unit_price: number;
};

function getServerUnitPriceForQuantity(
  basePrice: number,
  quantity: number,
  tiers: PriceTierRow[]
) {
  let unitPrice = money(basePrice);

  const orderedTiers = [...tiers]
    .map((tier) => ({
      min_quantity: Math.trunc(Number(tier.min_quantity || 0)),
      unit_price: money(tier.unit_price),
    }))
    .filter(
      (tier) =>
        tier.min_quantity >= 2 &&
        Number.isFinite(tier.unit_price) &&
        tier.unit_price >= 0
    )
    .sort((a, b) => a.min_quantity - b.min_quantity);

  for (const tier of orderedTiers) {
    if (quantity >= tier.min_quantity) {
      unitPrice = Math.min(unitPrice, tier.unit_price);
    }
  }

  return money(unitPrice);
}

async function restoreStock(changes: StockChange[]) {
  for (const change of [...changes].reverse()) {
    const { data } = await supabaseAdmin
      .from("products")
      .select("stock")
      .eq("id", change.productId)
      .maybeSingle();

    if (!data) continue;

    await supabaseAdmin
      .from("products")
      .update({ stock: Number(data.stock || 0) + change.quantity })
      .eq("id", change.productId);
  }
}

async function deleteCreatedOrder(orderId: string) {
  await supabaseAdmin.from("order_items").delete().eq("order_id", orderId);
  await supabaseAdmin.from("orders").delete().eq("id", orderId);
}

export async function POST(request: Request) {
  let body: CreateOrderBody;

  try {
    body = await request.json();
  } catch {
    return fail("Cuerpo de la solicitud inválido.");
  }

  const storeId = clean(body.storeId, 64);
  const form = body.form || {};
  const email = clean(form.email, 200).toLowerCase();
  const customerName = clean(form.name, 150);
  const customerPhone = normalizeCustomerPhone(
    clean(body.customerPhone || form.phone, 40)
  );
  const requestedItems = Array.isArray(body.items) ? body.items : [];

  if (!storeId || !email || !customerName || !customerPhone) {
    return fail("Faltan datos obligatorios del cliente.");
  }

  if (requestedItems.length === 0 || requestedItems.length > 100) {
    return fail("El carrito está vacío o contiene demasiados artículos.");
  }

  const { data: store, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id, is_active, module_store_enabled")
    .eq("id", storeId)
    .maybeSingle();

  if (storeError) return fail("No se pudo validar la tienda.", 500);
  if (!store || store.is_active === false || store.module_store_enabled === false) {
    return fail("Esta tienda no está disponible.", 404);
  }

  const isLocalDelivery = Boolean(body.isLocalDelivery);
  const preparedItems: PreparedItem[] = [];
  const stockNeeds = new Map<string, number>();

  const directProductQuantities = new Map<string, number>();

  for (const rawItem of requestedItems) {
    if (rawItem.item_type !== "product") continue;

    const productId = clean(rawItem.product_id, 64);
    const quantity = Math.trunc(Number(rawItem.quantity || 0));

    if (productId && quantity > 0) {
      directProductQuantities.set(
        productId,
        (directProductQuantities.get(productId) || 0) + quantity
      );
    }
  }

  const { data: categoryRows, error: categoryRulesError } =
    await supabaseAdmin
      .from("categories")
      .select("name, minimum_order_exempt, delivery_included")
      .eq("store_id", storeId);

  if (categoryRulesError) {
    return fail("No se pudieron validar las reglas de categorías.", 500);
  }

  const categoryRuleMap = new Map(
    (categoryRows || []).map((category) => [
      clean(category.name, 160).toLowerCase(),
      {
        minimum_order_exempt:
          category.minimum_order_exempt === true,
        delivery_included:
          category.delivery_included === true,
      },
    ])
  );

  try {
    for (const rawItem of requestedItems) {
      const quantity = Math.trunc(Number(rawItem.quantity || 0));
      if (quantity < 1 || quantity > 99) {
        return fail("Una cantidad del carrito no es válida.");
      }

      if (rawItem.item_type === "product") {
        const productId = clean(rawItem.product_id, 64);
        const { data: product, error } = await supabaseAdmin
          .from("products")
          .select(
            "id, name, price, stock, store_id, category, minimum_order_exempt, delivery_included, max_quantity_per_order"
          )
          .eq("id", productId)
          .eq("store_id", storeId)
          .eq("is_active", true)
          .is("deleted_at", null)
          .maybeSingle();

        if (error || !product) {
          return fail("Uno de los productos ya no está disponible.", 409);
        }

        const totalRequestedQuantity =
          directProductQuantities.get(product.id) || quantity;

        const configuredMaximum =
          product.max_quantity_per_order == null
            ? null
            : Math.trunc(Number(product.max_quantity_per_order));

        if (
          configuredMaximum !== null &&
          configuredMaximum >= 1 &&
          totalRequestedQuantity > configuredMaximum
        ) {
          return fail(
            `${clean(product.name, 150)} permite un máximo de ${configuredMaximum} unidades por pedido.`,
            409
          );
        }

        const { data: tierRows, error: tierError } =
          await supabaseAdmin
            .from("product_price_tiers")
            .select("min_quantity, unit_price")
            .eq("store_id", storeId)
            .eq("product_id", product.id)
            .order("min_quantity", { ascending: true });

        if (tierError) {
          return fail(
            `No se pudo validar el precio de ${clean(product.name, 150)}.`,
            500
          );
        }

        const price = getServerUnitPriceForQuantity(
          money(product.price),
          totalRequestedQuantity,
          (tierRows || []) as PriceTierRow[]
        );

        const categoryRule = categoryRuleMap.get(
          clean(product.category, 160).toLowerCase()
        );

        const minimumOrderExempt =
          product.minimum_order_exempt ??
          categoryRule?.minimum_order_exempt ??
          false;

        const deliveryIncluded =
          product.delivery_included ??
          categoryRule?.delivery_included ??
          false;

        preparedItems.push({
          item_type: "product",
          product_id: product.id,
          combo_id: null,
          product_name: clean(product.name, 200),
          quantity,
          price,
          subtotal: money(price * quantity),
          minimum_order_exempt: minimumOrderExempt === true,
          delivery_included: deliveryIncluded === true,
        });

        stockNeeds.set(
          product.id,
          (stockNeeds.get(product.id) || 0) + quantity
        );
        continue;
      }

      if (rawItem.item_type === "combo") {
        const comboId = clean(rawItem.combo_id, 64);
        const { data: combo, error: comboError } = await supabaseAdmin
          .from("combos")
          .select("id, name, price, store_id")
          .eq("id", comboId)
          .eq("store_id", storeId)
          .maybeSingle();

        if (comboError || !combo) {
          return fail("Uno de los combos ya no está disponible.", 409);
        }

        const { data: comboItems, error: comboItemsError } = await supabaseAdmin
          .from("combo_items")
          .select("product_id, quantity")
          .eq("combo_id", combo.id);

        if (comboItemsError) {
          return fail("No se pudo validar el contenido de un combo.", 500);
        }

        for (const comboItem of comboItems || []) {
          const needed = Math.trunc(Number(comboItem.quantity || 0)) * quantity;
          if (needed > 0) {
            stockNeeds.set(
              comboItem.product_id,
              (stockNeeds.get(comboItem.product_id) || 0) + needed
            );
          }
        }

        const price = money(combo.price);
        preparedItems.push({
          item_type: "combo",
          product_id: null,
          combo_id: combo.id,
          product_name: clean(combo.name, 200),
          quantity,
          price,
          subtotal: money(price * quantity),
          minimum_order_exempt: false,
          delivery_included: false,
        });
        continue;
      }

      return fail("El carrito contiene un tipo de artículo no permitido.");
    }

    for (const [productId, needed] of stockNeeds) {
      const { data: product, error } = await supabaseAdmin
        .from("products")
        .select("id, name, stock, store_id, max_quantity_per_order")
        .eq("id", productId)
        .eq("store_id", storeId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle();

      if (error || !product) {
        return fail(
          `Uno de los productos de la orden ya no está disponible.`,
          409
        );
      }

      const configuredMaximum =
        product.max_quantity_per_order == null
          ? null
          : Math.trunc(Number(product.max_quantity_per_order));

      if (
        configuredMaximum !== null &&
        configuredMaximum >= 1 &&
        needed > configuredMaximum
      ) {
        return fail(
          `${clean(product.name, 150)} permite un máximo de ${configuredMaximum} unidades por pedido.`,
          409
        );
      }

      if (Number(product.stock || 0) < needed) {
        return fail(
          `Stock insuficiente para ${clean(product.name || "un producto", 150)}.`,
          409
        );
      }
    }

    let deliveryFee = 0;
    let zone: { id: string; zone_name: string; minimum_order: number; free_delivery_from: number } | null = null;

    if (isLocalDelivery) {
      const { data: checkoutSettings } = await supabaseAdmin
        .from("checkout_settings")
        .select("show_delivery_price, fixed_delivery_fee")
        .eq("store_id", storeId)
        .maybeSingle();

      deliveryFee = checkoutSettings?.show_delivery_price
        ? money(checkoutSettings.fixed_delivery_fee)
        : 0;
    } else {
      const zoneId = clean(body.zoneId, 64);
      if (!zoneId) return fail("Selecciona una zona de entrega.");

      const { data: zoneData, error: zoneError } = await supabaseAdmin
        .from("delivery_zones")
        .select("id, zone_name, delivery_fee, minimum_order, free_delivery_from, store_id")
        .eq("id", zoneId)
        .eq("store_id", storeId)
        .maybeSingle();

      if (zoneError || !zoneData) {
        return fail("La zona de entrega no es válida.", 409);
      }

      deliveryFee = money(zoneData.delivery_fee);
      zone = {
        id: zoneData.id,
        zone_name: clean(zoneData.zone_name, 150),
        minimum_order: money(zoneData.minimum_order),
        free_delivery_from: money(zoneData.free_delivery_from),
      };
    }

    const subtotal = money(
      preparedItems.reduce((sum, item) => sum + item.subtotal, 0)
    );

    const minimumOrderExempt =
      preparedItems.length > 0 &&
      preparedItems.every(
        (item) => item.minimum_order_exempt === true
      );

    const deliveryIncludedForAllItems =
      preparedItems.length > 0 &&
      preparedItems.every(
        (item) => item.delivery_included === true
      );

    /*
     * Regla de mínimo:
     *
     * - Si TODOS los artículos son exentos, no exigimos mínimo.
     * - Si la orden es mixta, se exige el mínimo normal de la zona,
     *   pero se usa el SUBTOTAL COMPLETO. Por eso un cake exento de
     *   $20 + otros productos por $10 sí alcanza una zona de $30.
     */
    const effectiveMinimumOrder =
      zone && !minimumOrderExempt
        ? zone.minimum_order
        : 0;

    if (
      zone &&
      !minimumOrderExempt &&
      subtotal < effectiveMinimumOrder
    ) {
      return fail(
        `La compra mínima para esta zona es de $${effectiveMinimumOrder.toFixed(2)}.`,
        409
      );
    }

    /*
     * Regla de domicilio:
     * - Si TODOS los artículos incluyen domicilio, costo 0.
     * - Si no, todavía puede quedar gratis por free_delivery_from.
     */
    if (
      deliveryIncludedForAllItems ||
      (zone &&
        zone.free_delivery_from > 0 &&
        subtotal >= zone.free_delivery_from)
    ) {
      deliveryFee = 0;
    }

    let discountAmount = 0;
    let discountCampaignId: string | null = null;
    let discountCode: string | null = null;

    if (body.discountCampaignId && body.discountCode) {
      const campaignId = clean(body.discountCampaignId, 64);
      const code = clean(body.discountCode, 80).toUpperCase();
      const { data: campaign, error: campaignError } = await supabaseAdmin
        .from("discount_campaigns")
        .select("id, code, discount_amount, is_active, expires_at")
        .eq("id", campaignId)
        .eq("store_id", storeId)
        .eq("code", code)
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (campaignError || !campaign) {
        return fail("El bono ya no está disponible.", 409);
      }

      const { data: authorized } = await supabaseAdmin
        .from("discount_campaign_customers")
        .select("id, status")
        .eq("campaign_id", campaign.id)
        .eq("store_id", storeId)
        .eq("customer_phone", customerPhone)
        .maybeSingle();

      if (!authorized || authorized.status !== "available") {
        return fail("Este teléfono ya no puede utilizar el bono.", 409);
      }

      discountAmount = money(
        Math.min(Number(campaign.discount_amount || 0), subtotal + deliveryFee)
      );
      discountCampaignId = campaign.id;
      discountCode = campaign.code;
    }

    const total = money(Math.max(subtotal + deliveryFee - discountAmount, 0));

    const city = isLocalDelivery
      ? clean(form.city, 120)
      : clean(form.municipality, 120);

    const { data: existingCustomer, error: customerLookupError } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("store_id", storeId)
      .eq("email", email)
      .maybeSingle();

    if (customerLookupError) return fail("No se pudo validar el cliente.", 500);

    let customerId = existingCustomer?.id as string | undefined;
    if (customerId) {
      const { error } = await supabaseAdmin
        .from("customers")
        .update({ name: customerName, phone: customerPhone, city })
        .eq("id", customerId)
        .eq("store_id", storeId);
      if (error) return fail("No se pudo actualizar el cliente.", 500);
    } else {
      const { data: customer, error } = await supabaseAdmin
        .from("customers")
        .insert({ store_id: storeId, name: customerName, email, phone: customerPhone, city })
        .select("id")
        .single();
      if (error || !customer) return fail("No se pudo crear el cliente.", 500);
      customerId = customer.id;
    }

    const payload = {
      customer_id: customerId,
      store_id: storeId,
      status: "pending",
      payment_status: "pending",
      subtotal,
      delivery_fee: deliveryFee,
      discount_campaign_id: discountCampaignId,
      discount_code: discountCode,
      discount_amount: discountAmount,
      total,
      country: isLocalDelivery ? "Estados Unidos" : "Cuba",
      state: isLocalDelivery ? null : "Cienfuegos",
      municipality: city,
      delivery_zone_id: zone?.id || null,
      zone_name: zone?.zone_name || null,
      exact_address: clean(form.exact_address, 300),
      recipient_name: isLocalDelivery
        ? customerName
        : clean(form.recipient_name, 150),
      recipient_phone: isLocalDelivery
        ? customerPhone
        : clean(form.recipient_phone, 40),
      recipient_phone_alt: isLocalDelivery
        ? null
        : clean(form.recipient_phone_alt, 40),
      address: clean(form.exact_address, 300),
      notes: [
        form.reference ? `Referencia: ${clean(form.reference, 200)}` : "",
        clean(form.notes, 500),
      ]
        .filter(Boolean)
        .join("\n"),
    };

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert(payload)
      .select("id, order_number")
      .single();

    if (orderError || !order) return fail("No se pudo crear la orden.", 500);

    // Algunas instalaciones antiguas no generan order_number automáticamente.
    // Nunca exponemos el UUID completo al cliente: si la BD no asignó uno,
    // creamos un identificador público corto, legible y persistente.
    let publicOrderNumber = clean(order.order_number, 80);

    if (!publicOrderNumber) {
      const compactId = order.id.replace(/-/g, "").toUpperCase();
      publicOrderNumber = `ORD-${compactId.slice(0, 8)}-${compactId.slice(-4)}`;

      const { error: orderNumberError } = await supabaseAdmin
        .from("orders")
        .update({ order_number: publicOrderNumber })
        .eq("id", order.id)
        .eq("store_id", storeId);

      if (orderNumberError) {
        await deleteCreatedOrder(order.id);
        return fail("No se pudo asignar el número de orden.", 500);
      }
    }

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(
        preparedItems.map((item) => ({
          order_id: order.id,
          item_type: item.item_type,
          product_id: item.product_id,
          combo_id: item.combo_id,
          product_name: item.product_name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
        }))
      );

    if (itemsError) {
      console.error("ERROR GUARDANDO ORDER_ITEMS:", itemsError);

      await deleteCreatedOrder(order.id);

      return fail(
        "No se pudieron guardar los productos de la orden.",
        500
      );
    }

    if (discountCampaignId) {
      const { data: claimData, error: claimError } = await supabaseAdmin.rpc(
        "claim_discount_coupon",
        {
          p_campaign_id: discountCampaignId,
          p_store_id: storeId,
          p_customer_phone: customerPhone,
          p_order_id: order.id,
        }
      );

      const claimResult = claimData?.[0];
      if (claimError || !claimResult?.success) {
        await deleteCreatedOrder(order.id);
        return fail(claimResult?.message || "El bono ya no está disponible.", 409);
      }
    }

    const appliedStockChanges: StockChange[] = [];
    for (const [productId, needed] of stockNeeds) {
      const { data: product, error: stockReadError } = await supabaseAdmin
        .from("products")
        .select("stock")
        .eq("id", productId)
        .eq("store_id", storeId)
        .maybeSingle();

      if (stockReadError || !product || Number(product.stock || 0) < needed) {
        await restoreStock(appliedStockChanges);
        await deleteCreatedOrder(order.id);
        return fail("El stock cambió mientras se procesaba el pedido.", 409);
      }

      const { error: stockUpdateError } = await supabaseAdmin
        .from("products")
        .update({ stock: Number(product.stock || 0) - needed })
        .eq("id", productId)
        .eq("store_id", storeId);

      if (stockUpdateError) {
        await restoreStock(appliedStockChanges);
        await deleteCreatedOrder(order.id);
        return fail("No se pudo actualizar el inventario.", 500);
      }

      appliedStockChanges.push({ productId, quantity: needed });
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        order_number: publicOrderNumber,
        subtotal,
        delivery_fee: deliveryFee,
        discount_amount: discountAmount,
        total,
      },
    });
  } catch (error) {
    console.error("SECURE CHECKOUT ERROR:", error);
    return fail("No se pudo completar el pedido.", 500);
  }
}
