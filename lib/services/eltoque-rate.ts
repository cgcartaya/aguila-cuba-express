import "server-only";

export type ElToqueCurrency = "USD" | "EUR";
export type ElToqueRateResult = {
  rate: number;
  currency: ElToqueCurrency;
  sourceUrl: string;
  fetchedAt: string;
};

const DEFAULT_ELTOQUE_URL = "https://tasas.eltoque.com/v1/trmi";
const MIN_REASONABLE_RATE = 50;
const MAX_REASONABLE_RATE = 5000;

function asPositiveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function isCurrencyLabel(value: unknown, currency: ElToqueCurrency) {
  if (typeof value !== "string") return false;
  const text = value.trim();
  if (currency === "USD") return /(^|\b)(usd|dolar|dólar)(\b|$)/i.test(text);
  return /(^|\b)(eur|euro)(\b|$)/i.test(text);
}

function extractFromObject(obj: Record<string, unknown>, currency: ElToqueCurrency): number | null {
  const directCurrency = obj[currency] ?? obj[currency.toLowerCase()];
  if (directCurrency !== undefined) {
    const direct = asPositiveNumber(directCurrency);
    if (direct) return direct;
    if (directCurrency && typeof directCurrency === "object" && !Array.isArray(directCurrency)) {
      const nested = directCurrency as Record<string, unknown>;
      for (const key of ["rate", "value", "median", "mid", "venta", "sell", "price", "tasa"]) {
        const candidate = asPositiveNumber(nested[key]);
        if (candidate) return candidate;
      }
    }
  }

  const labels = [obj.currency, obj.moneda, obj.code, obj.symbol, obj.name, obj.nombre];
  if (labels.some((label) => isCurrencyLabel(label, currency))) {
    for (const key of ["rate", "value", "median", "mid", "venta", "sell", "price", "tasa"]) {
      const candidate = asPositiveNumber(obj[key]);
      if (candidate) return candidate;
    }
  }
  return null;
}

function extractRate(payload: unknown, currency: ElToqueCurrency, depth = 0): number | null {
  if (depth > 5 || payload == null) return null;
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const candidate = extractRate(item, currency, depth + 1);
      if (candidate) return candidate;
    }
    return null;
  }
  if (typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  const direct = extractFromObject(obj, currency);
  if (direct) return direct;
  for (const key of ["data", "rates", "trmi", "result", "results", "currencies", "values"]) {
    if (obj[key] !== undefined) {
      const candidate = extractRate(obj[key], currency, depth + 1);
      if (candidate) return candidate;
    }
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      const candidate = extractRate(value, currency, depth + 1);
      if (candidate) return candidate;
    }
  }
  return null;
}

async function fetchPayload() {
  const sourceUrl = process.env.ELTOQUE_API_URL || DEFAULT_ELTOQUE_URL;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "PerlaMarketplace/1.0 (+https://perlamarketplace.com)",
  };
  if (process.env.ELTOQUE_API_TOKEN) headers.Authorization = `Bearer ${process.env.ELTOQUE_API_TOKEN}`;
  const response = await fetch(sourceUrl, { headers, cache: "no-store", signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`elTOQUE respondió ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) throw new Error("elTOQUE no devolvió JSON; se conservaron las últimas tasas válidas");
  return { payload: await response.json(), sourceUrl, fetchedAt: new Date().toISOString() };
}

function validateRate(rate: number | null, currency: ElToqueCurrency) {
  if (!rate) throw new Error(`No se encontró una tasa ${currency}/CUP reconocible en la respuesta de elTOQUE`);
  if (rate < MIN_REASONABLE_RATE || rate > MAX_REASONABLE_RATE) throw new Error(`Tasa ${currency} de elTOQUE fuera de rango de seguridad: ${rate}`);
  return rate;
}

export async function fetchElToqueRates(): Promise<Record<ElToqueCurrency, ElToqueRateResult>> {
  const { payload, sourceUrl, fetchedAt } = await fetchPayload();
  const usd = validateRate(extractRate(payload, "USD"), "USD");
  const eur = validateRate(extractRate(payload, "EUR"), "EUR");
  return {
    USD: { rate: usd, currency: "USD", sourceUrl, fetchedAt },
    EUR: { rate: eur, currency: "EUR", sourceUrl, fetchedAt },
  };
}

export async function fetchElToqueUsdCupRate(): Promise<ElToqueRateResult> {
  const { payload, sourceUrl, fetchedAt } = await fetchPayload();
  return { rate: validateRate(extractRate(payload, "USD"), "USD"), currency: "USD", sourceUrl, fetchedAt };
}

export async function fetchElToqueEurCupRate(): Promise<ElToqueRateResult> {
  const { payload, sourceUrl, fetchedAt } = await fetchPayload();
  return { rate: validateRate(extractRate(payload, "EUR"), "EUR"), currency: "EUR", sourceUrl, fetchedAt };
}
