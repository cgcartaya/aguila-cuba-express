// Guardar en: app/api/checkout/cancel-order/route.ts
//
// Reemplaza el `supabase.from("orders").delete().eq("id", order.id)`
// que hoy corre en el navegador cuando falla el canje de un
// descuento. Con orders.DELETE restringido a has_store_access,
// ese delete desde el cliente anónimo ya no funciona — esta ruta
// hace el borrado con supabaseAdmin, pero solo si la orden sigue
// en estado "pending" y sin items, para que no se pueda usar como
// un endpoint genérico de "borrar cualquier orden".

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const clean = (value: unknown, max = 64) => String(value ?? "").trim().slice(0, max);
const fail = (message: string, status = 400) =>
  NextResponse.json({ success: false, message }, { status });

export async function POST(request: Request) {
  let body: { orderId?: string; storeId?: string };

  try {
    body = await request.json();
  } catch {
    return fail("Cuerpo de la solicitud inválido.");
  }

  const orderId = clean(body.orderId);
  const storeId = clean(body.storeId);

  if (!orderId || !storeId) {
    return fail("Faltan datos para cancelar la orden.");
  }

  const { data: order, error: fetchError } = await supabaseAdmin
    .from("orders")
    .select("id, store_id, status, payment_status, created_at")
    .eq("id", orderId)
    .maybeSingle();

  if (fetchError) return fail("No se pudo verificar la orden.", 500);
  if (!order || order.store_id !== storeId) {
    return fail("Orden no encontrada.", 404);
  }

  if (order.status !== "pending" || order.payment_status !== "pending") {
    return fail("Esta orden ya no se puede cancelar automáticamente.", 409);
  }

  // Ventana de seguridad: solo permite cancelar órdenes creadas en
  // los últimos 10 minutos, para que esta ruta no sirva para borrar
  // órdenes viejas aunque sigan en pending.
  const createdAt = new Date(order.created_at).getTime();
  if (Number.isFinite(createdAt) && Date.now() - createdAt > 10 * 60 * 1000) {
    return fail("Esta orden ya no se puede cancelar automáticamente.", 409);
  }

  const { error: itemsCheckError, count } = await supabaseAdmin
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId);

  if (itemsCheckError) return fail("No se pudo verificar la orden.", 500);
  if ((count || 0) > 0) {
    return fail("Esta orden ya tiene productos asociados, no se puede cancelar así.", 409);
  }

  const { error: deleteError } = await supabaseAdmin
    .from("orders")
    .delete()
    .eq("id", orderId);

  if (deleteError) {
    console.error("CANCEL ORDER ERROR:", deleteError);
    return fail("No se pudo cancelar la orden.", 500);
  }

  return NextResponse.json({ success: true });
}
