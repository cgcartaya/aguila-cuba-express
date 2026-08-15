import { NextRequest, NextResponse } from "next/server";

import { cancelReservationByToken, getReservationByCancelToken } from "@/lib/services/reservas-public";

export const maxDuration = 20;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = (searchParams.get("token") || "").trim();

  if (!token) {
    return NextResponse.json({ error: "Falta el token." }, { status: 400 });
  }

  const reservation = await getReservationByCancelToken(token);

  if (!reservation) {
    return NextResponse.json({ error: "No se encontró la reserva." }, { status: 404 });
  }

  return NextResponse.json(reservation);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { token?: string };
    const token = (body.token || "").trim();

    if (!token) {
      return NextResponse.json({ error: "Falta el token." }, { status: 400 });
    }

    const result = await cancelReservationByToken(token);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/public/reservas/cancel error:", error);
    return NextResponse.json({ error: "Error inesperado." }, { status: 500 });
  }
}
