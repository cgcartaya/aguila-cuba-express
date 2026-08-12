"use client";

import { useState } from "react";

import { CURRENCIES, CURRENCY_LIST, useCurrency, type CurrencyCode } from "@/contexts/CurrencyContext";
import FlagIcon from "@/components/tienda/FlagIcon";

type CurrencyFlagSelectorProps = {
  className?: string;
};

export default function CurrencyFlagSelector({ className }: CurrencyFlagSelectorProps) {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Cambiar moneda"
        aria-expanded={open}
        className={
          className ??
          "flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 shadow-sm backdrop-blur transition active:scale-95 sm:h-[46px] sm:w-[46px]"
        }
      >
        <FlagIcon countryCode={CURRENCIES[currency].countryCode} size={22} />
      </button>

      {open && (
        <>
          {/* Capa invisible para cerrar el desplegable al tocar fuera */}
          <button
            type="button"
            aria-label="Cerrar selector de moneda"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[80] cursor-default"
          />

          <div className="absolute right-0 top-full z-[90] mt-2 w-48 overflow-hidden rounded-2xl bg-white py-1 shadow-xl ring-1 ring-black/5">
            {CURRENCY_LIST.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setCurrency(code);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-bold transition hover:bg-slate-50 ${
                  code === currency ? "bg-slate-50 text-[#061b3a]" : "text-slate-600"
                }`}
              >
                <FlagIcon countryCode={CURRENCIES[code].countryCode} size={20} />
                {code}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
