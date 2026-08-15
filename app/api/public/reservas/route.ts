import { NextRequest, NextResponse } from "next/server";

import {
  createPublicReservation,
  getPublicReservationBoard,
} from "@/lib/services/reservas-public";
import type { CreateReservationInput } from "@/lib/services/reservas-public";

export const maxDuration = 30;
const MAX_TEXT = 300;

function clean(value: unknown, max = MAX_TEXT) {
  return String(value ?? "").trim().slice(0, max);
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T12:00:00`))) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const candidate = new Date(`${value}T12:00:00`);
  return candidate >= today;
}

/** GET /api/public/reservas?slug=deparis&date=2026-08-20
 *  Trae mesas + franjas + qué cupos ya están ocupados esa fecha.
 *  Nunca incluye datos de quién ocupa cada mesa (eso solo lo ve el
 *  admin del negocio). */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = clean(searchParams.get("slug"), 100).toLowerCase();
    const date = clean(searchParams.get("date"), 10);

    if (!slug || !validDate(date)) {
      return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 });
    }

    const board = await getPublicReservationBoard(slug, date);

    if (!board) {
      return NextResponse.json({ error: "Reservas no disponibles para este negocio." }, { status: 404 });
    }

    return NextResponse.json(board);
  } catch (error) {
    console.error("GET /api/public/reservas error:", error);
    return NextResponse.json({ error: "Error inesperado." }, { status: 500 });
  }
}

/** POST /api/public/reservas — crea una solicitud de reserva
 *  (queda en estado "pending" hasta que el negocio la confirma). */
export async function POST(request: NextRequest) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json({ error: "Se esperaba contenido JSON." }, { status: 415 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    const storeSlug = clean(body.store_slug, 100).toLowerCase();
    const tableId = clean(body.table_id, 100);
    const slotId = clean(body.slot_id, 100);
    const reservationDate = clean(body.reservation_date, 10);
    const partySize = Number(body.party_size);
    const customerName = clean(body.customer_name, 120);
    const customerPhone = clean(body.customer_phone, 30).replace(/[^0-9+\s()-]/g, "");
    const notes = clean(body.notes, 300);

    if (!storeSlug || !tableId || !slotId || !validDate(reservationDate)) {
      return NextResponse.json({ error: "Completa fecha, mesa y franja válidas." }, { status: 400 });
    }

    if (!Number.isFinite(partySize) || partySize < 1 || partySize > 60) {
      return NextResponse.json({ error: "Cantidad de personas inválida." }, { status: 400 });
    }

    if (!customerName || customerPhone.replace(/\D/g, "").length < 7) {
      return NextResponse.json({ error: "Completa tu nombre y un teléfono válido." }, { status: 400 });
    }

    const input: CreateReservationInput = {
      storeSlug,
      tableId,
      slotId,
      reservationDate,
      partySize,
      customerName,
      customerPhone,
      notes,
    };

    const result = await createPublicReservation(input);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/public/reservas error:", error);
    return NextResponse.json({ error: "Error inesperado." }, { status: 500 });
  }
}
