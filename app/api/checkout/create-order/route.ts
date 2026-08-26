// Guardar en: app/api/checkout/create-order/route.ts
//
// ARREGLO 2026-08-10 (tarde): la reconstrucción de esta mañana (ver
// nota vieja más abajo) traía la orden y el checkout funcionando,
// pero se le quedaron fuera varias cosas que sí existían en la
// versión anterior (confirmada funcionando en producción hasta las
// 2026-08-10 01:11 según las órdenes reales en la base de datos):
//
//   1) Comisión de plataforma (platform_fee_amount) — no se calculaba
//      NI se guardaba, ni en orders ni en order_items. Esto es lo que
//      reportaste: la orden de las 12:41 quedó con fee=0.00.
//   2) El precio de cada línea se tomaba tal cual lo mandaba el
//      cliente, sin volver a calcularlo en el servidor contra el
//      precio real del producto + escalas por cantidad. Restaurado:
//      ahora se recalcula todo server-side, igual que antes.
//   3) order_number sin fallback — si la tabla no lo autogenera, ahora
//      se genera uno corto (ORD-XXXXXXXX-XXXX) igual que antes. Por
//      eso la orden de las 12:41 quedó con order_number = null.
//   4) Descuento de stock — no se restaba el inventario en NINGUNA
//      orden nueva desde ayer. Restaurado.
//   5) Validación de compra mínima por zona — no se estaba exigiendo.
//      Restaurado (con la excepción de items marcados
//      minimum_order_exempt por producto o categoría).
//   6) Aviso por email de nueva orden a la tienda — no se enviaba.
//      Restaurado (nunca bloquea el pedido si falla).
//   7) El descuento se reclamaba con un simple UPDATE en vez del RPC
//      claim_discount_coupon (que además asocia el order_id al bono).
//      Restaurado el RPC.
//
// Se mantuvieron las dos cosas de la reconstrucción de esta mañana que
// SÍ eran mejoras reales y siguen igual:
//   - Cliente se busca por teléfono (no por email) — esto fue el
//     arreglo de "Cliente sin nombre" de hace unos días.
//   - Lógica de Yoyo con entrega local (tarifa fija de
//     checkout_settings en vez de zona).
//
// Puntos a probar con cuidado antes de confiar en esto al 100%:
// - Una orden normal (Cuba) y revisar que platform_fee_amount salga
//   > 0 en la tabla orders y que el stock del producto haya bajado.
// - El flujo de Yoyo con entrega local.
// - Un pedido con un bono/descuento aplicado (revisar que
//   discount_campaign_customers quede "used" con el order_id).
// - Un pedido que no alcance el mínimo de la zona — debe rechazarse.

