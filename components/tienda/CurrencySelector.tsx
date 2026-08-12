"use client";

import { Coins } from "lucide-react";

import { CURRENCIES, CURRENCY_LIST, useCurrency, type CurrencyCode } from "@/contexts/CurrencyContext";

type CurrencySelectorProps = {
  className?: string;
};

export default function CurrencySelector({ className }: CurrencySelectorProps) {
  const { currency, setCurrency } = useCurrency();

  return (
    <label
      className={
        className ??
        "flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
      }
    >
      <Coins size={16} className="shrink-0 text-slate-400" />

      <select
        value={currency}
        onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
        aria-label="Moneda"
        className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-700 outline-none"
      >
        {CURRENCY_LIST.map((code) => (
          <option key={code} value={code}>
            {CURRENCIES[code].label}
          </option>
        ))}
      </select>
    </label>
  );
}
