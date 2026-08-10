// Guardar en: app/api/checkout/create-order/route.ts
//
// NOTA IMPORTANTE (2026-08-10): esta ruta faltaba por completo en
// producción — el .zip que la contenía (app/api/checkout.zip, del
// 29 de julio) nunca se llegó a descomprimir en su carpeta real, así
// que create-order/ y cancel-order/ quedaron vacías todo este tiempo.
// Además, esa versión del 29 de julio ya no encajaba con lo que
// checkout/page.tsx manda hoy (zoneId en vez de zone, items con
// item_type/product_name/subtotal, customerPhone, sin customerId).
// Esta versión se reconstruyó rastreando el body real que arma
// createOrderSecure() en checkout/page.tsx y las tablas reales que
// ya usa el resto del código (delivery_zones, checkout_settings,
// discount_campaigns, discount_campaign_customers, order_items).
//
// Puntos a probar con cuidado antes de confiar en esto al 100%:
// - El flujo normal (Cuba) con y sin envío gratis por monto mínimo.
// - El flujo de Yoyo con entrega local (isLocalDelivery).
// - Un pedido con un bono/descuento aplicado.
// Si algo no cuadra con lo que veías antes, es más fácil ajustarlo
// aquí que adivinarlo de nuevo — avisa qué parte no calza.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const YOYO_SLUG = "yoyo-envios";

const clean = (value: unknown, max = 300) =>
  String(value ?? "").trim().slice(0, max);
const fail = (message: string, status = 400) =>
  NextResponse.json({ success: false, message }, { status });

type OrderItemInput = {
  item_type?: "product" | "combo";
  product_id?: string | null;
  combo_id?: string | null;
  product_name?: string;
  quantity?: number;
  price?: number;
  subtotal?: number;
};

type CreateOrderBody = {
  storeId?: string;
  method?: "delivery" | "cuba";
  isLocalDelivery?: boolean;
  zoneId?: string | null;
  items?: OrderItemInput[];
  discountCampaignId?: string | null;
  discountCode?: string | null;
  customerPhone?: string;
  intendedPaymentMethod?: string;
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
  };
};