import { after, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { applyPlatformFee } from "@/lib/storefront/product-quantity-pricing";
import { sendNewOrderNotification } from "@/lib/notifications/order-notification";
import { sendCustomerOrderConfirmationEmail } from "@/lib/notifications/customer-order-email";
import {
  calculateDistanceDeliveryFee,
  getDrivingRoute,
  normalizeDistanceSettings,
  validCoordinate,
  normalizeCubanAddress,
} from "@/lib/checkout/distance-delivery";


// Vercel Pro: allow headroom for DB/storage/network work without applying a global timeout.
export const maxDuration = 60;
const YOYO_SLUG = "yoyo-envios";

const clean = (value: unknown, max = 300) =>
  String(value ?? "").trim().slice(0, max);
const money = (value: unknown) => Math.round(Number(value || 0) * 100) / 100;
const fail = (message: string, status = 400) =>
  NextResponse.json({ success: false, message }, { status });

type OrderItemInput = {
  item_type?: "product" | "combo";
  product_id?: string | null;
  combo_id?: string | null;
  quantity?: number;
};

type CreateOrderBody = {
  storeId?: string;
  method?: "delivery" | "cuba";
  isLocalDelivery?: boolean;
  intendedPaymentMethod?: string;
  zoneId?: string | null;
  items?: OrderItemInput[];
  discountCampaignId?: string | null;
  discountCode?: string | null;
  customerPhone?: string;
  /** Token del dispositivo (localStorage) para reconocer al cliente que
   *  regresa sin pedirle que inicie sesión — ver el bloque "PERFIL DEL
   *  CLIENTE" más abajo y app/api/checkout/remembered-profile/route.ts. */
  deviceToken?: string | null;
  form?: {
    name?: string;
    email?: string;
    phone?: string;
    recipient_name?: string;
    recipient_phone?: string;
    recipient_phone_alt?: string;
    city?: string;
    municipality?: string;
    reference?: string;
    exact_address?: string;
    notes?: string;
    delivery_latitude?: number | null;
    delivery_longitude?: number | null;
    delivery_formatted_address?: string;
    delivery_distance_meters?: number | null;
    delivery_quoted_fee?: number | null;
  };
};

type PreparedItem = {
  item_type: "product" | "combo";
  product_id: string | null;
  combo_id: string | null;
  product_name: string;
  quantity: number;
  price: number;
  base_price: number;
  platform_fee_amount: number;
  subtotal: number;
  minimum_order_exempt: boolean;
  delivery_included: boolean;
};

type StockChange = { productId: string; quantity: number };

type PriceTierRow = { min_quantity: number; unit_price: number };

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

async function restoreStock(storeId: string, changes: StockChange[]) {
  if (changes.length === 0) return;

  const { error } = await supabaseAdmin.rpc("restore_product_inventory", {
    p_store_id: storeId,
    p_needs: changes.map((change) => ({
      product_id: change.productId,
      quantity: change.quantity,
    })),
  });

  if (error) {
    console.error("ATOMIC STOCK RESTORE ERROR:", error);
  }
}

async function deleteCreatedOrder(orderId: string) {
  await supabaseAdmin.from("order_items").delete().eq("order_id", orderId);
  await supabaseAdmin.from("orders").delete().eq("id", orderId);
}

function getRequestOrigin(request: Request) {
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  const protocol =
    request.headers.get("x-forwarded-proto") ||
    (host?.includes("localhost") ? "http" : "https");

  return host ? `${protocol}://${host}` : "https://perlamarketplace.com";
}

export async function POST(request: Request) {
  let body: CreateOrderBody;

  try {
    body = await request.json();
  } catch {
    return fail("Cuerpo de la solicitud inválido.");
  }

  try {
    const storeId = clean(body.storeId, 64);
    const intendedPaymentMethod =
      body.intendedPaymentMethod === "card" ? "card" : "whatsapp";
    const requestedItems = Array.isArray(body.items) ? body.items : [];
    const form = body.form || {};
    const customerName = clean(form.name, 150);
    const email = clean(form.email, 200).toLowerCase();
    const customerPhone = clean(body.customerPhone || form.phone, 40);
    const incomingDeviceToken = clean(body.deviceToken || "", 100) || null;

    if (!storeId) return fail("Falta el id de la tienda.");
    if (!customerName || !customerPhone) {
      return fail("Faltan datos obligatorios del cliente.");
    }
    if (requestedItems.length === 0 || requestedItems.length > 100) {
      return fail("El carrito está vacío o contiene demasiados artículos.");
    }

    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select(
        "id, name, slug, is_active, module_store_enabled, platform_fee_enabled, platform_fee_percent"
      )
      .eq("id", storeId)
      .maybeSingle();

    if (storeError) return fail("No se pudo validar la tienda.", 500);
    if (
      !store ||
      store.is_active === false ||
      store.module_store_enabled === false
    ) {
      return fail("Esta tienda no está disponible.", 404);
    }

    const isYoyo = store.slug === YOYO_SLUG;
    const isLocalDelivery = Boolean(body.isLocalDelivery);

    // Fee de plataforma (Perla): se calcula SIEMPRE en el servidor a
    // partir de la configuración real de la tienda, nunca confiando en
    // nada que venga del cliente.
    const platformFeePercent =
      store.platform_fee_enabled &&
      Number.isFinite(Number(store.platform_fee_percent)) &&
      Number(store.platform_fee_percent) > 0
        ? Number(store.platform_fee_percent)
        : 0;

    const preparedItems: PreparedItem[] = [];
    const stockNeeds = new Map<string, number>();
    const directProductQuantities = new Map<string, number>();
    const directProductIds = new Set<string>();
    const comboIds = new Set<string>();

    // FASE 1 (Vercel/Supabase): primero normalizamos el carrito y luego
    // cargamos sus datos en bloques. Antes, cada línea hacía varias
    // consultas individuales dentro del loop; un carrito grande podía
    // disparar decenas de round-trips antes de crear la orden.
    for (const rawItem of requestedItems) {
      const quantity = Math.trunc(Number(rawItem.quantity || 0));
      if (quantity <= 0) return fail("Cantidad inválida en el carrito.");

      if (rawItem.item_type === "product") {
        const productId = clean(rawItem.product_id, 64);
        if (!productId) {
          return fail("Uno de los productos ya no está disponible.", 409);
        }

        directProductIds.add(productId);
        directProductQuantities.set(
          productId,
          (directProductQuantities.get(productId) || 0) + quantity
        );
        continue;
      }

      if (rawItem.item_type === "combo") {
        const comboId = clean(rawItem.combo_id, 64);
        if (!comboId) {
          return fail("Uno de los combos ya no está disponible.", 409);
        }

        comboIds.add(comboId);
        continue;
      }

      return fail("El carrito contiene un tipo de artículo no permitido.");
    }

    const directProductIdList = Array.from(directProductIds);
    const comboIdList = Array.from(comboIds);

    const [
      { data: categoryRows, error: categoryRulesError },
      { data: tierRows, error: tierError },
      { data: comboRows, error: comboError },
      { data: comboItemRows, error: comboItemsError },
    ] = await Promise.all([
      supabaseAdmin
        .from("categories")
        .select("name, minimum_order_exempt, delivery_included")
        .eq("store_id", storeId),
      directProductIdList.length > 0
        ? supabaseAdmin
            .from("product_price_tiers")
            .select("product_id, min_quantity, unit_price")
            .eq("store_id", storeId)
            .in("product_id", directProductIdList)
            .order("min_quantity", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      comboIdList.length > 0
        ? supabaseAdmin
            .from("combos")
            .select("id, name, price, store_id")
            .eq("store_id", storeId)
            .in("id", comboIdList)
        : Promise.resolve({ data: [], error: null }),
      comboIdList.length > 0
        ? supabaseAdmin
            .from("combo_items")
            .select("combo_id, product_id, quantity")
            .in("combo_id", comboIdList)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (categoryRulesError) {
      return fail("No se pudieron validar las reglas de categorías.", 500);
    }
    if (tierError) {
      return fail("No se pudieron validar los precios del carrito.", 500);
    }
    if (comboError) {
      return fail("No se pudieron validar los combos del carrito.", 500);
    }
    if (comboItemsError) {
      return fail("No se pudo validar el contenido de un combo.", 500);
    }

    const categoryRuleMap = new Map(
      (categoryRows || []).map((row) => [
        clean(row.name, 160).toLowerCase(),
        {
          minimum_order_exempt: Boolean(row.minimum_order_exempt),
          delivery_included: Boolean(row.delivery_included),
        },
      ])
    );

    const comboMap = new Map((comboRows || []).map((row) => [row.id, row]));
    const comboItemsByCombo = new Map<
      string,
      Array<{ product_id: string; quantity: number }>
    >();

    for (const row of comboItemRows || []) {
      const current = comboItemsByCombo.get(row.combo_id) || [];
      current.push({
        product_id: row.product_id,
        quantity: Math.trunc(Number(row.quantity || 0)),
      });
      comboItemsByCombo.set(row.combo_id, current);
    }

    // Productos necesarios = productos sueltos + componentes de combos.
    // Así la validación de disponibilidad, límite y stock usa una sola
    // consulta para todo el carrito.
    const allNeededProductIds = new Set(directProductIdList);
    for (const row of comboItemRows || []) {
      if (row.product_id) allNeededProductIds.add(row.product_id);
    }

    const allNeededProductIdList = Array.from(allNeededProductIds);
    const { data: productRows, error: productsError } =
      allNeededProductIdList.length > 0
        ? await supabaseAdmin
            .from("products")
            .select(
              "id, name, price, category, store_id, stock, max_quantity_per_order, minimum_order_exempt, delivery_included, is_active, deleted_at"
            )
            .eq("store_id", storeId)
            .eq("is_active", true)
            .is("deleted_at", null)
            .in("id", allNeededProductIdList)
        : { data: [], error: null };

    if (productsError) {
      return fail("No se pudieron validar los productos del carrito.", 500);
    }

    const productMap = new Map((productRows || []).map((row) => [row.id, row]));
    const tiersByProduct = new Map<string, PriceTierRow[]>();

    for (const row of tierRows || []) {
      const current = tiersByProduct.get(row.product_id) || [];
      current.push({
        min_quantity: Number(row.min_quantity || 0),
        unit_price: Number(row.unit_price || 0),
      });
      tiersByProduct.set(row.product_id, current);
    }

    for (const rawItem of requestedItems) {
      const quantity = Math.trunc(Number(rawItem.quantity || 0));

      if (rawItem.item_type === "product") {
        const productId = clean(rawItem.product_id, 64);
        const product = productMap.get(productId);

        if (!product) {
          return fail("Uno de los productos ya no está disponible.", 409);
        }

        const totalRequestedQuantity =
          directProductQuantities.get(product.id) || quantity;

        const baseUnitPrice = getServerUnitPriceForQuantity(
          money(product.price),
          totalRequestedQuantity,
          tiersByProduct.get(product.id) || []
        );

        // Precio que realmente paga el cliente (base + fee de
        // plataforma, si la tienda lo tiene activado).
        const price = applyPlatformFee(baseUnitPrice, platformFeePercent);
        const unitFeeAmount = money(price - baseUnitPrice);

        const categoryRule = categoryRuleMap.get(
          clean(product.category, 160).toLowerCase()
        );
        const minimumOrderExempt =
          product.minimum_order_exempt ??
          categoryRule?.minimum_order_exempt ??
          false;
        const deliveryIncluded =
          product.delivery_included ?? categoryRule?.delivery_included ?? false;

        preparedItems.push({
          item_type: "product",
          product_id: product.id,
          combo_id: null,
          product_name: clean(product.name, 200),
          quantity,
          price,
          base_price: baseUnitPrice,
          platform_fee_amount: money(unitFeeAmount * quantity),
          subtotal: money(price * quantity),
          minimum_order_exempt: minimumOrderExempt === true,
          delivery_included: deliveryIncluded === true,
        });

        stockNeeds.set(product.id, (stockNeeds.get(product.id) || 0) + quantity);
        continue;
      }

      if (rawItem.item_type === "combo") {
        const comboId = clean(rawItem.combo_id, 64);
        const combo = comboMap.get(comboId);

        if (!combo) {
          return fail("Uno de los combos ya no está disponible.", 409);
        }

        for (const comboItem of comboItemsByCombo.get(combo.id) || []) {
          const needed = comboItem.quantity * quantity;
          if (needed > 0) {
            stockNeeds.set(
              comboItem.product_id,
              (stockNeeds.get(comboItem.product_id) || 0) + needed
            );
          }
        }

        // El fee de plataforma solo aplica a productos individuales,
        // no a combos (precio fijo).
        const price = money(combo.price);
        preparedItems.push({
          item_type: "combo",
          product_id: null,
          combo_id: combo.id,
          product_name: clean(combo.name, 200),
          quantity,
          price,
          base_price: price,
          platform_fee_amount: 0,
          subtotal: money(price * quantity),
          minimum_order_exempt: false,
          delivery_included: false,
        });
      }
    }

    // Validación inicial de máximo por pedido y stock usando el snapshot
    // ya cargado; no volvemos a consultar un producto por cada línea.
    for (const [productId, needed] of stockNeeds) {
      const product = productMap.get(productId);

      if (!product) {
        return fail("Uno de los productos de la orden ya no está disponible.", 409);
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
    let deliveryZoneId: string | null = null;
    let zoneName: string | null = null;
    let zoneMinimumOrder = 0;
    let zoneFreeDeliveryFrom = 0;
    let deliveryDistanceMeters: number | null = null;
    let deliveryLatitude: number | null = null;
    let deliveryLongitude: number | null = null;
    let deliveryRouteProvider: string | null = null;

    const { data: checkoutDeliverySettings } = await supabaseAdmin
      .from("checkout_settings")
      .select("delivery_address_mode,show_delivery_price,fixed_delivery_fee,delivery_origin_address,delivery_origin_latitude,delivery_origin_longitude,distance_base_km,distance_base_fee,distance_additional_fee_per_km,max_delivery_distance_km")
      .eq("store_id", storeId)
      .maybeSingle();
    const isDistanceDelivery =
      body.method === "delivery" && checkoutDeliverySettings?.delivery_address_mode === "distance";

    if (isDistanceDelivery) {
      const settings = normalizeDistanceSettings(checkoutDeliverySettings as Record<string, unknown>);
      deliveryLatitude = validCoordinate(form.delivery_latitude, -90, 90);
      deliveryLongitude = validCoordinate(form.delivery_longitude, -180, 180);
      if (deliveryLatitude == null || deliveryLongitude == null) {
        return fail("Confirma la ubicación de entrega en el mapa.");
      }
      if (settings.delivery_origin_latitude == null || settings.delivery_origin_longitude == null) {
        return fail("La tienda todavía no configuró el punto de salida.", 409);
      }
      const route = await getDrivingRoute(
        { latitude: settings.delivery_origin_latitude, longitude: settings.delivery_origin_longitude },
        { latitude: deliveryLatitude, longitude: deliveryLongitude }
      );
      deliveryDistanceMeters = Math.round(route.distanceMeters);
      deliveryRouteProvider = route.provider;
      if (settings.max_delivery_distance_km && deliveryDistanceMeters / 1000 > settings.max_delivery_distance_km) {
        return fail(`La dirección supera la distancia máxima de ${settings.max_delivery_distance_km.toFixed(2)} km.`, 422);
      }
      deliveryFee = calculateDistanceDeliveryFee(deliveryDistanceMeters, settings);
      zoneName = "Tarifa por distancia";
    } else if (isYoyo && isLocalDelivery) {
      deliveryFee = checkoutDeliverySettings?.show_delivery_price
        ? money(checkoutDeliverySettings.fixed_delivery_fee)
        : 0;
    } else {
      const zoneId = clean(body.zoneId, 64);
      if (!zoneId) return fail("Selecciona una zona de entrega.");

      const { data: zoneData, error: zoneError } = await supabaseAdmin
        .from("delivery_zones")
        .select(
          "id, zone_name, delivery_fee, minimum_order, free_delivery_from, store_id"
        )
        .eq("id", zoneId)
        .eq("store_id", storeId)
        .maybeSingle();

      if (zoneError || !zoneData) {
        return fail("La zona de entrega no es válida.", 409);
      }

      deliveryFee = money(zoneData.delivery_fee);
      deliveryZoneId = zoneData.id;
      zoneName = clean(zoneData.zone_name, 150);
      zoneMinimumOrder = money(zoneData.minimum_order);
      zoneFreeDeliveryFrom = money(zoneData.free_delivery_from);
    }

    const subtotal = money(
      preparedItems.reduce((sum, item) => sum + item.subtotal, 0)
    );

    const minimumOrderExemptForAll =
      preparedItems.length > 0 &&
      preparedItems.every((item) => item.minimum_order_exempt === true);

    const deliveryIncludedForAllItems =
      preparedItems.length > 0 &&
      preparedItems.every((item) => item.delivery_included === true);

    // Regla de mínimo: si TODOS los artículos son exentos, no se exige
    // mínimo. Si la orden es mixta, se exige el mínimo normal de la
    // zona usando el subtotal completo.
    if (
      deliveryZoneId &&
      !minimumOrderExemptForAll &&
      zoneMinimumOrder > 0 &&
      subtotal < zoneMinimumOrder
    ) {
      return fail(
        `La compra mínima para esta zona es de $${zoneMinimumOrder.toFixed(2)}.`,
        409
      );
    }

    if (
      deliveryIncludedForAllItems ||
      (deliveryZoneId && zoneFreeDeliveryFrom > 0 && subtotal >= zoneFreeDeliveryFrom)
    ) {
      deliveryFee = 0;
    }

    const platformFeeAmount = money(
      preparedItems.reduce((sum, item) => sum + item.platform_fee_amount, 0)
    );

    // Descuento: se re-valida con la misma lógica que
    // /api/discounts/validate, nunca confiando en un monto suelto que
    // mande el cliente.
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

    const customerIsRecipient = isLocalDelivery || isDistanceDelivery;
    const city = customerIsRecipient
      ? clean(form.city, 120)
      : clean(form.municipality, 120);

    // Cliente (el comprador, no el destinatario en Cuba): se busca por
    // teléfono dentro de la tienda; si no existe, se crea.
    //
    // ARREGLO 2026-08-13: antes esto era "select, y si no existe insert"
    // — dos pasos separados. Si dos pedidos del mismo teléfono nuevo
    // llegaban casi al mismo tiempo (por ejemplo, alguien que paga con
    // tarjeta y reintenta, o dos pestañas abiertas), ambos veían "no
    // existe" y ambos intentaban crear el cliente; uno de los dos
    // chocaba con la restricción de teléfono único y se quedaba sin
    // customer_id, y por eso el pedido salía "Cliente sin nombre". Un
    // solo upsert atómico (una sola vuelta a la base de datos) elimina
    // esa carrera de raíz.
    //
    // PERFIL DEL CLIENTE (sin login): a cada cliente se le asigna un
    // device_token — si el navegador ya traía uno (localStorage) se le
    // asigna ese; si no, se genera uno nuevo acá y se devuelve en la
    // respuesta para que el checkout lo guarde. La próxima vez que ese
    // mismo navegador entre a pagar, /api/checkout/remembered-profile
    // usa ese token para reconocerlo y precargar sus datos — sin pedirle
    // contraseña ni nada. Ver app/tienda/[slug]/checkout/page.tsx.
    const resolvedDeviceToken = incomingDeviceToken || randomUUID();

    let customerId: string | null = null;
    const { data: upsertedCustomer, error: customerError } = await supabaseAdmin
      .from("customers")
      .upsert(
        {
          store_id: storeId,
          phone: customerPhone,
          name: customerName || "Cliente sin nombre",
          email: email || null,
          city: city || null,
          device_token: resolvedDeviceToken,
        },
        { onConflict: "store_id,phone" }
      )
      .select("id")
      .single();

    if (customerError) {
      // No debe pasar casi nunca ahora (era el caso que causaba
      // "Cliente sin nombre"), pero si pasa igual el pedido no se
      // pierde: el nombre/teléfono ya quedan guardados directo en la
      // orden más abajo (customer_name / customer_phone), así que se ve
      // bien en el admin aunque el enlace a customers haya fallado.
      console.error("UPSERT CUSTOMER ERROR:", customerError);
    } else {
      customerId = upsertedCustomer.id;
    }

    const payload = {
      customer_id: customerId,
      // ARREGLO 2026-08-13 ("Cliente sin nombre"): copia directa del
      // nombre/teléfono del comprador en la orden misma, sin depender
      // de que el enlace a customers haya funcionado. Es la fuente que
      // usa el admin (ver getCustomer() en OrdersManager.tsx) cuando
      // customer_id es null o el cliente vinculado no tiene nombre.
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      store_id: storeId,
      status: "pending",
      payment_status: "pending",
      payment_method: intendedPaymentMethod,
      subtotal,
      delivery_fee: deliveryFee,
      platform_fee_amount: platformFeeAmount,
      discount_campaign_id: discountCampaignId,
      discount_code: discountCode,
      discount_amount: discountAmount,
      total,
      country: isLocalDelivery ? "Estados Unidos" : "Cuba",
      state: isLocalDelivery ? null : "Cienfuegos",
      municipality: city,
      delivery_zone_id: deliveryZoneId,
      zone_name: zoneName,
      delivery_latitude: deliveryLatitude,
      delivery_longitude: deliveryLongitude,
      delivery_distance_meters: deliveryDistanceMeters,
      delivery_route_provider: deliveryRouteProvider,
      delivery_formatted_address: isDistanceDelivery
        ? clean(form.delivery_formatted_address || form.exact_address, 300)
        : null,
      exact_address: clean(form.exact_address, 300),
      recipient_name: customerIsRecipient
        ? customerName
        : clean(form.recipient_name, 150),
      recipient_phone: customerIsRecipient
        ? customerPhone
        : clean(form.recipient_phone, 40),
      recipient_phone_alt: customerIsRecipient
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

    if (orderError || !order) {
      console.error("CREATE ORDER ERROR:", orderError);
      return fail("No se pudo crear la orden.", 500);
    }

    // Cada entrega confirmada mejora el catálogo local de esa tienda. Es
    // una ayuda para búsquedas futuras y nunca bloquea la creación del pedido.
    if (isDistanceDelivery && deliveryLatitude != null && deliveryLongitude != null) {
      const displayAddress = clean(form.delivery_formatted_address || form.exact_address, 300);
      const normalizedAddress = normalizeCubanAddress(displayAddress);
      if (normalizedAddress) {
        const { error: catalogError } = await supabaseAdmin
          .from("delivery_address_catalog")
          .upsert({
            store_id: storeId,
            normalized_address: normalizedAddress,
            display_address: displayAddress,
            latitude: deliveryLatitude,
            longitude: deliveryLongitude,
            source: "confirmed_order",
            updated_at: new Date().toISOString(),
          }, { onConflict: "store_id,normalized_address" });
        if (catalogError) console.error("delivery address catalog learning failed", catalogError);
      }
    }

    // Algunas instalaciones antiguas no generan order_number
    // automáticamente. Nunca exponemos el UUID completo al cliente: si
    // la BD no asignó uno, creamos un identificador público corto,
    // legible y persistente.
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

    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(
      preparedItems.map((item) => ({
        order_id: order.id,
        item_type: item.item_type,
        product_id: item.product_id,
        combo_id: item.combo_id,
        product_name: item.product_name,
        quantity: item.quantity,
        price: item.price,
        base_price: item.base_price,
        platform_fee_amount: item.platform_fee_amount,
        subtotal: item.subtotal,
      }))
    );

    if (itemsError) {
      console.error("ERROR GUARDANDO ORDER_ITEMS:", itemsError);
      await deleteCreatedOrder(order.id);
      return fail("No se pudieron guardar los productos de la orden.", 500);
    }

    const inventoryChanges: StockChange[] = Array.from(
      stockNeeds,
      ([productId, quantity]) => ({ productId, quantity })
    );

    // RESERVA ATÓMICA: PostgreSQL bloquea todas las filas involucradas,
    // vuelve a comprobar el stock y descuenta todo dentro de una sola
    // transacción. Dos checkouts simultáneos ya no pueden leer ambos la
    // última unidad y venderla dos veces.
    const { data: reservationData, error: reservationError } =
      inventoryChanges.length > 0
        ? await supabaseAdmin.rpc("reserve_product_inventory", {
            p_store_id: storeId,
            p_needs: inventoryChanges.map((change) => ({
              product_id: change.productId,
              quantity: change.quantity,
            })),
          })
        : { data: { success: true }, error: null };

    const reservation = reservationData as {
      success?: boolean;
      code?: string;
      message?: string;
      product_id?: string;
      product_name?: string;
      available?: number;
      requested?: number;
    } | null;

    if (reservationError || !reservation?.success) {
      console.error("ATOMIC STOCK RESERVATION ERROR:", reservationError);
      await deleteCreatedOrder(order.id);

      return NextResponse.json(
        {
          success: false,
          code: reservation?.code || "INVENTORY_ERROR",
          message:
            reservation?.message ||
            "No se pudo confirmar el inventario. Inténtalo nuevamente.",
          inventory:
            reservation?.product_id
              ? [
                  {
                    productId: reservation.product_id,
                    productName: reservation.product_name || null,
                    available: Number(reservation.available || 0),
                    requested: Number(reservation.requested || 0),
                  },
                ]
              : [],
        },
        { status: reservationError ? 500 : 409 }
      );
    }

    // El bono se reclama solamente DESPUÉS de asegurar el inventario.
    // Si el bono falla, se devuelve la reserva atómicamente antes de
    // eliminar la orden.
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
        await restoreStock(storeId, inventoryChanges);
        await deleteCreatedOrder(order.id);
        return fail(claimResult?.message || "El bono ya no está disponible.", 409);
      }
    }

    // RECORDATORIO DE CARRITO ABANDONADO: la orden se completó de verdad,
    // así que si había un snapshot de checkout en progreso para este
    // device_token, se marca como convertido para que el cron de
    // recordatorios (app/api/cron/reminders/route.ts) lo ignore. Nunca
    // debe afectar la orden ya creada si esto falla.
    try {
      const { error: abandonmentError } = await supabaseAdmin
        .from("checkout_abandonment")
        .update({ converted_at: new Date().toISOString() })
        .eq("store_id", storeId)
        .eq("device_token", resolvedDeviceToken)
        .is("converted_at", null);

      if (abandonmentError) {
        console.error(
          "No se pudo marcar el snapshot de checkout como convertido (no afecta la orden):",
          abandonmentError
        );
      }
    } catch (abandonmentCatchError) {
      console.error(
        "Error inesperado marcando snapshot de checkout (no afecta la orden):",
        abandonmentCatchError
      );
    }

    // FASE 2 (Vercel/Next): el aviso de nueva orden ya no forma parte
    // del tiempo crítico del checkout. `after()` deja que devolvamos la
    // respuesta al comprador y, después, consulta los destinatarios y
    // envía el email. Si Resend o store_settings están lentos, el cliente
    // no tiene que esperar por ellos y la orden ya creada no se afecta.
    const requestOrigin = getRequestOrigin(request);
    const orderUrl = `${requestOrigin}/pedido/${encodeURIComponent(publicOrderNumber)}`;

    after(async () => {
      await sendNewOrderNotification({
        storeId,
        storeName: store.name || "tu tienda",
        orderNumber: publicOrderNumber,
        customerName,
        customerPhone,
        subtotal,
        deliveryFee,
        total,
        itemsCount: preparedItems.length,
        isLocalDelivery,
        municipality: city,
      });

      // Confirmación al comprador (solo si dejó email en el checkout).
      if (email) {
        await sendCustomerOrderConfirmationEmail({
          toEmail: email,
          storeName: store.name || "tu tienda",
          orderNumber: publicOrderNumber,
          orderUrl,
          customerName: customerName || "cliente",
          items: preparedItems.map((item) => ({
            product_name: item.product_name,
            quantity: item.quantity,
            subtotal: item.subtotal,
          })),
          subtotal,
          deliveryFee,
          discountAmount,
          total,
        });
      }
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        order_number: publicOrderNumber,
        subtotal,
        delivery_fee: deliveryFee,
        platform_fee_amount: platformFeeAmount,
        discount_amount: discountAmount,
        total,
      },
      deviceToken: resolvedDeviceToken,
    });
  } catch (error) {
    console.error("CREATE ORDER ERROR (catch):", error);
    return fail("No se pudo completar el pedido.", 500);
  }
}
