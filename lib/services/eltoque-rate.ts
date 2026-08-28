import "server-only";

export type ElToqueRateResult = {
  rate: number;
  sourceUrl: string;
  fetchedAt: string;
};

const DEFAULT_ELTOQUE_URL = "https://tasas.eltoque.com/v1/trmi";
const MIN_REASONABLE_RATE = 100;
const MAX_REASONABLE_RATE = 5000;

function asPositiveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function isUsdLabel(value: unknown) {
  if (typeof value !== "string") return false;
  return /(^|\b)(usd|dolar|dólar)(\b|$)/i.test(value.trim());
}

function extractFromObject(obj: Record<string, unknown>): number | null {
  const directUsd = obj.USD ?? obj.usd;
  if (directUsd !== undefined) {
    const direct = asPositiveNumber(directUsd);
    if (direct) return direct;

    if (directUsd && typeof directUsd === "object" && !Array.isArray(directUsd)) {
      const nested = directUsd as Record<string, unknown>;
      for (const key of ["rate", "value", "median", "mid", "venta", "sell", "price"]) {
        const candidate = asPositiveNumber(nested[key]);
        if (candidate) return candidate;
      }
    }
  }

  const labels = [obj.currency, obj.moneda, obj.code, obj.symbol, obj.name, obj.nombre];
  if (labels.some(isUsdLabel)) {
    for (const key of ["rate", "value", "median", "mid", "venta", "sell", "price", "tasa"]) {
      const candidate = asPositiveNumber(obj[key]);
      if (candidate) return candidate;
    }
  }

  return null;
}

function extractUsdRate(payload: unknown, depth = 0): number | null {
  if (depth > 5 || payload == null) return null;

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const candidate = extractUsdRate(item, depth + 1);
      if (candidate) return candidate;
    }
    return null;
  }

  if (typeof payload !== "object") return null;

  const obj = payload as Record<string, unknown>;
  const direct = extractFromObject(obj);
  if (direct) return direct;

  for (const key of ["data", "rates", "trmi", "result", "results", "currencies", "values"]) {
    if (obj[key] !== undefined) {
      const candidate = extractUsdRate(obj[key], depth + 1);
      if (candidate) return candidate;
    }
  }

  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      const candidate = extractUsdRate(value, depth + 1);
      if (candidate) return candidate;
    }
  }

  return null;
}

export async function fetchElToqueUsdCupRate(): Promise<ElToqueRateResult> {
  const sourceUrl = process.env.ELTOQUE_API_URL || DEFAULT_ELTOQUE_URL;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "PerlaMarketplace/1.0 (+https://perlamarketplace.com)",
  };

  if (process.env.ELTOQUE_API_TOKEN) {
    headers.Authorization = `Bearer ${process.env.ELTOQUE_API_TOKEN}`;
  }

  const response = await fetch(sourceUrl, {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`elTOQUE respondió ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("elTOQUE no devolvió JSON; no se reemplazó la última tasa válida");
  }

  const payload = await response.json();
  const rate = extractUsdRate(payload);

  if (!rate) {
    throw new Error("No se encontró una tasa USD/CUP reconocible en la respuesta de elTOQUE");
  }

  if (rate < MIN_REASONABLE_RATE || rate > MAX_REASONABLE_RATE) {
    throw new Error(`Tasa de elTOQUE fuera de rango de seguridad: ${rate}`);
  }

  return {
    rate,
    sourceUrl,
    fetchedAt: new Date().toISOString(),
  };
}
