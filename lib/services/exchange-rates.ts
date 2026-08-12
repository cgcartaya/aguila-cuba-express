/* =========================================================
   TASAS DE CAMBIO (USD -> EUR / MXN / GBP / CAD)
   ---------------------------------------------------------
   Se usa SOLO para mostrar precios convertidos en la tienda.
   El cobro real en Stripe siempre sigue en USD (ver
   app/api/checkout/pay-with-card/route.ts) — esto es
   puramente informativo para el cliente.

   Fuente: Frankfurter (tasas de referencia del BCE, sin API
   key, gratis). Si falla, se usa un valor de respaldo fijo
   para que la tienda nunca se quede sin mostrar precios.
========================================================= */

export const SUPPORTED_CURRENCIES = ["EUR", "MXN", "GBP", "CAD"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

// Valores de respaldo aproximados, solo para cuando la API externa
// no responde. Se deben revisar de vez en cuando para que no queden
// muy desactualizados.
const FALLBACK_RATES: Record<SupportedCurrency, number> = {
  EUR: 0.92,
  MXN: 18.5,
  GBP: 0.79,
  CAD: 1.38,
};

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

let cache: { rates: Record<SupportedCurrency, number>; fetchedAt: number } | null = null;

export type ExchangeRatesResult = {
  rates: Record<SupportedCurrency, number>;
  source: "live" | "fallback" | "cache";
  updatedAt: string;
};

export async function getUsdExchangeRates(): Promise<ExchangeRatesResult> {
  const now = Date.now();

  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return { rates: cache.rates, source: "cache", updatedAt: new Date(cache.fetchedAt).toISOString() };
  }

  try {
    const url = `https://api.frankfurter.dev/v1/latest?base=USD&symbols=${SUPPORTED_CURRENCIES.join(",")}`;
    const res = await fetch(url, { next: { revalidate: 21600 } });

    if (!res.ok) throw new Error(`Frankfurter respondió ${res.status}`);

    const data = await res.json();
    const rawRates = data?.rates;

    if (!rawRates || typeof rawRates !== "object") {
      throw new Error("Respuesta de Frankfurter sin tasas");
    }

    const rates = SUPPORTED_CURRENCIES.reduce((acc, code) => {
      const value = rawRates[code];
      acc[code] = typeof value === "number" && value > 0 ? value : FALLBACK_RATES[code];
      return acc;
    }, {} as Record<SupportedCurrency, number>);

    cache = { rates, fetchedAt: now };

    return { rates, source: "live", updatedAt: new Date(now).toISOString() };
  } catch (error) {
    console.error("No se pudieron obtener tasas de cambio en vivo, usando valores de respaldo:", error);

    // No cacheamos el fallback para que el próximo intento vuelva a
    // intentar la API en vez de quedarse pegado en el respaldo.
    return { rates: FALLBACK_RATES, source: "fallback", updatedAt: new Date(now).toISOString() };
  }
}
