import { NextRequest, NextResponse } from "next/server";

function clean(value: unknown, max = 180) {
  return String(value ?? "").trim().slice(0, max);
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

    const query = [addressLine1, city, region, postalCode, countryCode].filter(Boolean).join(", ");
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
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

    if (!response.ok) {
      return NextResponse.json({ error: "No pudimos localizar esa dirección en el mapa." }, { status: 502 });
    }

    const results = (await response.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>;
    const first = results[0];
    const latitude = Number(first?.lat);
    const longitude = Number(first?.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json({ error: "No encontramos el punto exacto. Revisa el número, la calle y el ZIP Code." }, { status: 404 });
    }

    return NextResponse.json({
      latitude,
      longitude,
      formattedAddress: first.display_name || query,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("pickup geocode error", error);
    return NextResponse.json({ error: "No pudimos localizar la dirección." }, { status: 500 });
  }
}
