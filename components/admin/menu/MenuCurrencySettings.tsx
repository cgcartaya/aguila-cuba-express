"use client";

import { useEffect, useState } from "react";
import { BadgeDollarSign, RefreshCw, Save } from "lucide-react";
import { getStoreSettings, saveStoreSettings } from "@/lib/services/settings";
import { supabase } from "@/lib/supabase";

type Props = { storeId: string };
type Source = "manual" | "eltoque";
type RateState = { rate: string; source: Source; updatedAt: string | null };

export default function MenuCurrencySettings({ storeId }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [usd, setUsd] = useState<RateState>({ rate: "", source: "manual", updatedAt: null });
  const [eur, setEur] = useState<RateState>({ rate: "", source: "manual", updatedAt: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await getStoreSettings(storeId);
    if (error) setMessage("No se pudo cargar la configuración de moneda.");
    else {
      setEnabled(data?.menu_show_usd_equivalent === true);
      setUsd({ rate: data?.menu_cup_per_usd ? String(data.menu_cup_per_usd) : "", source: data?.menu_exchange_rate_source === "eltoque" ? "eltoque" : "manual", updatedAt: data?.menu_exchange_rate_updated_at || null });
      setEur({ rate: data?.menu_cup_per_eur ? String(data.menu_cup_per_eur) : "", source: data?.menu_eur_exchange_rate_source === "eltoque" ? "eltoque" : "manual", updatedAt: data?.menu_eur_exchange_rate_updated_at || null });
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [storeId]);

  const number = (value: string) => Number(value.replace(",", "."));
  const save = async () => {
    const usdRate = number(usd.rate), eurRate = number(eur.rate);
    if (usd.source === "manual" && (!Number.isFinite(usdRate) || usdRate <= 0)) return setMessage("Escribe una tasa USD válida o selecciona elTOQUE.");
    if (eur.source === "manual" && eur.rate && (!Number.isFinite(eurRate) || eurRate <= 0)) return setMessage("Escribe una tasa EUR válida o selecciona elTOQUE.");
    setSaving(true); setMessage(null); const now = new Date().toISOString();
    const { error } = await saveStoreSettings({
      menu_show_usd_equivalent: enabled,
      menu_cup_per_usd: usd.source === "manual" ? usdRate : undefined,
      menu_exchange_rate_source: usd.source,
      menu_exchange_rate_updated_at: usd.source === "manual" ? now : undefined,
      menu_cup_per_eur: eur.source === "manual" ? (eur.rate ? eurRate : null) : undefined,
      menu_eur_exchange_rate_source: eur.source,
      menu_eur_exchange_rate_updated_at: eur.source === "manual" && eur.rate ? now : undefined,
    }, storeId);
    setSaving(false);
    if (error) return setMessage("No se pudo guardar la configuración.");
    setMessage("Configuración guardada. CUP, USD y EUR ya están preparados para el selector del menú.");
    await load();
  };

  const refresh = async () => {
    setRefreshing(true); setMessage("Consultando USD y EUR en elTOQUE...");
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) { setRefreshing(false); return setMessage("La sesión expiró. Vuelve a iniciar sesión."); }
    const response = await fetch("/api/admin/menu/eltoque-refresh", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ storeId }) });
    const result = await response.json();
    setRefreshing(false);
    if (!response.ok) return setMessage(result.error || "No se pudieron actualizar las tasas.");
    setMessage(`elTOQUE actualizado: USD ${result.usd} CUP · EUR ${result.eur} CUP.`);
    await load();
  };

  if (loading) return <section className="mt-5 rounded-3xl border bg-white p-5 text-sm font-semibold text-slate-500">Cargando configuración de moneda...</section>;

  const CurrencyCard = ({ label, flag, symbol, value, setValue }: { label: string; flag: string; symbol: string; value: RateState; setValue: (v: RateState) => void }) => (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="mb-3 flex items-center gap-2"><span className="text-2xl">{flag}</span><div><p className="font-black text-[#071B35]">{label}</p><p className="text-[10px] font-bold text-slate-400">1 {symbol} = CUP</p></div></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex overflow-hidden rounded-xl border bg-slate-50"><input disabled={value.source === "eltoque"} value={value.rate} onChange={e => setValue({ ...value, rate: e.target.value })} inputMode="decimal" placeholder="Tasa en CUP" className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-black outline-none disabled:text-slate-400"/><span className="px-3 py-2.5 text-xs font-black text-slate-400">CUP</span></div>
        <div className="grid grid-cols-2 gap-2">
          {(["manual", "eltoque"] as Source[]).map(source => <button key={source} type="button" onClick={() => setValue({ ...value, source })} className={`rounded-xl border px-3 py-2.5 text-xs font-black ${value.source === source ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-500"}`}>{source === "manual" ? "Manual" : "elTOQUE"}</button>)}
        </div>
      </div>
      <p className="mt-2 text-[10px] font-semibold text-slate-400">{value.source === "eltoque" ? "Actualización automática diaria" : "Tasa controlada por el restaurante"}{value.updatedAt ? ` · ${new Date(value.updatedAt).toLocaleString("es-CU")}` : ""}</p>
    </div>
  );

  return <section className="mt-5 overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
    <div className="flex flex-col gap-4 border-b bg-gradient-to-r from-emerald-50 to-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><BadgeDollarSign/></div><div><h2 className="text-lg font-black">Selector de monedas del menú</h2><p className="text-xs font-semibold text-slate-500">El cliente podrá elegir 🇨🇺 CUP, 🇺🇸 USD o 🇪🇺 EUR. El precio base siempre permanece en CUP.</p></div></div>
      <label className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-black"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)} className="accent-emerald-600"/>Activar selector</label>
    </div>
    <div className="grid gap-4 p-5 lg:grid-cols-2"><CurrencyCard label="Dólar estadounidense" flag="🇺🇸" symbol="USD" value={usd} setValue={setUsd}/><CurrencyCard label="Euro" flag="🇪🇺" symbol="EUR" value={eur} setValue={setEur}/></div>
    <div className="flex flex-wrap items-center gap-2 border-t px-5 py-4"><button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#071B35] px-5 py-3 text-sm font-black text-white"><Save size={16}/>{saving ? "Guardando..." : "Guardar"}</button>{(usd.source === "eltoque" || eur.source === "eltoque") && <button onClick={refresh} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-800"><RefreshCw size={16} className={refreshing ? "animate-spin" : ""}/>{refreshing ? "Actualizando..." : "Actualizar ahora"}</button>}{message && <p className="text-xs font-bold text-emerald-700">{message}</p>}</div>
  </section>;
}
