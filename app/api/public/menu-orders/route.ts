import { NextRequest, NextResponse } from "next/server";

import { createMenuOrder } from "@/lib/services/menu-orders-public";
import type { CreateMenuOrderInput, CreateMenuOrderLine } from "@/lib/services/menu-orders-public";

export const maxDuration = 30;

function clean(value: unknown, max = 300) {
  return String(value ?? "").trim().slice(0, max);
}

export async function POST(request: NextRequest) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json({ error: "Se esperaba contenido JSON." }, { status: 415 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    const storeSlug = clean(body.store_slug, 100).toLowerCase();
    const orderType = clean(body.order_type, 20);
    const tableNumber = clean(body.table_number, 30);
    const deliveryAddress = clean(body.delivery_address, 300);
    const deliveryZoneId = clean(body.delivery_zone_id, 100);
    const customerName = clean(body.customer_name, 120);
    const customerPhone = clean(body.customer_phone, 30).replace(/[^0-9+\s()-]/g, "");
    const customerEmail = clean(body.customer_email, 160);
    const notes = clean(body.notes, 400);
    const rawLines = Array.isArray(body.lines) ? body.lines : [];

    if (!storeSlug || !["takeaway", "delivery"].includes(orderType)) {
      return NextResponse.json({ error: "Tipo de pedido inválido." }, { status: 400 });
    }

    if (!customerName || customerPhone.replace(/\D/g, "").length < 7) {
      return NextResponse.json({ error: "Completa tu nombre y un teléfono válido." }, { status: 400 });
    }

    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return NextResponse.json({ error: "El correo no es válido." }, { status: 400 });
    }

    if (orderType === "delivery" && !deliveryZoneId) {
      return NextResponse.json(
        { error: "Selecciona una zona de entrega." },
        { status: 400 }
      );
    }

    if (orderType === "delivery" && !deliveryAddress) {
      return NextResponse.json({ error: "Escribe la dirección de entrega." }, { status: 400 });
    }

    if (!rawLines.length) {
      return NextResponse.json({ error: "El pedido está vacío." }, { status: 400 });
    }

    const lines: CreateMenuOrderLine[] = rawLines.map((raw) => {
      const r = raw as Record<string, unknown>;
      return {
        menu_item_id: clean(r.menu_item_id, 100),
        quantity: Math.max(1, Math.min(50, Number(r.quantity) || 1)),
        selected_options: Array.isArray(r.selected_options)
          ? (r.selected_options as CreateMenuOrderLine["selected_options"])
          : [],
        notes: clean(r.notes, 200),
      };
    });

    if (lines.some((l) => !l.menu_item_id)) {
      return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
    }

    const input: CreateMenuOrderInput = {
      storeSlug,
      orderType: orderType as CreateMenuOrderInput["orderType"],
      tableNumber,
      deliveryAddress,
      deliveryZoneId,
      customerName,
      customerPhone,
      customerEmail: customerEmail || undefined,
      notes,
      lines,
    };

    const result = await createMenuOrder(input);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ id: result.id, total: result.total }, { status: 201 });
  } catch (error) {
    console.error("POST /api/public/menu-orders error:", error);
    return NextResponse.json({ error: "Error inesperado." }, { status: 500 });
  }
}
