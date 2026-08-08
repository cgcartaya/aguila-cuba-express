"use client";

/* =========================================================
   COMISIÓN DE PLATAFORMA — VISTA DEL DUEÑO DE TIENDA

   Solo lectura. Aquí el dueño de la tienda ve cuánto lleva
   acumulado de comisión (desde la última vez que Perla registró
   un pago) y el historial de periodos ya liquidados. El corte del
   periodo y el registro del pago los hace Perla desde su panel,
   no se hace desde aquí.
========================================================= */

import { useEffect, useState } from "react";
import { Loader2, Wallet } from "lucide-react";

import { useAdminAccess } from "@/hooks/useAdminAccess";
import {
  getPendingPlatformFee,
  getPlatformFeeSettlementHistory,
  type PendingPlatformFee,
  type PlatformFeeSettlement,
} from "@/lib/services/platform-fee-settlements";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ComisionPage() {
  const { store, loading: accessLoading } = useAdminAccess();

  const [pending, setPending] = useState<PendingPlatformFee | null>(null);
  const [history, setHistory] = useState<PlatformFeeSettlement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!store?.id) return;

    setLoading(true);

    Promise.all([
      getPendingPlatformFee(store.id),
      getPlatformFeeSettlementHistory(store.id),
    ]).then(([pendingData, historyData]) => {
      setPending(pendingData);
      setHistory(historyData);
      setLoading(false);
    });
  }, [store?.id]);

  if (accessLoading || loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  if (!store?.platform_fee_enabled) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-black text-[#061b3a]">
          Comisión de plataforma
        </h1>
        <p className="mt-3 text-slate-500">
          Esta tienda no tiene una comisión de plataforma activa por ahora.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-black text-[#061b3a]">
        Comisión de plataforma
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Este es el monto acumulado que corresponde a la plataforma sobre
        tus ventas. No se descuenta de tus ventas automáticamente — es un
        saldo a transferir aparte.
      </p>

      <div className="mt-6 rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <Wallet size={22} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">
              Pendiente por transferir
            </p>
            <p className="text-3xl font-black text-[#061b3a]">
              ${(pending?.feeAmount ?? 0).toFixed(2)}
            </p>
          </div>
        </div>

        <p className="mt-4 text-xs font-semibold text-slate-400">
          Desde{" "}
          {pending?.periodStart
            ? formatDate(pending.periodStart)
            : "el inicio de la tienda"}{" "}
          hasta hoy · {pending?.ordersCount ?? 0} órdenes · $
          {(pending?.salesAmount ?? 0).toFixed(2)} en ventas
        </p>
      </div>

      <h2 className="mt-8 mb-3 text-lg font-black text-[#061b3a]">
        Historial de pagos
      </h2>

      {history.length === 0 ? (
        <p className="text-sm text-slate-400">
          Todavía no hay ningún periodo liquidado.
        </p>
      ) : (
        <div className="space-y-2">
          {history.map((settlement) => (
            <div
              key={settlement.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm"
            >
              <div>
                <p className="font-bold text-slate-700">
                  {formatDate(settlement.period_start)} –{" "}
                  {formatDate(settlement.period_end)}
                </p>
                <p className="text-xs text-slate-400">
                  ${settlement.sales_amount.toFixed(2)} en ventas
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-black text-[#061b3a]">
                  ${settlement.fee_amount.toFixed(2)}
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">
                  PAGADO
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
