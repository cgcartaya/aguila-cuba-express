"use client";

import { useEffect, useState } from "react";
import { CalendarRange, Loader2, ShoppingBag, TrendingDown, TrendingUp } from "lucide-react";
import {
  getOrderPeriodSummary,
  type OrderPeriodStat,
  type OrderPeriodSummary,
} from "@/lib/services/business-analytics";

function percentChange(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function StatCard({
  title,
  data,
  compare,
}: {
  title: string;
  data: OrderPeriodStat;
  compare?: OrderPeriodStat;
}) {
  const delta = compare ? percentChange(data.orders, compare.orders) : null;
  const positive = (delta || 0) >= 0;

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{title}</p>
          <p className="mt-1 text-3xl font-black tabular-nums text-[#061b3a]">{data.orders}</p>
          <p className="text-xs font-bold text-slate-400">órdenes</p>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700">
          <ShoppingBag size={19} />
        </span>
      </div>

      <p className="mt-4 text-sm font-black text-slate-700">
        ${data.sales.toFixed(2)}
        <span className="ml-1 font-semibold text-slate-400">facturado</span>
      </p>

      {delta !== null && (
        <p className={`mt-2 flex items-center gap-1 text-xs font-black ${positive ? "text-emerald-600" : "text-rose-600"}`}>
          {positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {delta > 0 ? "+" : ""}{delta.toFixed(1)}% vs período anterior
        </p>
      )}
    </article>
  );
}

export default function OrderPeriodStats({ storeId }: { storeId: string }) {
  const [data, setData] = useState<OrderPeriodSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const result = await getOrderPeriodSummary(storeId);
        if (mounted) setData(result);
      } catch (error) {
        console.error("Error cargando estadísticas de órdenes:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => { mounted = false; };
  }, [storeId]);

  if (loading) {
    return (
      <div className="mb-6 flex h-24 items-center justify-center rounded-3xl bg-white shadow-sm">
        <Loader2 className="animate-spin text-blue-700" size={24} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <CalendarRange size={19} className="text-blue-700" />
        <div>
          <h2 className="font-black text-[#061b3a]">Ritmo de ventas</h2>
          <p className="text-xs font-semibold text-slate-400">Órdenes y facturación reales por período.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard title="Hoy" data={data.today} />
        <StatCard title="Esta semana" data={data.week} compare={data.previousWeek} />
        <StatCard title="Este mes" data={data.month} compare={data.previousMonth} />
      </div>
    </section>
  );
}
