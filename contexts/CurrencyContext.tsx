"use client";

/* =========================================================
   CURRENCY CONTEXT
   ---------------------------------------------------------
   Muestra los precios de la tienda convertidos a la moneda
   del visitante. NO cambia cómo se cobra: Stripe siempre
   cobra en USD (ver app/api/checkout/pay-with-card/route.ts),
   esto es solo para que el cliente vea un valor de referencia
   en su moneda.

   - Detecta automático por idioma/zona horaria del navegador
     la primera vez que entra.
   - Si el usuario elige otra moneda manualmente, esa elección
     se guarda en localStorage y ya no se vuelve a autodetectar.
========================================================= */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { SUPPORTED_CURRENCIES, type SupportedCurrency } from "@/lib/services/exchange-rates";

export type CurrencyCode = "USD" | SupportedCurrency;

export const CURRENCY_LIST: CurrencyCode[] = ["USD", ...SUPPORTED_CURRENCIES];

export const CURRENCIES: Record<CurrencyCode, { locale: string; label: string; symbol: string }> = {
  USD: { locale: "en-US", label: "Dólar estadounidense (USD)", symbol: "$" },
  EUR: { locale: "es-ES", label: "Euro (EUR)", symbol: "€" },
  MXN: { locale: "es-MX", label: "Peso mexicano (MXN)", symbol: "$" },
  GBP: { locale: "en-GB", label: "Libra esterlina (GBP)", symbol: "£" },
  CAD: { locale: "en-CA", label: "Dólar canadiense (CAD)", symbol: "$" },
};

// Se usan mientras cargan las tasas reales del API, o si el fetch falla.
const FALLBACK_RATES: Record<SupportedCurrency, number> = {
  EUR: 0.92,
  MXN: 18.5,
  GBP: 0.79,
  CAD: 1.38,
};

const STORAGE_KEY = "tienda_currency";

function detectCurrencyFromBrowser(): CurrencyCode {
  if (typeof navigator === "undefined") return "USD";

  const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];

  for (const raw of langs) {
    const lang = (raw || "").toLowerCase();
    if (lang === "es-mx") return "MXN";
    if (lang === "es-es") return "EUR";
    if (lang.startsWith("en-gb")) return "GBP";
    if (lang.startsWith("en-ca") || lang.startsWith("fr-ca")) return "CAD";
  }

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";

    if (tz === "Europe/London") return "GBP";
    if (tz.startsWith("Europe/")) return "EUR";

    if (tz.startsWith("America/") && /mexico|tijuana|cancun|merida|monterrey/i.test(tz)) {
      return "MXN";
    }

    if (
      tz.startsWith("America/") &&
      ["Toronto", "Vancouver", "Winnipeg", "Edmonton", "Halifax", "Montreal", "Ottawa"].some((city) =>
        tz.includes(city)
      )
    ) {
      return "CAD";
    }
  } catch {
    // Intl no disponible por alguna razón — nos quedamos en USD.
  }

  return "USD";
}

type CurrencyContextValue = {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  ratesLoaded: boolean;
  /** Convierte un monto en USD a la moneda seleccionada (número crudo). */
  convert: (usdAmount: number) => number;
  /** Convierte y formatea un monto en USD como texto en la moneda seleccionada. */
  format: (usdAmount: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("USD");
  const [rates, setRates] = useState<Record<SupportedCurrency, number>>(FALLBACK_RATES);
  const [ratesLoaded, setRatesLoaded] = useState(false);

  // Elección guardada o detección automática al montar.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
      if (saved && CURRENCY_LIST.includes(saved)) {
        setCurrencyState(saved);
        return;
      }
    } catch {
      // localStorage no disponible (modo privado, etc.) — seguimos con autodetección.
    }

    setCurrencyState(detectCurrencyFromBrowser());
  }, []);

  // Tasas de cambio en vivo.
  useEffect(() => {
    let active = true;

    fetch("/api/exchange-rates")
      .then((res) => res.json())
      .then((data) => {
        if (!active || !data?.rates) return;
        setRates(data.rates);
        setRatesLoaded(true);
      })
      .catch(() => {
        // Nos quedamos con FALLBACK_RATES, que ya está en el estado inicial.
        if (active) setRatesLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // si no se puede guardar, la elección solo dura esta sesión
    }
  }, []);

  const convert = useCallback(
    (usdAmount: number) => {
      if (currency === "USD") return usdAmount;
      const rate = rates[currency as SupportedCurrency] ?? FALLBACK_RATES[currency as SupportedCurrency];
      return usdAmount * rate;
    },
    [currency, rates]
  );

  const format = useCallback(
    (usdAmount: number) => {
      const converted = convert(usdAmount);
      const { locale } = CURRENCIES[currency];

      try {
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency,
          maximumFractionDigits: 2,
        }).format(converted);
      } catch {
        return `${CURRENCIES[currency].symbol}${converted.toFixed(2)}`;
      }
    },
    [currency, convert]
  );

  const value = useMemo(
    () => ({ currency, setCurrency, ratesLoaded, convert, format }),
    [currency, setCurrency, ratesLoaded, convert, format]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency debe usarse dentro de <CurrencyProvider>");
  }
  return ctx;
}
