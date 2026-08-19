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

/**
 * Valida una fecha YYYY-MM-DD sin asumir que el servidor está en la misma
 * zona horaria que el cliente/restaurante.
 *
 * Vercel suele ejecutar en UTC. Si en Miami/Havana todavía es 18 de agosto,
 * en UTC ya puede ser 19. La validación anterior rechazaba "hoy" como pasado.
 *
 * Permitimos un margen de 1 día respecto al UTC del servidor exclusivamente
 * para absorber esa diferencia de zona horaria.
 */
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);

  const candidateMs = Date.UTC(year, month - 1, day);

  if (!Number.isFinite(candidateMs)) {
    return false;
  }

  // Evita que Date.UTC normalice silenciosamente fechas imposibles,
  // por ejemplo 2026-02-31.
  const candidate = new Date(candidateMs);
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return false;
  }

  const now = new Date();

  const serverTodayUtcMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );

  // Tolerancia de una jornada por diferencias UTC/local.
  const earliestAllowedMs = serverTodayUtcMs - 24 * 60 * 60 * 1000;

  return candidateMs >= earliestAllowedMs;
}

/** GET /api/public/reservas?slug=deparis&date=2026-08-20
 * Trae mesas + franjas + qué cupos ya están ocupados esa fecha.
 * Nunca incluye datos de quién ocupa cada mesa.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = clean(searchParams.get("slug"), 100).toLowerCase();
    const date = clean(searchParams.get("date"), 10);

    if (!slug || !validDate(date)) {
      return NextResponse.json(
        { error: "Parámetros inválidos." },
        { status: 400 }
      );
    }

    const board = await getPublicReservationBoard(slug, date);

    if (!board) {
      return NextResponse.json(
        { error: "Reservas no disponibles para este negocio." },
        { status: 404 }
      );
    }

    return NextResponse.json(board);
  } catch (error) {
    console.error("GET /api/public/reservas error:", error);
    return NextResponse.json(
      { error: "Error inesperado." },
      { status: 500 }
    );
  }
}

/** POST /api/public/reservas — crea una solicitud de reserva
 * (queda en estado "pending" hasta que el negocio la confirma).
 */
export async function POST(request: NextRequest) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json(
        { error: "Se esperaba contenido JSON." },
        { status: 415 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;

    const storeSlug = clean(body.store_slug, 100).toLowerCase();
    const tableId = clean(body.table_id, 100);
    const slotId = clean(body.slot_id, 100);
    const reservationDate = clean(body.reservation_date, 10);
    const partySize = Number(body.party_size);
    const customerName = clean(body.customer_name, 120);
    const customerLastName = clean(body.customer_last_name, 120);
    const customerEmail = clean(body.customer_email, 160);
    const customerPhone = clean(body.customer_phone, 30).replace(
      /[^0-9+\s()-]/g,
      ""
    );
    const notes = clean(body.notes, 300);

    if (
      !storeSlug ||
      !tableId ||
      !slotId ||
      !validDate(reservationDate)
    ) {
      return NextResponse.json(
        { error: "Completa fecha, mesa y franja válidas." },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(partySize) ||
      partySize < 1 ||
      partySize > 60
    ) {
      return NextResponse.json(
        { error: "Cantidad de personas inválida." },
        { status: 400 }
      );
    }

    if (
      !customerName ||
      !customerLastName ||
      customerPhone.replace(/\D/g, "").length < 7
    ) {
      return NextResponse.json(
        {
          error:
            "Completa tu nombre, apellidos y un teléfono válido.",
        },
        { status: 400 }
      );
    }

    if (
      customerEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)
    ) {
      return NextResponse.json(
        { error: "El correo no es válido." },
        { status: 400 }
      );
    }

    const input: CreateReservationInput = {
      storeSlug,
      tableId,
      slotId,
      reservationDate,
      partySize,
      customerName,
      customerLastName,
      customerEmail: customerEmail || undefined,
      customerPhone,
      notes,
    };

    const result = await createPublicReservation(input);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/public/reservas error:", error);
    return NextResponse.json(
      { error: "Error inesperado." },
      { status: 500 }
    );
  }
}
