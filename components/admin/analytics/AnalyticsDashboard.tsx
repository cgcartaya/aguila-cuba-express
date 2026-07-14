"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BarChart3, Eye, Users, MousePointerClick, CalendarDays, Monitor, Smartphone, Tablet } from "lucide-react";

type Summary = {
  rangeDays: number;
  totals: { visits: number; today: number; uniqueVisitors: number; sessions: number };
  daily: { date: string; count: number }[];
  topPages: { path: string; count: number }[];
  topProducts: { id: string; name: string; visits: number }[];
  sources: { name: string; count: number }[];
  devices: { name: string; count: number }[];
};

const SOURCE_LABELS: Record<string, string> = {
  direct: "Directo", google: "Google", facebook: "Facebook", instagram: "Instagram",
  whatsapp: "WhatsApp", tiktok: "TikTok", referral: "Otro sitio",
};

export default function AnalyticsDashboard({ storeId }: { storeId: string }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError("");
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) { setError("No se encontró una sesión activa."); setLoading(false); return; }

      const response = await fetch(`/api/analytics/summary?storeId=${encodeURIComponent(storeId)}&days=${days}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
      });
      const result = await response.json();
      if (!active) return;
      if (!response.ok) { setError(result.error || "No se pudieron cargar las estadísticas."); setData(null); }
      else setData(result);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [storeId, days]);

  const maxDaily = useMemo(() => Math.max(1, ...(data?.daily.map((item) => item.count) || [1])), [data]);

  if (loading) return <div className="rounded-3xl bg-white p-10 text-center font-bold text-slate-500 shadow-sm">Cargando estadísticas...</div>;
  if (error) return <div className="rounded-3xl bg-red-50 p-5 font-bold text-red-600">{error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {[7, 30, 90].map((value) => (
          <button key={value} onClick={() => setDays(value)} className={`rounded-full px-4 py-2 text-sm font-black ${days === value ? "bg-[#061b3a] text-white" : "bg-white text-slate-600 shadow-sm"}`}>
            {value} días
          </button>
        ))}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Visitas del período" value={data.totals.visits} icon={Eye} />
        <Metric label="Visitas hoy" value={data.totals.today} icon={CalendarDays} />
        <Metric label="Visitantes únicos" value={data.totals.uniqueVisitors} icon={Users} />
        <Metric label="Sesiones" value={data.totals.sessions} icon={MousePointerClick} />
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="mb-6 flex items-center gap-3"><BarChart3 /><div><h2 className="text-xl font-black">Visitas por día</h2><p className="text-sm font-semibold text-slate-500">Últimos {data.rangeDays} días</p></div></div>
        <div className="flex h-64 items-end gap-1 overflow-x-auto border-b border-slate-200 pb-2">
          {data.daily.map((item) => (
            <div key={item.date} className="group flex h-full min-w-[18px] flex-1 items-end" title={`${item.date}: ${item.count} visitas`}>
              <div className="w-full rounded-t-md bg-[#061b3a] transition hover:opacity-75" style={{ height: `${Math.max(item.count ? 5 : 1, (item.count / maxDaily) * 100)}%` }} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs font-bold text-slate-400"><span>{data.daily[0]?.date}</span><span>{data.daily.at(-1)?.date}</span></div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Ranking title="Productos más vistos" empty="Todavía no hay visitas a productos" rows={data.topProducts.map((x) => ({ label: x.name, value: x.visits }))} />
        <Ranking title="Páginas más visitadas" empty="Todavía no hay páginas registradas" rows={data.topPages.map((x) => ({ label: x.path, value: x.count }))} />
        <Ranking title="Fuentes de tráfico" empty="Todavía no hay fuentes registradas" rows={data.sources.map((x) => ({ label: SOURCE_LABELS[x.name] || x.name, value: x.count }))} />
        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-black">Dispositivos</h2>
          <div className="space-y-3">
            {data.devices.map((item) => {
              const Icon = item.name === "mobile" ? Smartphone : item.name === "tablet" ? Tablet : Monitor;
              return <div key={item.name} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"><div className="flex items-center gap-3 font-bold"><Icon size={20} />{item.name === "mobile" ? "Móvil" : item.name === "tablet" ? "Tableta" : "Computadora"}</div><span className="font-black">{item.count}</span></div>;
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100"><Icon size={24} /></div><p className="text-sm font-bold text-slate-500">{label}</p><p className="mt-1 text-3xl font-black">{value.toLocaleString("es-US")}</p></div>;
}

function Ranking({ title, rows, empty }: { title: string; rows: { label: string; value: number }[]; empty: string }) {
  return <div className="rounded-3xl bg-white p-5 shadow-sm"><h2 className="mb-4 text-xl font-black">{title}</h2>{rows.length === 0 ? <p className="text-sm font-semibold text-slate-500">{empty}</p> : <div className="space-y-2">{rows.map((row, index) => <div key={`${row.label}-${index}`} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4"><div className="min-w-0"><span className="mr-3 text-xs font-black text-slate-400">#{index + 1}</span><span className="break-all font-bold">{row.label}</span></div><span className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-black shadow-sm">{row.value}</span></div>)}</div>}</div>;
}
