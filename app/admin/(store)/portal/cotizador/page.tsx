"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Copy,
  Edit3,
  Eye,
  Loader2,
  MapPin,
  Package,
  Plus,
  Save,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";

type Option = { id: string; name: string };
type Province = Option & { country_id: string };
type Municipality = Option & { province_id: string };
type Location = Option & { municipality_id: string };
type Rule = {
  id: string;
  name: string;
  service_type_id: string | null;
  country_id: string | null;
  province_id: string | null;
  municipality_id: string | null;
  location_id: string | null;
  item_category: string;
  transport_mode: string;
  billing_mode: string;
  rate: number;
  minimum_weight_lb: number;
  maximum_weight_lb: number | null;
  minimum_charge: number;
  fixed_fee: number;
  estimated_days_min: number | null;
  estimated_days_max: number | null;
  priority: number;
  is_active: boolean;
};

type RuleForm = Omit<
  Rule,
  | "id"
  | "service_type_id"
  | "country_id"
  | "province_id"
  | "municipality_id"
  | "location_id"
  | "maximum_weight_lb"
> & {
  service_type_id: string;
  country_id: string;
  province_id: string;
  municipality_id: string;
  location_id: string;
  maximum_weight_lb: string | number;
};

const modeLabels: Record<string, string> = { air: "Aéreo", sea: "Marítimo", express: "Express", ground: "Terrestre", other: "Otro" };
const categoryLabels: Record<string, string> = { package: "Paquete normal", appliance: "Electrodoméstico", medicine: "Medicinas", documents: "Documentos", food: "Alimentos", electronics: "Electrónica", other: "Otro" };
const billingLabels: Record<string, string> = { per_lb: "Por libra", fixed: "Precio fijo", per_item: "Por unidad", quote_only: "Revisión manual" };

const baseRule: RuleForm = {
  name: "Tarifa aérea general",
  service_type_id: "",
  country_id: "",
  province_id: "",
  municipality_id: "",
  location_id: "",
  transport_mode: "air",
  item_category: "package",
  billing_mode: "per_lb",
  rate: 0,
  minimum_weight_lb: 1,
  maximum_weight_lb: "",
  minimum_charge: 0,
  fixed_fee: 0,
  estimated_days_min: 7,
  estimated_days_max: 15,
  priority: 100,
  is_active: true,
};

