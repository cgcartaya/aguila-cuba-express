"use client";

import { CURRENCIES, CURRENCY_LIST, useCurrency, type CurrencyCode } from "@/contexts/CurrencyContext";
import FlagIcon from "@/components/tienda/FlagIcon";

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
      <FlagIcon countryCode={CURRENCIES[currency].countryCode} size={20} className="shrink-0 rounded-[2px] object-cover shadow-sm" />

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
