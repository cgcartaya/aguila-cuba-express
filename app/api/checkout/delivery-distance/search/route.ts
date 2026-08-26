import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeCubanAddress } from "@/lib/checkout/distance-delivery";
import { calculateDistanceDeliveryFee, normalizeDistanceSettings } from "@/lib/checkout/distance-delivery";

export const maxDuration = 20;

function clean(value: unknown, max = 180) {
  return String(value || "").trim().slice(0, max);
}

type PhotonFeature = {
  geometry?: { coordinates?: unknown[] };
  properties?: Record<string, unknown>;
};

type SearchResult = {
  label: string;
  source: "catalog" | "map";
  catalogId?: string;
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
  fee?: number;
  zone?: string | null;
};

type NominatimResult = {
  display_name?: string;
  lat?: string;
  lon?: string;
};

function expandCienfuegosQuery(value: string) {
  return value
    .replace(/#\s*(\d+)/g, "$1")
    .replace(/\b(\d+)\s*(ne|no|se|so)\b/gi, (_, number, direction) =>
      `${number} ${String(direction).toUpperCase()}`
    )
    .replace(/\be\/?\s*(\d+)/gi, "entre $1")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const storeId = clean(body.storeId, 80);
    const query = clean(body.query);
    const catalogOnly = body.catalogOnly === true;
    if (!storeId || query.length < 1) {
      return NextResponse.json({ error: "Escribe una calle, avenida o número." }, { status: 400 });
    }

    const { data: settings } = await supabaseAdmin
      .from("checkout_settings")
      .select("delivery_address_mode,delivery_origin_address,delivery_origin_latitude,delivery_origin_longitude,distance_base_km,distance_base_fee,distance_additional_fee_per_km,max_delivery_distance_km")
      .eq("store_id", storeId)
      .maybeSingle();
    if (!settings || settings.delivery_address_mode !== "distance") {
      return NextResponse.json({ error: "Búsqueda no disponible." }, { status: 409 });
    }

    const normalizedQuery = normalizeCubanAddress(query);
    const tokens = [...new Set(normalizedQuery.split(" ").filter(Boolean))];
    const usefulTokens = tokens.filter((token) => !["calle", "avenida", "entre", "y", "esquina"].includes(token));
    const anchorToken = [...usefulTokens].sort((a, b) => {
      const numericDifference = Number(/^\d/.test(b)) - Number(/^\d/.test(a));
      return numericDifference || b.length - a.length;
    })[0] || tokens[0] || normalizedQuery;

    const { data: segmentRows } = await supabaseAdmin
      .from("delivery_address_segments")
      .select("id,normalized_address,search_text,display_address,zone_name,distance_meters")
      .eq("store_id", storeId)
      .ilike("search_text", `%${anchorToken}%`)
      .limit(300);

    const settingsForFee = normalizeDistanceSettings(settings);
    const scoreSegment = (row: { normalized_address: string; search_text: string }) => {
      const words = new Set(row.search_text.split(" ").filter(Boolean));
      let score = row.normalized_address === normalizedQuery ? 1000 : 0;
      if (row.normalized_address.includes(normalizedQuery)) score += 80;
      for (const token of tokens) {
        if (words.has(token)) score += /^\d/.test(token) ? 14 : 6;
        else if (row.search_text.includes(token)) score += 2;
      }
      return score;
    };

    const catalogResults: SearchResult[] = (segmentRows || [])
      .map((row) => ({ row, score: scoreSegment(row) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.row.display_address.localeCompare(b.row.display_address))
      .slice(0, 20)
      .map(({ row }) => ({
        label: row.display_address,
        source: "catalog" as const,
        catalogId: row.id,
        distanceMeters: Number(row.distance_meters),
        fee: calculateDistanceDeliveryFee(Number(row.distance_meters), settingsForFee),
        zone: row.zone_name,
      }));

    if (catalogOnly) {
      return NextResponse.json(
        { results: catalogResults },
        { headers: { "Cache-Control": "private, max-age=300" } }
      );
    }

    const expandedQuery = expandCienfuegosQuery(query);
    const params = new URLSearchParams({
      q: `${expandedQuery}, Cienfuegos, Cuba`,
      limit: "6",
      zoom: "15",
      location_bias_scale: "0.05",
    });
    if (settings.delivery_origin_latitude != null && settings.delivery_origin_longitude != null) {
      params.set("lat", String(settings.delivery_origin_latitude));
      params.set("lon", String(settings.delivery_origin_longitude));
    }
    let payload: { features?: PhotonFeature[] } = { features: [] };
    if (catalogResults.length === 0) {
      try {
        const response = await fetch(`https://photon.komoot.io/api/?${params}`, {
          headers: { "User-Agent": "PerlaMarketplace-Delivery/1.0", Accept: "application/json" },
          cache: "no-store",
          signal: AbortSignal.timeout(7000),
        });
        if (response.ok) payload = await response.json();
        else console.error("Photon search failed", response.status);
      } catch (photonError) {
        console.error("Photon search failed; trying fallback", photonError);
      }
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
        return { label: label || query, source: "map", latitude: Number(coordinates[1]), longitude: Number(coordinates[0]) };
      })
      .filter((item): item is SearchResult => Boolean(item && Number.isFinite(item.latitude) && Number.isFinite(item.longitude)));
    let nominatimResults: SearchResult[] = [];
    if (catalogResults.length === 0 && photonResults.length < 3) {
      try {
        const originLat = Number(settings.delivery_origin_latitude || 22.145);
        const originLon = Number(settings.delivery_origin_longitude || -80.44);
        const nominatimParams = new URLSearchParams({
          q: `${expandedQuery}, Cienfuegos, Cuba`,
          format: "jsonv2",
          addressdetails: "1",
          limit: "6",
          countrycodes: "cu",
          viewbox: `${originLon - 0.12},${originLat + 0.12},${originLon + 0.12},${originLat - 0.12}`,
          bounded: "1",
          "accept-language": "es",
        });
        const fallbackResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?${nominatimParams}`,
          {
            headers: {
              "User-Agent": "PerlaMarketplace-Delivery/1.0 (support@perlamarketplace.com)",
              Accept: "application/json",
            },
            cache: "no-store",
            signal: AbortSignal.timeout(8000),
          }
        );
        if (fallbackResponse.ok) {
          const rows = (await fallbackResponse.json()) as NominatimResult[];
          nominatimResults = rows.map((row) => ({
            label: row.display_name || query,
            source: "map" as const,
            latitude: Number(row.lat),
            longitude: Number(row.lon),
          })).filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
        }
      } catch (fallbackError) {
        console.error("Nominatim fallback failed", fallbackError);
      }
    }

    const mapResults = [...photonResults, ...nominatimResults].filter((item, index, list) =>
      list.findIndex((candidate) => Math.abs(Number(candidate.latitude) - Number(item.latitude)) < 0.00001 && Math.abs(Number(candidate.longitude) - Number(item.longitude)) < 0.00001) === index
    ).slice(0, 6);
    const results = catalogResults.length > 0 ? catalogResults : mapResults;
    return NextResponse.json({ results }, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (error) {
    console.error("delivery address search error", error);
    return NextResponse.json({ error: "No pudimos buscar la dirección. Puedes marcarla directamente en el mapa." }, { status: 502 });
  }
}
