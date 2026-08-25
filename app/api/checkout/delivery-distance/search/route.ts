import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeCubanAddress } from "@/lib/checkout/distance-delivery";

export const maxDuration = 20;

function clean(value: unknown, max = 180) {
  return String(value || "").trim().slice(0, max);
}

type PhotonFeature = {
  geometry?: { coordinates?: unknown[] };
  properties?: Record<string, unknown>;
};

type SearchResult = { label: string; latitude: number; longitude: number };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const storeId = clean(body.storeId, 80);
    const query = clean(body.query);
    if (!storeId || query.length < 3) {
      return NextResponse.json({ error: "Escribe al menos tres caracteres." }, { status: 400 });
    }

    const { data: settings } = await supabaseAdmin
      .from("checkout_settings")
      .select("delivery_address_mode,delivery_origin_latitude,delivery_origin_longitude")
      .eq("store_id", storeId)
      .maybeSingle();
    if (!settings || settings.delivery_address_mode !== "distance") {
      return NextResponse.json({ error: "Búsqueda no disponible." }, { status: 409 });
    }

    const normalizedQuery = normalizeCubanAddress(query);
    const { data: catalogRows } = await supabaseAdmin
      .from("delivery_address_catalog")
      .select("display_address,latitude,longitude")
      .eq("store_id", storeId)
      .ilike("normalized_address", `%${normalizedQuery}%`)
      .order("use_count", { ascending: false })
      .limit(6);
    const catalogResults = (catalogRows || []).map((row) => ({
      label: row.display_address,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
    }));

    const params = new URLSearchParams({ q: `${query}, Cienfuegos, Cuba`, limit: "6", lang: "es" });
    if (settings.delivery_origin_latitude != null && settings.delivery_origin_longitude != null) {
      params.set("lat", String(settings.delivery_origin_latitude));
      params.set("lon", String(settings.delivery_origin_longitude));
    }
    let payload: { features?: PhotonFeature[] } = { features: [] };
    try {
      const response = await fetch(`https://photon.komoot.io/api/?${params}`, {
        headers: { "User-Agent": "PerlaMarketplace-Delivery/1.0", Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(7000),
      });
      if (response.ok) payload = await response.json();
      else if (catalogResults.length === 0) throw new Error("El buscador de direcciones no respondió.");
    } catch (photonError) {
      if (catalogResults.length === 0) throw photonError;
      console.error("Photon search failed; using local delivery catalog", photonError);
    }
    const photonResults = (Array.isArray(payload?.features) ? payload.features : [])
      .map((feature: PhotonFeature): SearchResult | null => {
        const coordinates = feature?.geometry?.coordinates;
        const properties = feature?.properties || {};
        if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
        const label = [properties.name, properties.street, properties.housenumber, properties.district, properties.city, properties.state]
          .filter(Boolean)
          .filter((value, index, list) => list.indexOf(value) === index)
          .map(String)
          .join(", ");
        return { label: label || query, latitude: Number(coordinates[1]), longitude: Number(coordinates[0]) };
      })
      .filter((item): item is SearchResult => Boolean(item && Number.isFinite(item.latitude) && Number.isFinite(item.longitude)));
    const results = [...catalogResults, ...photonResults].filter((item, index, list) =>
      list.findIndex((candidate) => Math.abs(candidate.latitude - item.latitude) < 0.00001 && Math.abs(candidate.longitude - item.longitude) < 0.00001) === index
    ).slice(0, 8);
    return NextResponse.json({ results }, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (error) {
    console.error("delivery address search error", error);
    return NextResponse.json({ error: "No pudimos buscar la dirección. Puedes marcarla directamente en el mapa." }, { status: 502 });
  }
}
