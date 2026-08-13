/* =========================================================
   TASAS DE CAMBIO (USD -> EUR / MXN / BRL / CAD / GYD)
   ---------------------------------------------------------
   Se usa SOLO para mostrar precios convertidos en la tienda.
   El cobro real en Stripe siempre sigue en USD (ver
   app/api/checkout/pay-with-card/route.ts) — esto es
   puramente informativo para el cliente.

   Fuente: Frankfurter (tasas de referencia del BCE, sin API
   key, gratis) para EUR/MXN/BRL/CAD. Si falla, se usa un
   valor de respaldo fijo para que la tienda nunca se quede
   sin mostrar precios.

   GYD (dólar guyanés) es un caso aparte: el BCE no lo cubre,
   así que SIEMPRE usa el valor fijo de abajo en vez de traerse
   en vivo. A diferencia del bolívar venezolano, el GYD es una
   moneda bastante estable (se mueve muy poco, ronda 208-209
   por USD desde hace tiempo), así que un valor fijo no se
   desactualiza rápido — de todas formas conviene revisarlo
   cada varios meses.
========================================================= */

export const SUPPORTED_CURRENCIES = ["EUR", "MXN", "BRL", "CAD", "GYD"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

// Monedas que sí se piden a Frankfurter/BCE (GYD no está disponible ahí).
const LIVE_SOURCE_CURRENCIES = ["EUR", "MXN", "BRL", "CAD"] as const;

// Valores de respaldo aproximados, solo para cuando la API externa
// no responde (o, en el caso de GYD, siempre). Se deben revisar de
// vez en cuando para que no queden muy desactualizados.
const FALLBACK_RATES: Record<SupportedCurrency, number> = {
  EUR: 0.92,
  MXN: 18.5,
  BRL: 5.4,
  CAD: 1.38,
  GYD: 209, // referencia ~ago-2026, se mueve poco
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
    const url = `https://api.frankfurter.dev/v1/latest?base=USD&symbols=${LIVE_SOURCE_CURRENCIES.join(",")}`;
    const res = await fetch(url, { next: { revalidate: 21600 } });

    if (!res.ok) throw new Error(`Frankfurter respondió ${res.status}`);

    const data = await res.json();
    const rawRates = data?.rates;

    if (!rawRates || typeof rawRates !== "object") {
      throw new Error("Respuesta de Frankfurter sin tasas");
    }

    const rates = SUPPORTED_CURRENCIES.reduce((acc, code) => {
      if (code === "GYD") {
        // GYD nunca viene de Frankfurter — siempre el valor fijo de respaldo.
        acc[code] = FALLBACK_RATES.GYD;
        return acc;
      }

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