export default function QuoteSettingsPage() {
  const access = useAdminAccess();
  const storeContext = useStore();
  const store = useMemo(() => access.isSuperAdmin ? (storeContext.store || access.store) : access.store, [access.isSuperAdmin, access.store, storeContext.store]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<any>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [services, setServices] = useState<Option[]>([]);
  const [countries, setCountries] = useState<Option[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [form, setForm] = useState<RuleForm>(baseRule);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [section, setSection] = useState<"general" | "rules" | "test">("general");
  const [testWeight, setTestWeight] = useState(10);

  const visibleProvinces = provinces.filter((item) => !form.country_id || item.country_id === form.country_id);
  const visibleMunicipalities = municipalities.filter((item) => !form.province_id || item.province_id === form.province_id);
  const visibleLocations = locations.filter((item) => !form.municipality_id || item.municipality_id === form.municipality_id);
  const activeRules = rules.filter((rule) => rule.is_active);

  const readiness = [
    { label: "Configuración pública", ok: !!settings?.quote_enabled, detail: settings?.quote_enabled ? "Cotizador activo" : "Activa el cotizador" },
    { label: "Servicios", ok: services.length > 0, detail: services.length ? `${services.length} activos` : "Créalo en Ajustes de envíos" },
    { label: "Destinos", ok: countries.length > 0, detail: countries.length ? `${countries.length} países` : "Configura países y provincias" },
    { label: "Tarifas", ok: activeRules.length > 0, detail: activeRules.length ? `${activeRules.length} publicadas` : "Crea una tarifa general" },
  ];
  const ready = readiness.every((item) => item.ok);

  async function load() {
    if (!store?.id) return;
    setLoading(true);
    setError("");

    const results = await Promise.all([
      supabase.from("customer_portal_settings").select("*").eq("store_id", store.id).maybeSingle(),
      supabase.from("quote_rate_rules").select("*").eq("store_id", store.id).order("priority").order("created_at", { ascending: false }),
      supabase.from("shipping_service_types").select("id,name").eq("store_id", store.id).eq("is_active", true).order("sort_order"),
      supabase.from("shipping_countries").select("id,name").eq("store_id", store.id).eq("is_active", true).order("sort_order"),
      supabase.from("shipping_provinces").select("id,name,country_id").eq("store_id", store.id).eq("is_active", true).order("sort_order"),
      supabase.from("shipping_municipalities").select("id,name,province_id").eq("store_id", store.id).eq("is_active", true).order("sort_order"),
      supabase.from("shipping_locations").select("id,name,municipality_id").eq("store_id", store.id).eq("is_active", true).order("sort_order"),
    ]);

    const firstError = results.map((result) => result.error).find(Boolean);
    if (firstError) setError(firstError.message);

    const [portal, ruleRows, serviceRows, countryRows, provinceRows, municipalityRows, locationRows] = results;
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
    setRules((ruleRows.data || []) as Rule[]);
    setServices(serviceRows.data || []);
    setCountries(countryRows.data || []);
    setProvinces((provinceRows.data || []) as Province[]);
    setMunicipalities((municipalityRows.data || []) as Municipality[]);
    setLocations((locationRows.data || []) as Location[]);
    setForm((current) => ({ ...current, service_type_id: current.service_type_id || serviceRows.data?.[0]?.id || "", country_id: current.country_id || countryRows.data?.[0]?.id || "" }));
    setLoading(false);
  }

  useEffect(() => { void load(); }, [store?.id]);

  async function saveSettings() {
    if (!store?.id || !settings) return;
    setSaving(true);
    setMessage("");
    setError("");
    const { error: saveError } = await supabase.from("customer_portal_settings").upsert({ ...settings, store_id: store.id, updated_at: new Date().toISOString() }, { onConflict: "store_id" });
    setSaving(false);
    if (saveError) setError(saveError.message);
    else { setMessage("Configuración pública guardada."); await load(); }
  }

  function validateRule() {
    if (!form.name.trim()) return "Escribe un nombre para la tarifa.";
    if (!form.service_type_id) return "Selecciona un servicio. Si el selector está vacío, créalo en Ajustes de envíos.";
    if (!form.transport_mode) return "Selecciona el método de transporte.";
    if (!form.item_category) return "Selecciona el contenido.";
    if (form.billing_mode !== "quote_only" && Number(form.rate) <= 0) return "La tarifa debe ser mayor que cero.";
    if (Number(form.minimum_weight_lb) <= 0) return "El peso mínimo debe ser mayor que cero.";
    if (form.maximum_weight_lb !== "" && Number(form.maximum_weight_lb) < Number(form.minimum_weight_lb)) return "El peso máximo no puede ser menor que el mínimo.";
    if (form.estimated_days_min != null && form.estimated_days_max != null && Number(form.estimated_days_max) < Number(form.estimated_days_min)) return "La entrega máxima no puede ser menor que la mínima.";
    return "";
  }

  async function saveRule(event: FormEvent) {
    event.preventDefault();
    if (!store?.id) return;
    const validation = validateRule();
    if (validation) { setError(validation); return; }

    setSaving(true);
    setMessage("");
    setError("");
    const payload = {
      ...form,
      store_id: store.id,
      service_type_id: form.service_type_id || null,
      country_id: form.country_id || null,
      province_id: form.province_id || null,
      municipality_id: form.municipality_id || null,
      location_id: form.location_id || null,
      maximum_weight_lb: form.maximum_weight_lb === "" ? null : Number(form.maximum_weight_lb),
      rate: Number(form.rate),
      minimum_weight_lb: Number(form.minimum_weight_lb),
      minimum_charge: Number(form.minimum_charge),
      fixed_fee: Number(form.fixed_fee),
      priority: Number(form.priority),
      updated_at: new Date().toISOString(),
    };

    const response = editingId
      ? await supabase.from("quote_rate_rules").update(payload).eq("id", editingId).eq("store_id", store.id)
      : await supabase.from("quote_rate_rules").insert(payload);

    setSaving(false);
    if (response.error) { setError(response.error.message); return; }
    setMessage(editingId ? "Tarifa actualizada." : "Tarifa creada y disponible para el cotizador.");
    setEditingId(null);
    setForm({ ...baseRule, service_type_id: services[0]?.id || "", country_id: countries[0]?.id || "" });
    await load();
  }

  function editRule(rule: Rule) {
    setEditingId(rule.id);
    setForm({ ...rule, service_type_id: rule.service_type_id || "", country_id: rule.country_id || "", province_id: rule.province_id || "", municipality_id: rule.municipality_id || "", location_id: rule.location_id || "", maximum_weight_lb: rule.maximum_weight_lb ?? "" });
    setSection("rules");
    window.scrollTo({ top: 300, behavior: "smooth" });
  }

  async function duplicateRule(rule: Rule) {
    if (!store?.id) return;
    const { id: _id, ...copy } = rule;
    const { error: duplicateError } = await supabase.from("quote_rate_rules").insert({ ...copy, store_id: store.id, name: `${rule.name} (copia)`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    if (duplicateError) setError(duplicateError.message); else await load();
  }

  async function toggleRule(rule: Rule) {
    const { error: toggleError } = await supabase.from("quote_rate_rules").update({ is_active: !rule.is_active, updated_at: new Date().toISOString() }).eq("id", rule.id);
    if (toggleError) setError(toggleError.message); else await load();
  }

  async function deleteRule(id: string) {
    if (!confirm("¿Eliminar esta tarifa? Esta acción no se puede deshacer.")) return;
    const { error: deleteError } = await supabase.from("quote_rate_rules").delete().eq("id", id);
    if (deleteError) setError(deleteError.message); else await load();
  }

  const previewWeight = Math.max(Number(testWeight) || 0, Number(form.minimum_weight_lb) || 0);
  const previewBase = form.billing_mode === "per_lb" ? previewWeight * Number(form.rate || 0) : form.billing_mode === "fixed" ? Number(form.rate || 0) : Number(form.rate || 0);
  const previewTotal = Math.max(previewBase + Number(form.fixed_fee || 0), Number(form.minimum_charge || 0));

  if (loading) return <div className="flex min-h-[420px] items-center justify-center"><Loader2 className="animate-spin text-blue-700" size={38} /></div>;
  if (!store) return <div className="rounded-3xl bg-white p-8 font-bold text-slate-600">No se pudo resolver la tienda asignada.</div>;

  return <main className="mx-auto max-w-[1500px] space-y-7 pb-12 text-slate-900">
    <header className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#071d43] via-[#0b3473] to-[#0d62b8] p-7 text-white shadow-xl sm:p-9">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-[.16em]"><Calculator size={15} /> Portal del cliente</div><h1 className="mt-4 text-3xl font-black sm:text-4xl">Cotizador de {store.name}</h1><p className="mt-2 max-w-3xl text-base font-medium text-blue-100">Configura tarifas, mínimos, destinos y recogida. La landing y la página /cotizar usan estas mismas reglas.</p></div><a href="/cotizar" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-[#071d43] shadow-lg"><Eye size={18} /> Probar como cliente</a></div>
    </header>

    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{readiness.map((item) => <div key={item.label} className={`rounded-3xl border bg-white p-5 shadow-sm ${item.ok ? "border-emerald-200" : "border-amber-200"}`}><div className="flex items-center justify-between"><div className={`rounded-2xl p-3 ${item.ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{item.ok ? <CheckCircle2 /> : <AlertTriangle />}</div><span className={`rounded-full px-3 py-1 text-xs font-black ${item.ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{item.ok ? "Listo" : "Pendiente"}</span></div><h2 className="mt-4 text-lg font-black text-[#071d43]">{item.label}</h2><p className="mt-1 text-sm font-semibold text-slate-500">{item.detail}</p></div>)}</section>

    {!ready && <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5"><div className="flex gap-3"><Sparkles className="shrink-0 text-amber-600" /><div><h2 className="font-black text-slate-900">Completa la configuración inicial</h2><p className="mt-1 text-sm font-medium text-slate-600">Orden recomendado: activa el cotizador, crea servicios y destinos en Ajustes de envíos, crea una tarifa general y luego prueba como cliente.</p></div></div></div>}
    {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 font-bold text-emerald-800">{message}</div>}
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-bold text-red-700">{error}</div>}

    <nav className="flex gap-2 overflow-x-auto rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">{[["general", "1. Configuración"], ["rules", "2. Tarifas"], ["test", "3. Vista previa"]].map(([id, label]) => <button key={id} type="button" onClick={() => setSection(id as typeof section)} className={`whitespace-nowrap rounded-2xl px-5 py-3 text-sm font-black transition ${section === id ? "bg-[#071d43] text-white shadow" : "text-slate-600 hover:bg-slate-100"}`}>{label}</button>)}</nav>

    {section === "general" && <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <Heading icon={<Settings2 />} title="Configuración pública" text="Estos ajustes aparecen directamente en la landing y en el cotizador." />
      <div className="mt-7 grid gap-5 xl:grid-cols-3"><Toggle title="Cotizador activo" text="Permite calcular y guardar cotizaciones." checked={!!settings?.quote_enabled} onChange={(value) => setSettings({ ...settings, quote_enabled: value })} /><Toggle title="Recogida activa" text="Muestra la opción de recogida a domicilio." checked={!!settings?.pickup_enabled} onChange={(value) => setSettings({ ...settings, pickup_enabled: value, pickup_mode: value ? settings.pickup_mode || "optional" : "disabled" })} /><Toggle title="WhatsApp activo" text="Permite continuar la conversación con la agencia." checked={settings?.whatsapp_enabled !== false} onChange={(value) => setSettings({ ...settings, whatsapp_enabled: value })} /></div>
      <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3"><Field label="Título público"><input value={settings?.quote_title || ""} onChange={(event) => setSettings({ ...settings, quote_title: event.target.value })} /></Field><Field label="Subtítulo"><input value={settings?.quote_subtitle || ""} onChange={(event) => setSettings({ ...settings, quote_subtitle: event.target.value })} /></Field><Field label="WhatsApp de la agencia"><input value={settings?.whatsapp_phone || ""} onChange={(event) => setSettings({ ...settings, whatsapp_phone: event.target.value })} placeholder="+1305..." /></Field><Field label="Origen predeterminado"><input value={settings?.default_origin_label || ""} onChange={(event) => setSettings({ ...settings, default_origin_label: event.target.value })} /></Field><Field label="Modalidad de recogida"><select value={settings?.pickup_mode || "optional"} onChange={(event) => setSettings({ ...settings, pickup_mode: event.target.value })}><option value="disabled">Desactivada</option><option value="free">Gratis</option><option value="paid">Siempre con cargo</option><option value="optional">Opcional con cargo</option></select></Field><Field label="Fee de recogida"><input type="number" min="0" step="0.01" value={settings?.pickup_fee || 0} onChange={(event) => setSettings({ ...settings, pickup_fee: Number(event.target.value) })} /></Field><Field label="Moneda"><select value={settings?.currency || "USD"} onChange={(event) => setSettings({ ...settings, currency: event.target.value })}><option value="USD">USD</option><option value="EUR">EUR</option><option value="MXN">MXN</option></select></Field><Field label="Texto legal" wide><textarea value={settings?.disclaimer || ""} onChange={(event) => setSettings({ ...settings, disclaimer: event.target.value })} /></Field></div>
      <button type="button" disabled={saving} onClick={() => void saveSettings()} className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-[#071d43] px-6 py-3.5 font-black text-white shadow-lg disabled:opacity-60">{saving ? <Loader2 className="animate-spin" /> : <Save />} Guardar configuración</button>
    </section>}

    {section === "rules" && <>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Heading icon={<Plus />} title={editingId ? "Editar tarifa" : "Nueva tarifa"} text="Empieza con una tarifa general. Después agrega excepciones por provincia, municipio o lugar." />
        {services.length === 0 && <Notice text="No hay servicios activos. Ve a Ajustes de envíos y crea al menos uno antes de guardar una tarifa." />}
        {countries.length === 0 && <Notice text="No hay países activos. Configura primero los destinos en Ajustes de envíos." />}
        <form onSubmit={saveRule} className="mt-7 space-y-8">
          <Block title="Servicio y modalidad"><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"><Field label="Nombre de la regla"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field><Field label="Servicio"><select value={form.service_type_id ?? ""} onChange={(event) => setForm({ ...form, service_type_id: event.target.value })}><option value="">Selecciona un servicio</option>{services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Método"><select value={form.transport_mode} onChange={(event) => setForm({ ...form, transport_mode: event.target.value })}>{Object.entries(modeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Contenido"><select value={form.item_category} onChange={(event) => setForm({ ...form, item_category: event.target.value })}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field></div></Block>
          <Block title="Destino al que aplica"><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"><Field label="País"><select value={form.country_id ?? ""} onChange={(event) => setForm({ ...form, country_id: event.target.value, province_id: "", municipality_id: "", location_id: "" })}><option value="">Todos los países</option>{countries.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Provincia"><select value={form.province_id ?? ""} onChange={(event) => setForm({ ...form, province_id: event.target.value, municipality_id: "", location_id: "" })}><option value="">Todas las provincias</option>{visibleProvinces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Municipio"><select value={form.municipality_id ?? ""} onChange={(event) => setForm({ ...form, municipality_id: event.target.value, location_id: "" })}><option value="">Todos los municipios</option>{visibleMunicipalities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Lugar"><select value={form.location_id ?? ""} onChange={(event) => setForm({ ...form, location_id: event.target.value })}><option value="">Todos los lugares</option>{visibleLocations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field></div></Block>
          <Block title="Precio, mínimos y entrega"><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"><Field label="Forma de cobro"><select value={form.billing_mode} onChange={(event) => setForm({ ...form, billing_mode: event.target.value })}>{Object.entries(billingLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Tarifa"><input type="number" min="0" step="0.01" value={form.rate} disabled={form.billing_mode === "quote_only"} onChange={(event) => setForm({ ...form, rate: Number(event.target.value) })} /></Field><Field label="Peso mínimo facturable"><input type="number" min="0.1" step="0.1" value={form.minimum_weight_lb} onChange={(event) => setForm({ ...form, minimum_weight_lb: Number(event.target.value) })} /></Field><Field label="Peso máximo (opcional)"><input type="number" min="0" step="0.1" value={form.maximum_weight_lb} onChange={(event) => setForm({ ...form, maximum_weight_lb: event.target.value })} /></Field><Field label="Cobro mínimo"><input type="number" min="0" step="0.01" value={form.minimum_charge} onChange={(event) => setForm({ ...form, minimum_charge: Number(event.target.value) })} /></Field><Field label="Fee fijo adicional"><input type="number" min="0" step="0.01" value={form.fixed_fee} onChange={(event) => setForm({ ...form, fixed_fee: Number(event.target.value) })} /></Field><Field label="Entrega mínima (días)"><input type="number" min="0" value={form.estimated_days_min ?? ""} onChange={(event) => setForm({ ...form, estimated_days_min: event.target.value === "" ? null : Number(event.target.value) })} /></Field><Field label="Entrega máxima (días)"><input type="number" min="0" value={form.estimated_days_max ?? ""} onChange={(event) => setForm({ ...form, estimated_days_max: event.target.value === "" ? null : Number(event.target.value) })} /></Field><Field label="Prioridad"><input type="number" min="1" value={form.priority} onChange={(event) => setForm({ ...form, priority: Number(event.target.value) })} /></Field><Toggle title="Regla activa" text="Se publica inmediatamente." checked={form.is_active} onChange={(value) => setForm({ ...form, is_active: value })} /></div></Block>
          <div className="flex flex-wrap gap-3"><button disabled={saving || services.length === 0} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 font-black text-white shadow-lg disabled:opacity-50">{saving ? <Loader2 className="animate-spin" /> : <Save />} {editingId ? "Guardar cambios" : "Crear tarifa"}</button>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ ...baseRule, service_type_id: services[0]?.id || "", country_id: countries[0]?.id || "" }); }} className="rounded-2xl border border-slate-300 px-6 py-3.5 font-black">Cancelar</button>}</div>
        </form>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><Heading icon={<Package />} title="Tarifas configuradas" text={`${rules.length} reglas pertenecen a ${store.name}.`} /><div className="mt-6 grid gap-4 xl:grid-cols-2">{rules.map((rule) => <article key={rule.id} className={`rounded-3xl border p-5 ${rule.is_active ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50 opacity-70"}`}><div className="flex flex-col gap-4 sm:flex-row sm:justify-between"><div><div className="flex flex-wrap gap-2"><Badge>{modeLabels[rule.transport_mode] || rule.transport_mode}</Badge><Badge>{categoryLabels[rule.item_category] || rule.item_category}</Badge><Badge active={rule.is_active}>{rule.is_active ? "Activa" : "Inactiva"}</Badge></div><h3 className="mt-3 text-xl font-black text-[#071d43]">{rule.name}</h3><p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-500"><MapPin size={15} />{destinationLabel(rule, countries, provinces, municipalities, locations)}</p></div><div className="sm:text-right"><p className="text-xs font-black uppercase tracking-wider text-slate-400">{billingLabels[rule.billing_mode]}</p><p className="mt-1 text-3xl font-black text-[#071d43]">{rule.billing_mode === "quote_only" ? "Manual" : `$${Number(rule.rate).toFixed(2)}${rule.billing_mode === "per_lb" ? "/lb" : ""}`}</p></div></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Mínimo" value={`${rule.minimum_weight_lb || 0} lb`} /><Stat label="Cobro mínimo" value={`$${Number(rule.minimum_charge || 0).toFixed(2)}`} /><Stat label="Fee" value={`$${Number(rule.fixed_fee || 0).toFixed(2)}`} /><Stat label="Entrega" value={rule.estimated_days_min || rule.estimated_days_max ? `${rule.estimated_days_min ?? "?"}-${rule.estimated_days_max ?? "?"} días` : "Sin definir"} /></div><div className="mt-5 flex flex-wrap gap-2 border-t pt-4"><Action icon={<Edit3 />} label="Editar" onClick={() => editRule(rule)} /><Action icon={<Copy />} label="Duplicar" onClick={() => void duplicateRule(rule)} /><Action icon={<CheckCircle2 />} label={rule.is_active ? "Desactivar" : "Activar"} onClick={() => void toggleRule(rule)} /><Action danger icon={<Trash2 />} label="Eliminar" onClick={() => void deleteRule(rule.id)} /></div></article>)}{rules.length === 0 && <div className="col-span-full rounded-3xl border-2 border-dashed border-slate-200 p-10 text-center"><Calculator className="mx-auto text-slate-300" size={44} /><h3 className="mt-4 text-xl font-black">Todavía no hay tarifas</h3><p className="mt-2 text-slate-500">Crea una tarifa general aérea o marítima para comenzar.</p></div>}</div></section>
    </>}

    {section === "test" && <section className="grid gap-6 lg:grid-cols-[1fr_.8fr]"><div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><Heading icon={<Calculator />} title="Vista previa rápida" text="Prueba la regla que estás preparando sin salir de Administración." /><div className="mt-7 grid gap-5 md:grid-cols-2"><Field label="Peso de prueba"><input type="number" min="0.1" step="0.1" value={testWeight} onChange={(event) => setTestWeight(Number(event.target.value))} /></Field><Field label="Regla seleccionada"><select value={form.name} disabled><option>{form.name}</option></select></Field></div><div className="mt-6 rounded-3xl bg-slate-50 p-6"><div className="grid gap-4 sm:grid-cols-2"><Stat label="Método" value={modeLabels[form.transport_mode] || form.transport_mode} /><Stat label="Contenido" value={categoryLabels[form.item_category] || form.item_category} /><Stat label="Peso real" value={`${testWeight} lb`} /><Stat label="Peso facturable" value={`${previewWeight} lb`} /></div></div></div><aside className="rounded-[2rem] bg-[#071d43] p-7 text-white shadow-xl"><p className="text-xs font-black uppercase tracking-[.16em] text-blue-200">El cliente verá</p><h2 className="mt-3 text-2xl font-black">{form.name}</h2><p className="mt-2 text-white/70">{destinationLabel(form as unknown as Rule, countries, provinces, municipalities, locations)}</p><div className="mt-7 rounded-3xl bg-white/10 p-6"><span className="text-white/60">Total estimado</span><strong className="mt-2 block text-4xl">${previewTotal.toFixed(2)}</strong><p className="mt-3 text-sm text-white/60">{testWeight} lb reales · {previewWeight} lb facturables · {form.estimated_days_min ?? "?"}-{form.estimated_days_max ?? "?"} días</p></div><button type="button" onClick={() => setSection("rules")} className="mt-5 w-full rounded-2xl bg-white p-3.5 font-black text-[#071d43]">Volver a editar la tarifa</button></aside></section>}
  </main>;
}

function Heading({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">{icon}</div><div><h2 className="text-2xl font-black text-[#071d43]">{title}</h2><p className="mt-1 text-sm font-medium text-slate-500 sm:text-base">{text}</p></div></div>; }
function Block({ title, children }: { title: string; children: React.ReactNode }) { return <div><h3 className="border-b border-slate-100 pb-3 text-sm font-black uppercase tracking-[.12em] text-blue-700">{title}</h3><div className="mt-4">{children}</div></div>; }
function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) { return <label className={`block text-sm font-black text-slate-700 ${wide ? "md:col-span-2 xl:col-span-3" : ""}`}>{label}<div className="mt-2 [&_input]:w-full [&_input]:rounded-2xl [&_input]:border [&_input]:border-slate-200 [&_input]:bg-slate-50 [&_input]:px-4 [&_input]:py-3.5 [&_input]:font-semibold [&_input]:outline-none focus-within:[&_input]:border-blue-500 [&_select]:w-full [&_select]:rounded-2xl [&_select]:border [&_select]:border-slate-200 [&_select]:bg-slate-50 [&_select]:px-4 [&_select]:py-3.5 [&_select]:font-semibold [&_select]:outline-none [&_textarea]:min-h-24 [&_textarea]:w-full [&_textarea]:rounded-2xl [&_textarea]:border [&_textarea]:border-slate-200 [&_textarea]:bg-slate-50 [&_textarea]:px-4 [&_textarea]:py-3.5 [&_textarea]:font-semibold [&_textarea]:outline-none">{children}</div></label>; }
function Toggle({ title, text, checked, onChange }: { title: string; text: string; checked: boolean; onChange: (value: boolean) => void }) { return <button type="button" onClick={() => onChange(!checked)} className={`flex min-h-24 items-center justify-between gap-4 rounded-2xl border p-4 text-left transition ${checked ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-50"}`}><span><b className="block text-base text-[#071d43]">{title}</b><small className="mt-1 block font-medium leading-5 text-slate-500">{text}</small></span><span className={`relative h-7 w-12 shrink-0 rounded-full p-1 transition ${checked ? "bg-blue-700" : "bg-slate-300"}`}><span className={`block h-5 w-5 rounded-full bg-white shadow transition ${checked ? "translate-x-5" : ""}`} /></span></button>; }
function Notice({ text }: { text: string }) { return <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-semibold text-amber-800">{text}</div>; }
function Badge({ children, active }: { children: React.ReactNode; active?: boolean }) { return <span className={`rounded-full px-3 py-1 text-xs font-black ${active === false ? "bg-slate-200 text-slate-600" : "bg-blue-100 text-blue-800"}`}>{children}</span>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-slate-50 p-3"><small className="block font-bold text-slate-400">{label}</small><b className="mt-1 block text-sm text-slate-800">{value}</b></div>; }
function Action({ icon, label, onClick, danger = false }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) { return <button type="button" onClick={onClick} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-black transition ${danger ? "text-red-600 hover:bg-red-50" : "text-slate-600 hover:bg-slate-100"}`}>{icon}{label}</button>; }
function destinationLabel(rule: Rule, countries: Option[], provinces: Province[], municipalities: Municipality[], locations: Location[]) { return locations.find((item) => item.id === rule.location_id)?.name || municipalities.find((item) => item.id === rule.municipality_id)?.name || provinces.find((item) => item.id === rule.province_id)?.name || countries.find((item) => item.id === rule.country_id)?.name || "Tarifa general"; }