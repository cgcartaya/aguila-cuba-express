"use client";

import { useEffect, useState } from 'react';
import { BarChart3, Eye, Globe2, Loader2, RefreshCw, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { LandingPeriod, LandingSummary } from '@/lib/analytics/landing-summary';

const periods: { value: LandingPeriod; label: string }[] = [
  { value: 'this_month', label: 'Este mes' }, { value: 'last_month', label: 'Mes pasado' },
  { value: '7d', label: '7 días' }, { value: '30d', label: '30 días' },
];
const integer = new Intl.NumberFormat('es-US');
function dateLabel(date: string) { return new Intl.DateTimeFormat('es-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)); }
export default function LandingAnalyticsPanel({ storeId }: { storeId: string }) {
  const [period, setPeriod] = useState<LandingPeriod>('this_month');
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: LandingSummary; error?: string } | null>(null);
  const key = `${storeId}:${period}:${revision}`;
  const data = result?.key === key ? result.data : null;
  const error = result?.key === key ? result.error : null;
  const loading = !data && !error;
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const { data: auth } = await supabase.auth.getSession();
        if (controller.signal.aborted) return;
        if (!auth.session?.access_token) throw new Error('Inicia sesión para ver las estadísticas.');
        const response = await fetch(`/api/analytics/landing?storeId=${encodeURIComponent(storeId)}&period=${period}`, { headers: { Authorization: `Bearer ${auth.session.access_token}` }, cache: 'no-store', signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar las estadísticas.');
        if (!controller.signal.aborted) setResult({ key, data: payload });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ key, error: error instanceof Error ? error.message : 'No se pudieron cargar las estadísticas.' });
      }
    }
    void load();
    return () => controller.abort();
  }, [storeId, period, key]);
  const max = Math.max(1, ...(data?.daily.map(day => day.visits) || []));
  return <section id="visitas-landing" aria-labelledby="landing-stats-title" className="mt-5 min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
      <div className="min-w-0"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-700"><Globe2 size={16} /> Página de inicio</p><h2 id="landing-stats-title" className="mt-1 text-xl font-black text-[#061b3a]">Visitas a la landing</h2><p className="mt-1 text-xs font-semibold text-slate-500">Solo la página principal; tienda, productos y rastreo se consultan por separado.</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-bold text-slate-600">Período <select aria-label="Período de visitas de la landing" value={period} onChange={event => setPeriod(event.target.value as LandingPeriod)} className="ml-2 min-h-11 max-w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-[#061b3a]">{periods.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <button type="button" onClick={() => setRevision(value => value + 1)} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-blue-700 disabled:opacity-50"><RefreshCw size={15} /> Actualizar</button>
      </div>
    </div>
    {loading ? <p role="status" className="flex min-h-48 items-center justify-center gap-2 text-sm font-semibold text-slate-500"><Loader2 size={20} className="animate-spin" /> Cargando visitas de la landing…</p> : error ? <p role="alert" className="mt-5 rounded-2xl bg-rose-50 p-5 text-sm font-bold text-rose-700">{error}</p> : data && <>
      <p className="mt-4 text-xs font-semibold text-slate-500">{dateLabel(data.startDate)} — {dateLabel(data.endDate)} · {data.timezone}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[
          { label: 'Sesiones de visita', value: data.totals.visits, detail: 'Visitas distintas durante el período', Icon: BarChart3, tone: 'bg-blue-50 text-blue-700' },
          { label: 'Visualizaciones registradas', value: data.totals.views, detail: 'Registros de vista de la página de inicio', Icon: Eye, tone: 'bg-violet-50 text-violet-700' },
          { label: 'Navegadores únicos', value: data.totals.visitors, detail: 'Identificadores de navegador distintos', Icon: Users, tone: 'bg-emerald-50 text-emerald-700' },
        ].map(({ label, value, detail, Icon, tone }) => <article key={label} className={`min-w-0 rounded-2xl p-4 ${tone}`}><div className="flex items-start justify-between gap-2"><p className="text-xs font-bold">{label}</p><Icon size={18} className="shrink-0" /></div><p className="mt-2 text-3xl font-black tabular-nums">{integer.format(value)}</p><p className="mt-1 text-[11px] font-semibold opacity-80">{detail}</p></article>)}
      </div>
      <div className="mt-6"><h3 className="text-sm font-black text-[#061b3a]">Sesiones de visita por día</h3><p className="mt-1 text-[11px] text-slate-500 md:hidden">Desliza el gráfico para ver todos los días.</p>
        {data.totals.views === 0 ? <p className="mt-3 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">No hay visitas registradas en este período.</p> : <div className="mt-3 overflow-x-auto pb-2"><div role="img" aria-label="Sesiones de visita diarias a la landing. Consulta los valores en Ver datos diarios." className="flex h-36 min-w-[580px] items-end gap-1 border-b border-slate-200 pt-4">
          {data.daily.map(day => <div key={day.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end" title={`${dateLabel(day.date)}: ${day.visits} sesiones`}><span className="text-[9px] font-bold text-slate-600">{day.visits || ''}</span><div className="w-full max-w-7 rounded-t bg-gradient-to-t from-blue-700 to-blue-400" style={{ height: `${day.visits / max * 75}%`, minHeight: day.visits ? 4 : 1 }} /><span className="mt-1 text-[9px] font-semibold text-slate-500">{day.date.slice(-2)}</span></div>)}
        </div></div>}
      </div>
      <details className="mt-4 rounded-xl border border-slate-200 p-3"><summary className="cursor-pointer text-xs font-bold text-blue-700">Ver datos diarios</summary><div className="mt-3 max-h-64 overflow-auto"><table className="w-full text-left text-xs"><caption className="sr-only">Detalle diario de visitas de la landing</caption><thead className="text-slate-500"><tr><th className="p-2">Fecha</th><th className="p-2">Sesiones</th><th className="p-2">Vistas</th><th className="p-2">Navegadores</th></tr></thead><tbody>{data.daily.map(day => <tr key={day.date} className="border-t border-slate-100"><th className="p-2 font-semibold">{day.date.slice(8)}/{day.date.slice(5, 7)}</th><td className="p-2">{day.visits}</td><td className="p-2">{day.views}</td><td className="p-2">{day.visitors}</td></tr>)}</tbody></table></div></details>
      <p className="mt-4 text-[11px] leading-5 text-slate-500">Los registros pueden incluir accesos internos y pruebas. Un navegador único no equivale necesariamente a una persona.</p><details className="mt-2 text-[11px] leading-5 text-slate-500"><summary className="cursor-pointer font-semibold text-blue-700">Cómo se cuentan</summary><p className="mt-1">Las sesiones y navegadores del período se cuentan sin repetir; no son la suma de los valores diarios. Las recargas dentro de una sesión pueden no generar otra visualización.</p></details>
      <p className="mt-1 text-[11px] font-semibold text-slate-400">Consultado: {new Intl.DateTimeFormat('es-US', { dateStyle: 'short', timeStyle: 'short', timeZone: data.timezone }).format(new Date(data.updatedAt))}. Actualiza para consultar nuevos registros.</p>
    </>}
  </section>;
}
