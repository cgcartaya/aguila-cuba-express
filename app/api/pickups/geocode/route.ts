import { NextRequest, NextResponse } from "next/server";


// Vercel Pro: allow headroom for DB/storage/network work without applying a global timeout.
export const maxDuration = 60;
function clean(value: unknown, max = 180) {
  return String(value ?? "").trim().slice(0, max);
}

type GeocodeResult = { latitude: number; longitude: number; formattedAddress: string } | null;

async function geocodeWithNominatim(addressLine1: string, city: string, region: string, postalCode: string, countryCode: string): Promise<GeocodeResult> {
  const query = [addressLine1, city, region, postalCode, countryCode].filter(Boolean).join(", ");
  const url = new URL("https://nominatim.openstreetmap.org/search");
  // Búsqueda estructurada: más precisa que meter todo en "q" como texto libre.
  url.searchParams.set("street", addressLine1);
  url.searchParams.set("city", city);
  url.searchParams.set("state", region);
  url.searchParams.set("postalcode", postalCode);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", countryCode.toLowerCase());

  const response = await fetch(url, {
    headers: {
      "User-Agent": "PerlaMarketplace-YoyoEnvios/18.6",
      "Accept-Language": "es,en;q=0.8",
    },
    cache: "no-store",
  });
  if (!response.ok) return null;

  const results = (await response.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>;
  let first = results[0];

  // Si la búsqueda estructurada no encuentra nada, reintenta con texto libre
  // (Nominatim a veces indexa mejor la dirección completa que por campos).
  if (!first) {
    const fallbackUrl = new URL("https://nominatim.openstreetmap.org/search");
    fallbackUrl.searchParams.set("q", query);
    fallbackUrl.searchParams.set("format", "jsonv2");
    fallbackUrl.searchParams.set("limit", "1");
    fallbackUrl.searchParams.set("addressdetails", "1");
    fallbackUrl.searchParams.set("countrycodes", countryCode.toLowerCase());
    const fallbackResponse = await fetch(fallbackUrl, {
      headers: { "User-Agent": "PerlaMarketplace-YoyoEnvios/18.6", "Accept-Language": "es,en;q=0.8" },
      cache: "no-store",
    });
    if (fallbackResponse.ok) {
      const fallbackResults = (await fallbackResponse.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>;
      first = fallbackResults[0];
    }
  }

  if (!first) return null;
  const latitude = Number(first.lat);
  const longitude = Number(first.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return { latitude, longitude, formattedAddress: first.display_name || query };
}

async function geocodeWithCensus(addressLine1: string, city: string, region: string, postalCode: string, countryCode: string): Promise<GeocodeResult> {
  // Solo cubre EE.UU. Gratis, sin API key, y suele resolver bien direcciones
  // exactas que Nominatim no encuentra. https://geocoding.geo.census.gov
  if (countryCode !== "US") return null;

  const query = [addressLine1, city, region, postalCode].filter(Boolean).join(", ");
  const url = new URL("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress");
  url.searchParams.set("address", query);
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) return null;
  const payload = await response.json();
  const match = payload?.result?.addressMatches?.[0];
  if (!match?.coordinates) return null;

  const latitude = Number(match.coordinates.y);
  const longitude = Number(match.coordinates.x);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return { latitude, longitude, formattedAddress: match.matchedAddress || query };
}

async function geocodeWithGoogle(addressLine1: string, city: string, region: string, postalCode: string, countryCode: string): Promise<GeocodeResult> {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!apiKey) return null;

  const query = [addressLine1, city, region, postalCode, countryCode].filter(Boolean).join(", ");
  const url = new URL(`https://geocode.googleapis.com/v4/geocode/address/${encodeURIComponent(query)}`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("fields", "results.formattedAddress,results.location");

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) return null;
  const payload = await response.json();
  const result = payload?.results?.[0];
  if (!result?.location) return null;

  const latitude = Number(result.location.latitude);
  const longitude = Number(result.location.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return { latitude, longitude, formattedAddress: result.formattedAddress || query };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const addressLine1 = clean(body.address_line_1);
    const city = clean(body.city, 100);
    const region = clean(body.region, 100);
    const postalCode = clean(body.postal_code, 20);
    const countryCode = clean(body.country_code || "US", 2).toUpperCase();

    if (!addressLine1 || !city || !region || !postalCode) {
      return NextResponse.json({ error: "Completa dirección, ciudad, estado y ZIP Code." }, { status: 400 });
    }

    let result: GeocodeResult = null;
    try {
      result = await geocodeWithNominatim(addressLine1, city, region, postalCode, countryCode);
    } catch (nominatimError) {
      console.error("pickup geocode: nominatim failed", nominatimError);
    }

    // Fallback 2: Census Bureau (gratis, sin key, solo EE.UU.).
    if (!result) {
      try {
        result = await geocodeWithCensus(addressLine1, city, region, postalCode, countryCode);
      } catch (censusError) {
        console.error("pickup geocode: census fallback failed", censusError);
      }
    }

    // Fallback 3: Google, solo si hay API key configurada.
    if (!result) {
      try {
        result = await geocodeWithGoogle(addressLine1, city, region, postalCode, countryCode);
      } catch (googleError) {
        console.error("pickup geocode: google fallback failed", googleError);
      }
    }

    if (!result) {
      return NextResponse.json({ error: "No encontramos el punto exacto. Revisa el número, la calle y el ZIP Code, o marca el punto manualmente en el mapa." }, { status: 404 });
    }

    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("pickup geocode error", error);
    return NextResponse.json({ error: "No pudimos localizar la dirección." }, { status: 500 });
  }
}