export async function POST(request: Request) {
  let body: CreateOrderBody;

  try {
    body = await request.json();
  } catch {
    return fail("Cuerpo de la solicitud inválido.");
  }

  const storeId = clean(body.storeId, 64);
  const items = Array.isArray(body.items) ? body.items : [];

  if (!storeId) return fail("Falta el id de la tienda.");
  if (items.length === 0) return fail("El carrito está vacío.");

  // Confirma que la tienda existe y está activa antes de aceptar la
  // orden — evita crear pedidos contra un store_id inventado.
  const { data: store, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id, slug, is_active")
    .eq("id", storeId)
    .maybeSingle();

  if (storeError) return fail("No se pudo validar la tienda.", 500);
  if (!store || store.is_active === false) {
    return fail("Esta tienda no está disponible.", 404);
  }

  const isYoyo = store.slug === YOYO_SLUG;
  const isLocalDelivery = Boolean(body.isLocalDelivery);
  const form = body.form || {};

  // El subtotal por línea ya viene calculado (con escalas de precio por
  // cantidad incluidas) y es lo mismo que el cliente vio en pantalla
  // antes de confirmar. Se recalcula sumándolo en el servidor en vez de
  // aceptar un total suelto del cliente.
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.subtotal || 0),
    0
  );

  let shippingCost = 0;
  let deliveryZoneId: string | null = null;
  let zoneName: string | null = null;

  if (isYoyo && isLocalDelivery) {
    // Yoyo con entrega local usa una tarifa fija de configuración, no
    // zonas por municipio.
    const { data: settings } = await supabaseAdmin
      .from("checkout_settings")
      .select("show_delivery_price, fixed_delivery_fee")
      .eq("store_id", storeId)
      .maybeSingle();

    shippingCost = settings?.show_delivery_price
      ? Number(settings.fixed_delivery_fee || 0)
      : 0;
  } else {
    const zoneId = clean(body.zoneId, 64);

    if (zoneId) {
      const { data: zone } = await supabaseAdmin
        .from("delivery_zones")
        .select("id, zone_name, delivery_fee, minimum_order, free_delivery_from")
        .eq("id", zoneId)
        .eq("store_id", storeId)
        .maybeSingle();

      if (zone) {
        deliveryZoneId = zone.id;
        zoneName = zone.zone_name;

        const freeDeliveryFrom = Number(zone.free_delivery_from || 0);
        const hasFreeDelivery =
          freeDeliveryFrom > 0 && subtotal >= freeDeliveryFrom;

        shippingCost = hasFreeDelivery
          ? 0
          : Number(zone.delivery_fee || 0);
      }
    }
  }

  // Descuento: se re-valida acá con la MISMA lógica que
  // /api/discounts/validate, en vez de confiar en un monto que mande
  // el cliente — el cliente nunca manda un discountAmount a propósito,
  // solo el código y su teléfono.
  let discountAmount = 0;
  let appliedCampaignId: string | null = null;
  const discountCode = clean(body.discountCode, 40).toUpperCase();
  const customerPhone = clean(body.customerPhone, 40);

  if (discountCode && customerPhone) {
    const { data: campaign } = await supabaseAdmin
      .from("discount_campaigns")
      .select("*")
      .eq("store_id", storeId)
      .eq("code", discountCode)
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (campaign) {
      const { data: authorized } = await supabaseAdmin
        .from("discount_campaign_customers")
        .select("id, status")
        .eq("campaign_id", campaign.id)
        .eq("store_id", storeId)
        .eq("customer_phone", customerPhone)
        .maybeSingle();

      if (authorized && authorized.status === "available") {
        discountAmount = Math.min(
          Number(campaign.discount_amount || 0),
          Math.max(subtotal, 0)
        );
        appliedCampaignId = campaign.id;
      }
    }
  }

  const total = Math.max(subtotal + shippingCost - discountAmount, 0);

  const payload = {
    store_id: storeId,
    status: "pending",
    payment_status: "pending",
    subtotal,
    delivery_fee: shippingCost,
    discount_campaign_id: appliedCampaignId,
    discount_code: appliedCampaignId ? discountCode : null,
    discount_amount: discountAmount,
    total,
    country: isLocalDelivery ? "Estados Unidos" : "Cuba",
    state: isLocalDelivery ? null : "Cienfuegos",
    municipality: isLocalDelivery
      ? clean(form.city, 120)
      : clean(form.municipality, 120),
    delivery_zone_id: deliveryZoneId,
    zone_name: zoneName,
    exact_address: clean(form.exact_address, 300),
    recipient_name: isLocalDelivery
      ? clean(form.name, 150)
      : clean(form.recipient_name, 150),
    recipient_phone: isLocalDelivery
      ? clean(form.phone, 40)
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

  if (orderError) {
    console.error("CREATE ORDER ERROR:", orderError);
    return fail("No se pudo crear la orden.", 500);
  }

  const itemRows = items.map((item) => ({
    order_id: order.id,
    item_type: item.item_type === "combo" ? "combo" : "product",
    product_id: item.item_type === "product" ? item.product_id || null : null,
    combo_id: item.item_type === "combo" ? item.combo_id || null : null,
    product_name: clean(item.product_name, 200),
    quantity: Math.max(1, Number(item.quantity) || 1),
    price: Number(item.price) || 0,
    subtotal: Number(item.subtotal) || 0,
  }));

  const { error: itemsError } = await supabaseAdmin
    .from("order_items")
    .insert(itemRows);

  if (itemsError) {
    console.error("CREATE ORDER ITEMS ERROR:", itemsError);
    // La orden ya quedó creada; no se revierte para no perder el pedido,
    // pero hay que revisarla a mano si esto llega a pasar.
    return fail(
      "La orden se creó pero hubo un problema guardando los productos. Contacta soporte con el número de orden " +
        (order.order_number || order.id) +
        ".",
      500
    );
  }

  if (appliedCampaignId) {
    await supabaseAdmin
      .from("discount_campaign_customers")
      .update({ status: "used" })
      .eq("campaign_id", appliedCampaignId)
      .eq("store_id", storeId)
      .eq("customer_phone", customerPhone);
  }

  return NextResponse.json({
    success: true,
    order: { id: order.id, order_number: order.order_number },
  });
}
