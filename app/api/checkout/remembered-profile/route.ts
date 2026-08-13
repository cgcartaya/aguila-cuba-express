import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/* =========================================================
   PERFIL RECORDADO DEL CLIENTE (SIN LOGIN)
   ---------------------------------------------------------
   Cada vez que alguien completa una orden, create-order le
   asigna (o reutiliza) un device_token que el checkout guarda
   en localStorage. La próxima vez que ese mismo navegador
   entre a pagar, esta ruta lo usa para reconocerlo y devolver:

   - Sus datos de cliente (nombre, email, teléfono)
   - Los datos del destinatario/dirección de su pedido más
     reciente, para precargar esos campos también
   - Sus últimos pedidos (hasta 3), con los productos de cada
     uno, para poder "repetir pedido" con un clic

   No requiere contraseña ni nada — es un reconocimiento por
   dispositivo, no una cuenta con inicio de sesión real.
========================================================= */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storeId = (searchParams.get("storeId") || "").trim();
  const token = (searchParams.get("token") || "").trim();

  if (!storeId || !token) {
    return NextResponse.json({ found: false });
  }

  const { data: customer } = await supabaseAdmin
    .from("customers")
    .select("id, name, email, phone")
    .eq("store_id", storeId)
    .eq("device_token", token)
    .maybeSingle();

  if (!customer) {
    return NextResponse.json({ found: false });
  }

  const { data: lastOrder } = await supabaseAdmin
    .from("orders")
    .select(
      "recipient_name, recipient_phone, recipient_phone_alt, municipality, zone_name, delivery_zone_id, exact_address, country"
    )
    .eq("store_id", storeId)
    .eq("customer_id", customer.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: recentOrders } = await supabaseAdmin
    .from("orders")
    .select("id, order_number, created_at, total")
    .eq("store_id", storeId)
    .eq("customer_id", customer.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(3);

  const orderIds = (recentOrders || []).map((o) => o.id);

  // Consulta aparte en vez de un select con relación embebida — en este
  // proyecto los selects embebidos ya han fallado antes cuando Postgrest
  // no detecta la FK limpiamente (ver el caso de inventory_movements).
  // Más seguro traer todo plano y juntarlo acá.
  const { data: items } =
    orderIds.length > 0
      ? await supabaseAdmin
          .from("order_items")
          .select("order_id, item_type, product_id, product_name, quantity")
          .in("order_id", orderIds)
      : { data: [] as any[] };

  const itemsByOrder = new Map<string, any[]>();
  for (const item of items || []) {
    const list = itemsByOrder.get(item.order_id) || [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  // Para "repetir pedido" hace falta el precio/stock/imagen ACTUAL del
  // producto, no lo que costaba cuando se hizo el pedido viejo.
  const productIds = Array.from(
    new Set(
      (items || [])
        .filter((item) => item.item_type === "product" && item.product_id)
        .map((item) => item.product_id as string)
    )
  );

  const { data: products } =
    productIds.length > 0
      ? await supabaseAdmin
          .from("products")
          .select("id, name, price, image_url, stock, is_active")
          .in("id", productIds)
      : { data: [] as any[] };

  const productById = new Map((products || []).map((p) => [p.id, p]));

  const recentOrdersWithItems = (recentOrders || []).map((order) => ({
    id: order.id,
    order_number: order.order_number,
    created_at: order.created_at,
    total: order.total,
    items: (itemsByOrder.get(order.id) || []).map((item) => {
      const current = item.product_id ? productById.get(item.product_id) : null;
      return {
        ...item,
        current_price: current?.price ?? null,
        current_stock: current?.stock ?? null,
        image_url: current?.image_url ?? null,
        // Solo se puede volver a agregar si el producto sigue existiendo,
        // activo, y con stock — combos no se soportan en "repetir pedido"
        // por ahora (necesitarían resolver combo_items aparte).
        available:
          item.item_type === "product" &&
          Boolean(current) &&
          current?.is_active !== false &&
          Number(current?.stock || 0) > 0,
      };
    }),
  }));

  return NextResponse.json({
    found: true,
    customer: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    },
    recipient: lastOrder || null,
    recentOrders: recentOrdersWithItems,
  });
}
