"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { canAccessAdminPath } from "@/lib/admin/navigation-access";
import { supabase } from "@/lib/supabase";

type Entry = { label: string; count: number; cents: number };
type Statistics = {
  count: number; billed: number; paid: number; due: number; openCount: number;
  unrecorded: number; unrecordedCount: number;
  services: Entry[]; methods: Entry[]; debts: Entry[]; monthly: Entry[];
};

const money = new Intl.NumberFormat("es-US", { style: "currency", currency: "USD" });
const usd = (cents: number) => money.format(cents / 100);
const serviceLabels: Record<string, string> = {
  shipment: "Envíos", product: "Tienda física", customs: "Cargos aduanales",
  passport: "Pasaportes", remittance: "Remesas externas", other: "Otros servicios",
};
const panel = "rounded-2xl border border-slate-200 bg-white p-4 sm:p-5";

export default function LuxuryFolioStatisticsPage() {
  const { access, store, isSuperAdmin, loading } = useAdminAccess();
  const { store: selected, loading: storeLoading } = useStore();
  const agency = isSuperAdmin ? selected || store : store;

  if (loading || storeLoading) return <p className="p-6" role="status">Cargando agencia…</p>;
  if (agency?.slug !== "luxury-travel-point" || !agency.module_shipping_enabled
    || !canAccessAdminPath("/admin/folios/estadisticas", access?.storeMembership ?? null, isSuperAdmin)) {
    return <p className="p-6">Estadísticas no está disponible para esta agencia o tu usuario.</p>;
  }
  return <StatisticsReport key={agency.id} storeId={agency.id} />;
}

function StatisticsReport({ storeId }: { storeId: string }) {
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [range, setRange] = useState({ from: "", until: "" });
  const [result, setResult] = useState<Statistics | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void supabase.rpc("get_luxury_folio_statistics", {
      p_store: storeId, p_from: range.from || null, p_until: range.until || null,
    }).then(({ data, error: cause }) => {
      if (!active) return;
      setResult(cause ? null : data as Statistics);
      setError(cause?.message ?? "");
      setLoading(false);
    }, () => {
      if (!active) return;
      setResult(null);
      setError("No se pudo cargar el informe.");
      setLoading(false);
    });
    return () => { active = false; };
  }, [storeId, range]);

  function apply(nextFrom: string, nextUntil: string) {
    setLoading(true);
    setError("");
    setRange({ from: nextFrom, until: nextUntil });
  }

  return <main className="mx-auto max-w-6xl space-y-5 p-4 pb-24 sm:p-6">
    <header className="flex flex-wrap items-center gap-4">
      <Image src="/luxury/footer-logo-transparent.webp" alt="Luxury Travel Point" width={1008} height={659}
        className="h-20 w-auto object-contain" />
      <div>
      <h1 className="text-3xl font-black text-[#061b3a]">Estadísticas de folios</h1>
      <p className="mt-1 text-sm text-slate-600">Cobros registrados en Folios. El período se basa en la fecha de emisión de la factura.</p>
      </div>
    </header>
    <form className={panel + " flex flex-wrap items-end gap-3"} onSubmit={event => { event.preventDefault(); apply(from, until); }}>
      <label className="text-sm font-bold">Desde
        <input className="mt-1 block rounded-xl border border-slate-300 p-2.5" type="date" value={from}
          max={until || undefined} onChange={event => setFrom(event.target.value)} />
      </label>
      <label className="text-sm font-bold">Hasta
        <input className="mt-1 block rounded-xl border border-slate-300 p-2.5" type="date" value={until}
          min={from || undefined} onChange={event => setUntil(event.target.value)} />
      </label>
      <button disabled={loading} className="rounded-xl bg-[#061b3a] px-4 py-2.5 font-bold text-white disabled:opacity-50">Filtrar</button>
      <button type="button" disabled={loading} className="rounded-xl border px-4 py-2.5 font-bold disabled:opacity-50"
        onClick={() => { setFrom(""); setUntil(""); apply("", ""); }}>Todo el historial</button>
    </form>
    {loading ? <p role="status">Cargando estadísticas…</p> : error ? <p role="alert" className="text-red-700">{error}</p> : result && <>
      <dl className="grid grid-cols-1 divide-y divide-white/15 rounded-2xl border border-amber-600 bg-[#061b3a] text-white sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
        {[
          ["Facturado", usd(result.billed), result.count + " folios"],
          ["Cobrado", usd(result.paid), "Pagos registrados"],
          ["Por cobrar", usd(result.due), result.openCount + " folios con saldo"],
          ["Sin registro de pago", usd(result.unrecorded), result.unrecordedCount + " folios"],
        ].map(([label, value, note]) => <div key={label} className="min-w-0 px-5 py-5">
          <dt className="text-sm font-bold text-amber-100">{label}</dt>
          <dd className="mt-1 text-2xl font-black tabular-nums">{value}</dd>
          <dd className="mt-1 text-xs text-slate-300">{note}</dd>
        </div>)}
      </dl>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <ServiceBars entries={result.services} total={result.billed} />
        <div className="grid min-w-0 gap-4">
          <PaymentChart entries={result.methods} total={result.paid} />
          <ReportTable title="Cuentas por cobrar" label="Cliente" countLabel="Folios" amountLabel="Por cobrar"
            entries={result.debts} emptyMessage="Sin saldos pendientes." />
        </div>
      </div>
      <ReportTable title="Cobros por mes de emisión" label="Mes" countLabel="Folios" amountLabel="Cobrado" entries={result.monthly} />
    </>}
  </main>;
}

