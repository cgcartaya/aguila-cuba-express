"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, CheckCircle2, ExternalLink, Loader2, Save, Settings2, Truck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";

export default function PublicQuoteSettingsPage() {
  const access = useAdminAccess();
  const storeContext = useStore();
  const store = useMemo(
    () => (access.isSuperAdmin ? storeContext.store || access.store : access.store),
    [access.isSuperAdmin, access.store, storeContext.store]
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState<any>(null);
  const [rateCount, setRateCount] = useState(0);
  const [serviceCount, setServiceCount] = useState(0);

  async function load() {
    if (!store?.id) return;
    setLoading(true);
    const [portal, rates, services] = await Promise.all([
      supabase.from("customer_portal_settings").select("*").eq("store_id", store.id).maybeSingle(),
      supabase.from("shipping_rates").select("id", { count: "exact", head: true }).eq("store_id", store.id).eq("is_active", true),
      supabase.from("shipping_service_types").select("id", { count: "exact", head: true }).eq("store_id", store.id).eq("is_active", true),
    ]);

    setSettings(portal.data || {
      is_enabled: true,
      quote_enabled: true,
      pickup_enabled: true,
      pickup_mode: "optional",
      pickup_fee: 0,
      whatsapp_enabled: true,
      whatsapp_phone: "",
      currency: "USD",
      quote_title: "Cotiza tu envío",
      quote_subtitle: "Obtén un estimado en segundos.",
      disclaimer: "Cotización estimada. El precio final se confirma al recibir y pesar el envío.",
      default_origin_label: "Miami, Florida",
    });
    setRateCount(rates.count || 0);
    setServiceCount(services.count || 0);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [store?.id]);

  async function save() {
    if (!store?.id || !settings) return;
    setSaving(true);
    setMessage("");
    const { error } = await supabase
      .from("customer_portal_settings")
      .upsert({ ...settings, store_id: store.id, updated_at: new Date().toISOString() }, { onConflict: "store_id" });
    setSaving(false);
    setMessage(error ? error.message : "Configuración pública guardada correctamente.");
  }

  if (loading) return <div className="flex min-h-[420px] items-center justify-center"><Loader2 className="animate-spin text-blue-700" size={38} /></div>;
  if (!store) return <div className="rounded-3xl bg-white p-8 font-bold text-slate-600">No se pudo resolver la tienda asignada.</div>;

  return (
    <main className="mx-auto max-w-[1400px] space-y-7 pb-12 text-slate-900">
      <header className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#071d43] via-[#0b3473] to-[#0d62b8] p-7 text-white shadow-xl sm:p-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-[.16em]"><Calculator size={15} /> Portal comercial</div>
            <h1 className="mt-4 text-3xl font-black sm:text-4xl">Cotizador público</h1>
            <p className="mt-2 max-w-3xl text-base font-medium text-blue-100">Aquí controlas cómo se presenta el cotizador. Los precios, destinos, métodos y tiempos se administran únicamente en Ajustes de envíos.</p>
          </div>
          <a href="/cotizar" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-[#071d43] shadow-lg"><ExternalLink size={18} /> Probar como cliente</a>
        </div>
      </header>

      {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 font-bold text-emerald-800">{message}</div>}

      <section className="grid gap-4 md:grid-cols-3">
        <StatusCard label="Cotizador" value={settings?.quote_enabled ? "Activo" : "Desactivado"} ready={!!settings?.quote_enabled} />
        <StatusCard label="Servicios activos" value={String(serviceCount)} ready={serviceCount > 0} />
        <StatusCard label="Tarifas publicadas" value={String(rateCount)} ready={rateCount > 0} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_.65fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <Heading icon={<Settings2 />} title="Presentación y contacto" text="Estos ajustes sí pertenecen al Portal Comercial." />
          <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <Toggle title="Cotizador activo" text="Permite calcular y guardar cotizaciones." checked={!!settings?.quote_enabled} onChange={(value) => setSettings({ ...settings, quote_enabled: value })} />
            <Toggle title="Recogida activa" text="Muestra la opción de recogida." checked={!!settings?.pickup_enabled} onChange={(value) => setSettings({ ...settings, pickup_enabled: value, pickup_mode: value ? settings.pickup_mode || "optional" : "disabled" })} />
            <Toggle title="WhatsApp activo" text="Muestra el botón para continuar." checked={settings?.whatsapp_enabled !== false} onChange={(value) => setSettings({ ...settings, whatsapp_enabled: value })} />
            <Field label="Título público"><input value={settings?.quote_title || ""} onChange={(e) => setSettings({ ...settings, quote_title: e.target.value })} /></Field>
            <Field label="Subtítulo"><input value={settings?.quote_subtitle || ""} onChange={(e) => setSettings({ ...settings, quote_subtitle: e.target.value })} /></Field>
            <Field label="WhatsApp de la agencia"><input value={settings?.whatsapp_phone || ""} onChange={(e) => setSettings({ ...settings, whatsapp_phone: e.target.value })} placeholder="+1305..." /></Field>
            <Field label="Origen predeterminado"><input value={settings?.default_origin_label || ""} onChange={(e) => setSettings({ ...settings, default_origin_label: e.target.value })} /></Field>
            <Field label="Modalidad de recogida"><select value={settings?.pickup_mode || "optional"} onChange={(e) => setSettings({ ...settings, pickup_mode: e.target.value })}><option value="disabled">Desactivada</option><option value="free">Gratis</option><option value="paid">Siempre con cargo</option><option value="optional">Opcional con cargo</option></select></Field>
            <Field label="Fee de recogida"><input type="number" min="0" step="0.01" value={settings?.pickup_fee || 0} onChange={(e) => setSettings({ ...settings, pickup_fee: Number(e.target.value) })} /></Field>
            <Field label="Moneda"><select value={settings?.currency || "USD"} onChange={(e) => setSettings({ ...settings, currency: e.target.value })}><option value="USD">USD</option><option value="EUR">EUR</option><option value="MXN">MXN</option></select></Field>
            <Field label="Texto legal" wide><textarea value={settings?.disclaimer || ""} onChange={(e) => setSettings({ ...settings, disclaimer: e.target.value })} /></Field>
          </div>
          <button type="button" disabled={saving} onClick={() => void save()} className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-[#071d43] px-6 py-3.5 font-black text-white shadow-lg disabled:opacity-60">{saving ? <Loader2 className="animate-spin" /> : <Save />} Guardar configuración</button>
        </div>

        <aside className="rounded-[2rem] border border-blue-200 bg-blue-50 p-6 sm:p-8">
          <Heading icon={<Truck />} title="Única fuente de tarifas" text="Desde ahora los precios se administran en un solo lugar." />
          <div className="mt-6 space-y-3 text-sm font-semibold text-slate-600">
            <p>En Ajustes de envíos configuras países, provincias, municipios, lugares APK, servicios, métodos, precios, mínimos y tiempos de entrega.</p>
            <p>La landing, el cotizador, la creación de envíos y las facturas usarán esas mismas tarifas.</p>
          </div>
          <a href="/admin/shipping/settings#tarifas" className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-4 font-black text-white"><Truck size={18} /> Administrar tarifas de envíos</a>
        </aside>
      </section>
    </main>
  );
}

function Heading({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">{icon}</div><div><h2 className="text-2xl font-black text-[#071d43]">{title}</h2><p className="mt-1 text-sm font-medium text-slate-500 sm:text-base">{text}</p></div></div>; }
function StatusCard({ label, value, ready }: { label: string; value: string; ready: boolean }) { return <div className={`rounded-3xl border bg-white p-5 shadow-sm ${ready ? "border-emerald-200" : "border-amber-200"}`}><div className="flex items-center justify-between"><CheckCircle2 className={ready ? "text-emerald-600" : "text-amber-500"} /><span className={`rounded-full px-3 py-1 text-xs font-black ${ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{ready ? "Listo" : "Pendiente"}</span></div><p className="mt-4 text-sm font-bold text-slate-500">{label}</p><strong className="mt-1 block text-2xl text-[#071d43]">{value}</strong></div>; }
function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) { return <label className={`block text-sm font-black text-slate-700 ${wide ? "md:col-span-2 xl:col-span-3" : ""}`}>{label}<div className="mt-2 [&_input]:w-full [&_input]:rounded-2xl [&_input]:border [&_input]:border-slate-200 [&_input]:bg-slate-50 [&_input]:px-4 [&_input]:py-3.5 [&_select]:w-full [&_select]:rounded-2xl [&_select]:border [&_select]:border-slate-200 [&_select]:bg-slate-50 [&_select]:px-4 [&_select]:py-3.5 [&_textarea]:min-h-24 [&_textarea]:w-full [&_textarea]:rounded-2xl [&_textarea]:border [&_textarea]:border-slate-200 [&_textarea]:bg-slate-50 [&_textarea]:px-4 [&_textarea]:py-3.5">{children}</div></label>; }
function Toggle({ title, text, checked, onChange }: { title: string; text: string; checked: boolean; onChange: (value: boolean) => void }) { return <button type="button" onClick={() => onChange(!checked)} className={`flex min-h-24 items-center justify-between gap-4 rounded-2xl border p-4 text-left ${checked ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-50"}`}><span><b className="block text-[#071d43]">{title}</b><small className="mt-1 block text-slate-500">{text}</small></span><span className={`relative h-7 w-12 shrink-0 rounded-full p-1 ${checked ? "bg-blue-700" : "bg-slate-300"}`}><span className={`block h-5 w-5 rounded-full bg-white shadow transition ${checked ? "translate-x-5" : ""}`} /></span></button>; }
