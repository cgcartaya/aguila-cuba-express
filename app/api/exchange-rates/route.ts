import { NextResponse } from "next/server";

import { getUsdExchangeRates } from "@/lib/services/exchange-rates";

export async function GET() {
  const data = await getUsdExchangeRates();

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