function ReportTable({ title, label, countLabel, amountLabel, entries, emptyMessage = "No hay datos en este período." }: {
  title: string; label: string; countLabel: string; amountLabel: string; entries: Entry[]; emptyMessage?: string;
}) {
  return <section className={panel + " min-w-0"}>
    <h2 className="text-lg font-black text-[#061b3a]">{title}</h2>
    {entries.length === 0 ? <p className="mt-3 text-sm text-slate-600">{emptyMessage}</p> : <div className="overflow-x-auto">
      <table className="mt-3 w-full text-left text-sm">
        <caption className="sr-only">{title}</caption>
        <thead className="border-b border-slate-200 text-slate-600"><tr>
          <th scope="col" className="py-2 pr-2">{label}</th>
          <th scope="col" className="px-2 py-2 text-right">{countLabel}</th>
          <th scope="col" className="py-2 text-right">{amountLabel}</th>
        </tr></thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((entry, index) => <tr key={entry.label + index}>
            <th scope="row" className="py-3 pr-2 font-semibold">{entry.label}</th>
            <td className="px-2 py-3 text-right tabular-nums">{entry.count}</td>
            <td className="whitespace-nowrap py-3 text-right font-bold tabular-nums">{usd(entry.cents)}</td>
          </tr>)}
        </tbody>
      </table>
    </div>}
  </section>;
}

function ServiceBars({ entries, total }: { entries: Entry[]; total: number }) {
  const maximum = Math.max(1, ...entries.map(entry => entry.cents));
  return <section className={panel + " min-w-0"}>
    <h2 className="text-lg font-black text-[#061b3a]">Facturado por servicio</h2>
    {!entries.length && <p className="mt-3 text-sm text-slate-600">No hay datos en este período.</p>}
    <ul className="mt-4 space-y-4">
      {entries.map(entry => <li key={entry.label}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
          <span className="font-semibold text-slate-900">{serviceLabels[entry.label] ?? entry.label ?? "Sin clasificar"}</span>
          <span className="font-bold tabular-nums text-[#061b3a]">{usd(entry.cents)} {total > 0 && <span className="ml-1 text-xs font-medium text-slate-600">{(entry.cents / total * 100).toFixed(1)}%</span>}</span>
        </div>
        <div aria-hidden="true" className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-amber-600" style={{ width: `${entry.cents / maximum * 100}%` }} />
        </div>
        <p className="mt-1 text-xs text-slate-600">{entry.count} {entry.count === 1 ? "concepto" : "conceptos"}</p>
      </li>)}
    </ul>
  </section>;
}

const paymentColors = ["#a16207", "#183c63", "#0f766e", "#9333a0", "#b45353", "#64748b"];

function PaymentChart({ entries, total }: { entries: Entry[]; total: number }) {
  const segments = (total > 0 ? entries : []).reduce<{ end: number; stops: string[] }>((chart, entry, index) => {
    const end = Math.min(100, chart.end + entry.cents / total * 100);
    return { end, stops: [...chart.stops, `${paymentColors[index % paymentColors.length]} ${chart.end}% ${end}%`] };
  }, { end: 0, stops: [] });

  return <section className={panel + " min-w-0"}>
    <h2 className="text-lg font-black text-[#061b3a]">Cobros por forma de pago</h2>
    {total <= 0 || entries.length === 0 ? <p className="mt-3 text-sm text-slate-600">No hay cobros registrados en este período.</p> :
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="grid h-32 w-32 shrink-0 place-items-center rounded-full"
          style={{ background: `conic-gradient(${segments.stops.join(", ")}, #e2e8f0 ${segments.end}% 100%)` }}>
          <p className="grid h-24 w-24 place-items-center break-all rounded-full bg-white px-2 text-center text-sm font-black tabular-nums text-[#061b3a]">{usd(total)}</p>
        </div>
        <ul className="min-w-0 flex-1 basis-40 space-y-2 text-sm">
          {entries.map((entry, index) => <li key={entry.label} className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-1 size-3 shrink-0 rounded-sm"
              style={{ backgroundColor: paymentColors[index % paymentColors.length] }} />
            <div className="min-w-0 flex-1 break-words">
              <p className="font-semibold">{entry.label}</p>
              <p className="text-xs tabular-nums text-slate-600">{usd(entry.cents)} · {(entry.cents / total * 100).toFixed(1)}%</p>
            </div>
          </li>)}
        </ul>
      </div>}
  </section>;
}
