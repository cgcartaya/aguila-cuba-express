// Guardar en: app/api/checkout/session-snapshot/route.ts
//
// RECORDATORIO DE CARRITO ABANDONADO — snapshot.
//
// El carrito (contexts/CartContext.tsx) solo vive en localStorage, así
// que si alguien nunca completa el checkout, no hay forma de saber quién
// era ni cómo contactarlo. Esta ruta guarda un "snapshot" liviano
// (nombre/email/teléfono + items) apenas la persona empieza a llenar el
// formulario de checkout — no hace falta que termine la compra.
//
// Se llama desde app/tienda/[slug]/checkout/page.tsx con un debounce,
// cada vez que cambian los datos de contacto o el carrito. Nunca debe
// bloquear ni afectar el checkout — cualquier error acá se ignora en
// silencio del lado del cliente.
//
// Cuando la orden se completa de verdad, create-order/route.ts marca
// esta fila como converted_at para que el cron de recordatorios la
// ignore (ver app/api/cron/reminders/route.ts).

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const clean = (value: unknown, max = 300) => String(value ?? "").trim().slice(0, max);
const money = (value: unknown) => Math.round(Number(value || 0) * 100) / 100;

type SnapshotItem = {
  name?: string;
  quantity?: number;
  price?: number;
};

type SnapshotBody = {
  storeId?: string;
  deviceToken?: string;
  name?: string;
  email?: string;
  phone?: string;
  method?: string;
  subtotal?: number;
  items?: SnapshotItem[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as SnapshotBody | null;
    if (!body) return NextResponse.json({ ok: false }, { status: 200 });

    const storeId = clean(body.storeId, 64);
    const deviceToken = clean(body.deviceToken, 100);
    const email = clean(body.email, 200).toLowerCase();
    const phone = clean(body.phone, 40);
    const name = clean(body.name, 150);

    // Sin tienda, sin token, o sin ningún dato de contacto todavía: no
    // hay nada útil que guardar (la persona apenas está escribiendo).
    if (!storeId || !deviceToken) {
      return NextResponse.json({ ok: false }, { status: 200 });
    }
    if (!email && phone.length < 7) {
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    const cleanItems = items.slice(0, 50).map((item) => ({
      name: clean(item?.name, 200),
      quantity: Math.max(1, Math.trunc(Number(item?.quantity || 1))),
      price: money(item?.price),
    }));

    const { error } = await supabaseAdmin
      .from("checkout_abandonment")
      .upsert(
        {
          store_id: storeId,
          device_token: deviceToken,
          customer_name: name || null,
          customer_email: email || null,
          customer_phone: phone || null,
          method: clean(body.method, 40) || null,
          items: cleanItems,
          subtotal: money(body.subtotal),
          last_seen_at: new Date().toISOString(),
          // Si esta persona había completado un pedido antes con este
          // mismo device_token y ahora vuelve a armar otro carrito,
          // "reabrimos" el seguimiento para el pedido nuevo.
          converted_at: null,
          email_reminded_at: null,
          whatsapp_reminded_at: null,
        },
        { onConflict: "store_id,device_token" }
      );

    if (error) {
      console.error("Error guardando snapshot de checkout:", error);
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error inesperado guardando snapshot de checkout:", error);
    // Nunca devolver un error real acá — el checkout no debe enterarse.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
