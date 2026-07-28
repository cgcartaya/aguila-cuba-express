import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const clean = (value: unknown, max = 64) =>
  String(value ?? "").trim().slice(0, max);
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
  if (!orderId || !storeId) return fail("Faltan datos para cancelar la orden.");

  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("id, store_id, status, payment_status, created_at")
    .eq("id", orderId)
    .maybeSingle();

  if (error) return fail("No se pudo verificar la orden.", 500);
  if (!order || order.store_id !== storeId) return fail("Orden no encontrada.", 404);
  if (order.status !== "pending" || order.payment_status !== "pending") {
    return fail("Esta orden ya no se puede cancelar automáticamente.", 409);
  }

  const age = Date.now() - new Date(order.created_at).getTime();
  if (!Number.isFinite(age) || age > 10 * 60 * 1000) {
    return fail("Esta orden ya no se puede cancelar automáticamente.", 409);
  }

  // Esta ruta es solo un mecanismo de compensación para errores inmediatos.
  // La creación segura normalmente limpia internamente cualquier fallo.
  const { error: itemsError } = await supabaseAdmin
    .from("order_items")
    .delete()
    .eq("order_id", orderId);
  if (itemsError) return fail("No se pudieron retirar los artículos.", 500);

  const { error: deleteError } = await supabaseAdmin
    .from("orders")
    .delete()
    .eq("id", orderId)
    .eq("store_id", storeId);

  if (deleteError) return fail("No se pudo cancelar la orden.", 500);
  return NextResponse.json({ success: true });
}
