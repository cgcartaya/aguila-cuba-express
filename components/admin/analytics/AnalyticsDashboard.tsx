"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, DollarSign, Eye, Loader2, Receipt, ShoppingCart, TrendingUp } from "lucide-react";

import { supabase } from "@/lib/supabase";

type Summary = {
  totals: { visits: number; orders: number; revenue: number; conversionRate: number };
  comparison: { visits: number; orders: number; revenue: number };
  funnel: Array<{ name: string; value: number }>;
  products: Array<{ id: string; name: string; type: string; visits: number; adds: number; addRate: number }>;
  campaigns: Array<{ name: string; visits: number; orders: number }>;
  daily: Array<{ date: string; visits: number; orders: number }>;
  truncated?: boolean;
};

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const integer = new Intl.NumberFormat("es-US");

function Metric({ label, value, change, icon: Icon, tone }: {
  label: string;
  value: string;
  change?: number;
  icon: typeof Eye;
  tone: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-black text-[#061b3a]">{value}</p>
          {change !== undefined && (
            <p className={`mt-2 text-xs font-black ${change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {change >= 0 ? "+" : ""}{change.toFixed(1)}% vs. período anterior
            </p>
          )}
        </div>
        <span className={`grid h-12 w-12 place-items-center rounded-2xl ${tone}`}><Icon size={23} /></span>
      </div>
    </article>
  );
}

export default function AnalyticsDashboard({ storeId }: { storeId: string }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(`/api/analytics/summary?storeId=${encodeURIComponent(storeId)}&days=${days}`, {
        headers: { Authorization: `Bearer ${sessionData.session?.access_token || ""}` },
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));
      if (!active) return;
      if (!response.ok) setError(result.error || "No se pudo cargar la analítica.");
      else setData(result as Summary);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [days, storeId]);

  const chart = useMemo(() => data?.daily.slice(days === 7 ? -7 : -14) || [], [data?.daily, days]);
  const maxVisits = Math.max(1, ...chart.map((item) => item.visits));
  const funnelBase = data?.funnel[0]?.value || 1;

  if (loading) return <div className="grid min-h-80 place-items-center rounded-3xl bg-white"><Loader2 className="animate-spin text-blue-700" size={36} /></div>;
  if (error) return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center font-bold text-rose-700">{error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {[7, 30, 90].map((period) => (
          <button key={period} type="button" onClick={() => setDays(period)} className={`rounded-full px-4 py-2 text-sm font-black transition ${days === period ? "bg-[#061b3a] text-white" : "border border-slate-200 bg-white text-slate-600"}`}>
            {period} días
          </button>
        ))}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Visitas únicas" value={integer.format(data.totals.visits)} change={data.comparison.visits} icon={Eye} tone="bg-blue-50 text-blue-700" />
        <Metric label="Órdenes" value={integer.format(data.totals.orders)} change={data.comparison.orders} icon={Receipt} tone="bg-violet-50 text-violet-700" />
        <Metric label="Conversión" value={`${data.totals.conversionRate.toFixed(2)}%`} icon={TrendingUp} tone="bg-emerald-50 text-emerald-700" />
        <Metric label="Ingresos" value={money.format(data.totals.revenue)} change={data.comparison.revenue} icon={DollarSign} tone="bg-amber-50 text-amber-700" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-6 flex items-center justify-between"><div><h2 className="text-xl font-black text-[#061b3a]">Visitas recientes</h2><p className="text-xs font-semibold text-slate-400">Últimos {chart.length} días del período</p></div><BarChart3 className="text-blue-600" /></div>
          <div className="flex h-60 items-end gap-2 border-b border-slate-200">
            {chart.map((item) => (
              <div key={item.date} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                <span className="mb-1 text-[9px] font-black text-slate-500 opacity-0 group-hover:opacity-100">{item.visits}</span>
                <div className="w-full max-w-10 rounded-t-lg bg-gradient-to-t from-blue-700 to-blue-400" style={{ height: `${Math.max(item.visits ? 5 : 1, item.visits / maxVisits * 82)}%` }} />
                <span className="mt-2 text-[8px] font-bold text-slate-400">{item.date.slice(5).replace("-", "/")}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-xl font-black text-[#061b3a]">Embudo de compra</h2>
          <p className="mb-5 text-xs font-semibold text-slate-400">Sesiones que alcanzaron cada etapa</p>
          <div className="space-y-4">
            {data.funnel.map((item) => {
              const percent = item.value / funnelBase * 100;
              return <div key={item.name}><div className="mb-1 flex justify-between gap-3 text-xs font-black text-slate-600"><span>{item.name}</span><span>{integer.format(item.value)} · {percent.toFixed(1)}%</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-[#061b3a] to-blue-500" style={{ width: `${Math.max(item.value ? 3 : 0, percent)}%` }} /></div></div>;
            })}
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5"><h2 className="text-xl font-black text-[#061b3a]">Productos y platos</h2><p className="text-xs font-semibold text-slate-400">Interés y conversión al carrito</p></div>
          {data.products.length === 0 ? <p className="p-8 text-center text-sm font-bold text-slate-400">Todavía no hay interacción con productos.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="p-4">Elemento</th><th className="p-4">Vistas</th><th className="p-4">Carritos</th><th className="p-4">Tasa</th></tr></thead><tbody>{data.products.map((item) => <tr key={`${item.type}:${item.id}`} className="border-t border-slate-100"><td className="max-w-64 truncate p-4 font-black text-slate-700">{item.name}</td><td className="p-4 font-bold">{item.visits}</td><td className="p-4 font-bold">{item.adds}</td><td className="p-4 font-black text-blue-700">{item.addRate.toFixed(1)}%</td></tr>)}</tbody></table></div>}
        </article>

        <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5"><h2 className="text-xl font-black text-[#061b3a]">Campañas UTM</h2><p className="text-xs font-semibold text-slate-400">Visitas y órdenes atribuidas</p></div>
          {data.campaigns.length === 0 ? <div className="grid min-h-52 place-items-center p-8 text-center"><div><ShoppingCart className="mx-auto mb-3 text-slate-300" size={34} /><p className="text-sm font-bold text-slate-400">No hay campañas UTM en este período.</p></div></div> : <div className="divide-y divide-slate-100">{data.campaigns.map((item) => <div key={item.name} className="flex items-center justify-between gap-4 p-4"><div className="min-w-0"><p className="truncate font-black text-slate-700">{item.name}</p><p className="text-xs font-semibold text-slate-400">{item.visits} visitas</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{item.orders} órdenes</span></div>)}</div>}
        </article>
      </section>

      {data.truncated && <p className="rounded-2xl bg-amber-50 p-4 text-xs font-bold text-amber-800">El período contiene más de 10,000 eventos; el resumen muestra los más recientes.</p>}
    </div>
  );
}
