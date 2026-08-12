"use client";

import { useCurrency } from "@/contexts/CurrencyContext";

type PriceProps = {
  /** Monto base, siempre en USD (así se maneja internamente en toda la tienda). */
  usd: number;
  className?: string;
  /**
   * Si es true, agrega debajo/al lado una referencia chiquita en USD
   * (ej. "≈ $49.00 USD"). Útil en totales de checkout, donde conviene
   * dejar claro que el cobro real es en dólares.
   */
  showUsdReference?: boolean;
};

export default function Price({ usd, className, showUsdReference = false }: PriceProps) {
  const { format, currency } = useCurrency();

  return (
    <>
      <span className={className}>{format(usd)}</span>
      {showUsdReference && currency !== "USD" && (
        <span className="ml-1 text-[0.72em] font-semibold text-slate-400">
          (≈ ${usd.toFixed(2)} USD)
        </span>
      )}
    </>
  );
}
