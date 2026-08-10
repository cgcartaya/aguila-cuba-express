import { NextRequest, NextResponse } from "next/server";
import { validatePickupAddress } from "@/lib/pickups/address-validation";

export async function POST(request: NextRequest) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json({ error: "Se esperaba contenido JSON." }, { status: 415 });
    }

    const body = await request.json();
    const result = await validatePickupAddress({
      storeSlug: String(body.store_slug || ""),
      addressLine1: String(body.address_line_1 || ""),
      city: String(body.city || ""),
      region: String(body.region || ""),
      postalCode: String(body.postal_code || ""),
      countryCode: String(body.country_code || "US"),
    });

    return NextResponse.json(result, {
      status: result.valid ? 200 : 422,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("pickup address validation error", error);
    return NextResponse.json({ error: "No pudimos validar la dirección." }, { status: 500 });
  }
}
