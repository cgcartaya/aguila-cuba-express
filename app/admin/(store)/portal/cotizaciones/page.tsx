"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Filter, Loader2, MessageCircle, Search, TrendingUp, UsersRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";

const statuses = [
  ["new", "Nueva"],
  ["contacted", "Contactada"],
  ["negotiating", "Negociando"],
  ["accepted", "Aceptada"],
  ["rejected", "Rechazada"],
  ["converted", "Convertida"],
] as const;

const statusLabels = Object.fromEntries(statuses);

type Quote = {
  id: string;
  public_code: string;
  customer_name: string | null;
  customer_phone: string;
  customer_email?: string | null;
  destination_label?: string | null;
  weight_lb: number;
  transport_mode: string;
  item_category?: string | null;
  total_amount: number;
  currency?: string | null;
  status: string;
  created_at: string;
  estimated_days_min?: number | null;
  estimated_days_max?: number | null;
};

const modeLabels: Record<string, string> = { air: "Aéreo", sea: "Marítimo", express: "Express", ground: "Terrestre", other: "Otro" };

export default function QuotesPage() {
  const access = useAdminAccess();
  const selectedStore = useStore();
  const store = useMemo(() => access.isSuperAdmin ? (selectedStore.store || access.store) : access.store, [access.isSuperAdmin, access.store, selectedStore.store]);
  const [rows, setRows] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("");

  async function load() {
    if (!store?.id) return;
    setLoading(true);
    const { data, error } = await supabase.from("customer_quotes").select("*").eq("store_id", store.id).order("created_at", { ascending: false });
    setRows((data || []) as Quote[]);
    setMessage(error?.message || "");
    setLoading(false);
  }

  useEffect(() => { void load(); }, [store?.id]);

  async function updateStatus(id: string, value: string) {
    const { error } = await supabase.from("customer_quotes").update({ status: value, updated_at: new Date().toISOString() }).eq("id", id).eq("store_id", store?.id);
    if (error) setMessage(error.message); else await load();
  }

  const filtered = rows.filter((quote) => {
    const term = search.toLowerCase().trim();
    const matchesSearch = !term || [quote.public_code, quote.customer_name, quote.customer_phone, quote.destination_label].filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
    return matchesSearch && (statusFilter === "all" || quote.status === statusFilter);
  });

  const newCount = rows.filter((quote) => quote.status === "new").length;
  const convertedCount = rows.filter((quote) => quote.status === "converted").length;
  const conversion = rows.length ? Math.round((convertedCount / rows.length) * 100) : 0;

  if (loading) return <div className="flex min-h-[400px] items-center justify-center"><Loader2 className="animate-spin text-blue-700" size={36} /></div>;

  return <main className="mx-auto max-w-[1450px] space-y-7 pb-12">
    <header className="rounded-[2rem] bg-gradient-to-br from-[#071d43] via-[#0b3473] to-[#0d62b8] p-7 text-white shadow-xl sm:p-9"><p className="text-xs font-black uppercase tracking-[.16em] text-blue-200">CRM comercial</p><h1 className="mt-3 text-3xl font-black sm:text-4xl">Cotizaciones de {store?.name || "la empresa"}</h1><p className="mt-2 max-w-3xl font-medium text-blue-100">Gestiona los contactos recibidos desde la landing, da seguimiento por WhatsApp y controla su avance comercial.</p></header>

    {message && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">{message}</div>}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={<UsersRound />} label="Cotizaciones" value={rows.length} /><Metric icon={<CalendarDays />} label="Nuevas" value={newCount} /><Metric icon={<TrendingUp />} label="Convertidas" value={convertedCount} /><Metric icon={<TrendingUp />} label="Conversión" value={`${conversion}%`} /></section>

    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="grid gap-4 md:grid-cols-[1fr_260px]"><label className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por código, cliente, teléfono o destino..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 font-semibold outline-none focus:border-blue-500" /></label><label className="relative"><Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 font-bold outline-none"><option value="all">Todos los estados</option>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div></section>

    <section className="grid gap-4">{filtered.map((quote) => {
      const phone = String(quote.customer_phone || "").replace(/\D/g, "");
      const whatsappText = encodeURIComponent(`Hola ${quote.customer_name || ""}, le contactamos de ${store?.name || "la agencia"} por su cotización ${quote.public_code}.`);
      return <article key={quote.id} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6"><div className="grid gap-5 xl:grid-cols-[1fr_auto]"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-800">{quote.public_code}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{statusLabels[quote.status] || quote.status}</span><span className="text-xs font-bold text-slate-400">{new Date(quote.created_at).toLocaleString("es-US", { dateStyle: "medium", timeStyle: "short" })}</span></div><h2 className="mt-3 text-2xl font-black text-[#071d43]">{quote.customer_name || "Cliente sin nombre"}</h2><p className="mt-1 font-semibold text-slate-500">{quote.customer_phone}{quote.customer_email ? ` · ${quote.customer_email}` : ""}</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Detail label="Destino" value={quote.destination_label || "Por confirmar"} /><Detail label="Método" value={modeLabels[quote.transport_mode] || quote.transport_mode} /><Detail label="Peso" value={`${quote.weight_lb} lb`} /><Detail label="Entrega" value={quote.estimated_days_min || quote.estimated_days_max ? `${quote.estimated_days_min ?? "?"}-${quote.estimated_days_max ?? "?"} días` : "Sin definir"} /></div></div><div className="min-w-[240px] rounded-3xl bg-slate-50 p-5"><p className="text-xs font-black uppercase tracking-wider text-slate-400">Total estimado</p><p className="mt-1 text-3xl font-black text-[#071d43]">{new Intl.NumberFormat("en-US", { style: "currency", currency: quote.currency || "USD" }).format(Number(quote.total_amount || 0))}</p><label className="mt-4 block text-xs font-black uppercase tracking-wider text-slate-400">Estado<select value={quote.status || "new"} onChange={(event) => void updateStatus(quote.id, event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-black text-slate-700 outline-none">{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div></div><div className="mt-5 flex flex-wrap gap-3 border-t pt-5"><a href={`https://wa.me/${phone}?text=${whatsappText}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 font-black text-white"><MessageCircle size={18} /> Contactar por WhatsApp</a>{quote.status !== "converted" && <button type="button" onClick={() => void updateStatus(quote.id, "contacted")} className="rounded-xl border border-slate-200 px-4 py-2.5 font-black text-slate-700">Marcar contactada</button>}</div></article>;
    })}{filtered.length === 0 && <div className="rounded-[2rem] border-2 border-dashed border-slate-200 bg-white p-12 text-center"><Search className="mx-auto text-slate-300" size={42} /><h2 className="mt-4 text-xl font-black text-slate-900">No encontramos cotizaciones</h2><p className="mt-2 font-medium text-slate-500">Cambia los filtros o prueba el cotizador público para crear la primera.</p></div>}</section>
  </main>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) { return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-4"><div className="rounded-2xl bg-blue-50 p-3 text-blue-700">{icon}</div><div><p className="text-sm font-bold text-slate-400">{label}</p><p className="text-2xl font-black text-[#071d43]">{value}</p></div></div></div>; }
function Detail({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-slate-50 p-3"><small className="font-bold text-slate-400">{label}</small><b className="mt-1 block text-sm text-slate-800">{value}</b></div>; }
