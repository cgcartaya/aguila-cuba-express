// Guardar en: app/api/checkout/create-order/route.ts
//
// Reemplaza el insert directo `supabase.from("orders").insert(...)`
// que hoy corre en el navegador del cliente. Al mover esto a una
// API route con supabaseAdmin, orders.SELECT / orders.INSERT ya no
// necesitan estar abiertos a "true" en RLS — el navegador nunca
// vuelve a tocar la tabla orders directamente durante el checkout.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const clean = (value: unknown, max = 300) => String(value ?? "").trim().slice(0, max);
const fail = (message: string, status = 400) =>
  NextResponse.json({ success: false, message }, { status });

type CreateOrderBody = {
  storeId?: string;
  customerId?: string;
  method?: "delivery" | "cuba";
  isLocalDelivery?: boolean;
  subtotal?: number;
  shippingCost?: number;
  total?: number;
  discountCampaignId?: string | null;
  discountCode?: string | null;
  discountAmount?: number;
  zone?: { id?: string; zone_name?: string } | null;
  form?: {
    city?: string;
    municipality?: string;
    exact_address?: string;
    recipient_name?: string;
    recipient_phone?: string;
    recipient_phone_alt?: string;
    reference?: string;
    notes?: string;
    name?: string;
    phone?: string;
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
  const customerId = clean(body.customerId, 64);

  if (!storeId || !customerId) {
    return fail("Faltan datos obligatorios para crear la orden.");
  }

  // Confirma que la tienda existe y está activa antes de aceptar
  // la orden — evita crear pedidos contra un store_id inventado.
  const { data: store, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id, is_active, module_store_enabled")
    .eq("id", storeId)
    .maybeSingle();

  if (storeError) return fail("No se pudo validar la tienda.", 500);
  if (!store || store.is_active === false) {
    return fail("Esta tienda no está disponible.", 404);
  }

  const isLocalDelivery = Boolean(body.isLocalDelivery);
  const form = body.form || {};
  const zone = body.zone || null;

  const payload = {
    customer_id: customerId,
    store_id: storeId,
    status: "pending",
    payment_status: "pending",
    subtotal: Number(body.subtotal) || 0,
    delivery_fee: Number(body.shippingCost) || 0,
    discount_campaign_id: body.discountCampaignId || null,
    discount_code: body.discountCode || null,
    discount_amount: Number(body.discountAmount) || 0,
    total: Number(body.total) || 0,
    country: isLocalDelivery ? "Estados Unidos" : "Cuba",
    state: isLocalDelivery ? null : "Cienfuegos",
    municipality: isLocalDelivery ? clean(form.city, 120) : clean(form.municipality, 120),
    delivery_zone_id: zone?.id || null,
    zone_name: zone?.zone_name || null,
    exact_address: clean(form.exact_address, 300),
    recipient_name: isLocalDelivery ? clean(form.name, 150) : clean(form.recipient_name, 150),
    recipient_phone: isLocalDelivery ? clean(form.phone, 40) : clean(form.recipient_phone, 40),
    recipient_phone_alt: isLocalDelivery ? null : clean(form.recipient_phone_alt, 40),
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

  return NextResponse.json({
    success: true,
    order: { id: order.id, order_number: order.order_number },
  });
}
