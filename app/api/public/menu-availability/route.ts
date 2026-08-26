import { NextRequest, NextResponse } from "next/server";

import { getStoreBySlug } from "@/lib/services/stores";
import { getMenuAvailabilityMap, getMenuChannelAvailabilityMap } from "@/lib/services/menu-availability-public";

export const maxDuration = 15;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = (searchParams.get("slug") || "").trim().toLowerCase();

  if (!slug) {
    return NextResponse.json({ error: "Falta el slug de la tienda." }, { status: 400 });
  }

  const store = await getStoreBySlug(slug);
  if (!store || !store.module_menu_enabled) {
    return NextResponse.json({ error: "Menú no disponible." }, { status: 404 });
  }

  const [availability, channels] = await Promise.all([
    getMenuAvailabilityMap(store.id),
    getMenuChannelAvailabilityMap(store.id),
  ]);
  return NextResponse.json(
    { availability, channels },
    { headers: { "Cache-Control": "no-store" } }
  );
}
