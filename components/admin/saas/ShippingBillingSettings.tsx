"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Save, Truck } from "lucide-react";
import PlatformUsageCard from "@/components/admin/shipping/PlatformUsageCard";
import type { ShippingPlatformBilling } from "@/lib/shipping/platform-billing";

async function headers() {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token || ""}`, "Content-Type": "application/json" };
}
export default function ShippingBillingSettings({ storeId }: { storeId: string }) {
  const [billing, setBilling] = useState<ShippingPlatformBilling | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [rate, setRate] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/saas/shipping-billing?store_id=${encodeURIComponent(storeId)}`, { headers: await headers(), signal: controller.signal, cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "No se pudo cargar la tarifa.");
        if (!controller.signal.aborted) { setBilling(result.data); setEnabled(result.data.enabled); setRate(String(result.data.fee_per_operation)); }
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudo cargar la tarifa."); }
    }
    void load();
    return () => controller.abort();
  }, [storeId]);
  async function save() {
    if (!billing || busy) return;
    const fee = Number(rate);
    if (!rate.trim() || !Number.isFinite(fee) || fee < 0 || fee > 10000 || (enabled && fee === 0)) { setError("Indica una tarifa válida en USD."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/saas/shipping-billing", { method: "PUT", headers: await headers(), body: JSON.stringify({ store_id: storeId, enabled, fee_per_operation: fee }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar.");
      setBilling({ ...billing, enabled, fee_per_operation: fee });
      setMessage("Tarifa guardada. Se aplicará únicamente a nuevas operaciones.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar."); }
    finally { setBusy(false); }
  }
  return <section className="mt-7 rounded-2xl border border-blue-200 bg-blue-50/30 p-5"><div className="flex items-center gap-2"><Truck size={20} className="text-blue-700" /><h3 className="font-black text-slate-900">Comisión por uso de envíos</h3></div><p className="mt-2 text-xs leading-6 text-slate-500">Tarifa fija en USD a cargo de la agencia. Es independiente de la comisión de ventas y no modifica los precios del cliente. Una operación registrada genera un cargo, aunque la factura se imprima varias veces.</p>
    {!billing && !error ? <p className="mt-4 text-sm text-slate-500">Cargando tarifa…</p> : null}
    <div className="mt-4 flex flex-wrap items-end gap-5"><label className="flex min-h-11 items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" checked={enabled} disabled={!billing || busy} onChange={event => setEnabled(event.target.checked)} className="h-4 w-4" />Activar comisión de envíos</label><label className="block text-xs font-bold text-slate-600">USD por operación<input type="number" min="0" max="10000" step="0.01" placeholder="0.40" value={rate} disabled={!billing || busy} onChange={event => setRate(event.target.value)} className="mt-2 block min-h-11 w-40 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500" /></label><button type="button" disabled={!billing || busy} onClick={() => { void save(); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-700 px-4 text-xs font-bold text-white disabled:opacity-50">{busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}Guardar comisión de envíos</button></div>
    <p className="mt-3 text-xs leading-5 text-slate-500">Ejemplo: $0.40 × 100 operaciones = $40.00 a cargo de la agencia. No se generan cargos retroactivos. Las solicitudes web pendientes empiezan a contar al convertirse en un envío.</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}{message && <p role="status" className="mt-3 text-sm text-emerald-700">{message}</p>}
    {billing && <PlatformUsageCard billing={billing} />}
  </section>;
}
