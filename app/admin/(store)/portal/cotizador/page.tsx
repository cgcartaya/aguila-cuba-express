"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Calculator, CheckCircle2, Clock3, Copy, Edit3, Eye, Loader2, MapPin, Package, Plane, Plus, Save, Ship, Trash2, Truck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";

type Option = { id: string; name: string };
type Province = Option & { country_id: string };
type Municipality = Option & { province_id: string };
type Location = Option & { municipality_id: string };
type Rule = {
  id: string; name: string; service_type_id: string | null; country_id: string | null; province_id: string | null;
  municipality_id: string | null; location_id: string | null; item_category: string; transport_mode: string;
  billing_mode: string; rate: number; minimum_weight_lb: number; maximum_weight_lb: number | null;
  minimum_charge: number; fixed_fee: number; estimated_days_min: number | null; estimated_days_max: number | null;
  priority: number; is_active: boolean;
};

const emptyRule = {
  name: "Tarifa aérea general", service_type_id: "", country_id: "", province_id: "", municipality_id: "", location_id: "",
  transport_mode: "air", item_category: "package", billing_mode: "per_lb", rate: 0, minimum_weight_lb: 1,
  maximum_weight_lb: "", minimum_charge: 0, fixed_fee: 0, estimated_days_min: 7, estimated_days_max: 15,
  priority: 100, is_active: true,
};

const modeLabels: Record<string, string> = { air: "Aéreo", sea: "Marítimo", express: "Express", ground: "Terrestre", other: "Otro" };
const categoryLabels: Record<string, string> = { package: "Paquete", appliance: "Electrodoméstico", medicine: "Medicinas", documents: "Documentos", food: "Alimentos", electronics: "Electrónica", other: "Otro" };
const billingLabels: Record<string, string> = { per_lb: "Por libra", fixed: "Precio fijo", per_item: "Por unidad", quote_only: "Cotización manual" };

export default function QuoteSettingsPage() {
  const access = useAdminAccess();
  const storeContext = useStore();
  const store = useMemo(() => access.isSuperAdmin ? (storeContext.store || access.store) : access.store, [access.isSuperAdmin, access.store, storeContext.store]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState<any>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [services, setServices] = useState<Option[]>([]);
  const [countries, setCountries] = useState<Option[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [form, setForm] = useState<any>(emptyRule);
  const [editingId, setEditingId] = useState<string | null>(null);

  const visibleProvinces = provinces.filter((x) => !form.country_id || x.country_id === form.country_id);
  const visibleMunicipalities = municipalities.filter((x) => !form.province_id || x.province_id === form.province_id);
  const visibleLocations = locations.filter((x) => !form.municipality_id || x.municipality_id === form.municipality_id);

  async function load() {
    if (!store?.id) return;
    setLoading(true);
    const [portal, ruleRows, serviceRows, countryRows, provinceRows, municipalityRows, locationRows] = await Promise.all([
      supabase.from("customer_portal_settings").select("*").eq("store_id", store.id).maybeSingle(),
      supabase.from("quote_rate_rules").select("*").eq("store_id", store.id).order("priority").order("created_at", { ascending: false }),
      supabase.from("shipping_service_types").select("id,name").eq("store_id", store.id).eq("is_active", true).order("sort_order"),
      supabase.from("shipping_countries").select("id,name").eq("store_id", store.id).eq("is_active", true).order("sort_order"),
      supabase.from("shipping_provinces").select("id,name,country_id").eq("store_id", store.id).eq("is_active", true).order("sort_order"),
      supabase.from("shipping_municipalities").select("id,name,province_id").eq("store_id", store.id).eq("is_active", true).order("sort_order"),
      supabase.from("shipping_locations").select("id,name,municipality_id").eq("store_id", store.id).eq("is_active", true).order("sort_order"),
    ]);
    setSettings(portal.data || { quote_enabled: true, pickup_enabled: true, pickup_mode: "optional", pickup_fee: 0, currency: "USD", quote_title: "Cotiza tu envío", quote_subtitle: "Obtén un estimado en segundos.", disclaimer: "Cotización estimada. El precio final se confirma al recibir y pesar el envío.", default_origin_label: "Miami, Florida" });
    setRules((ruleRows.data || []) as Rule[]);
    setServices(serviceRows.data || []); setCountries(countryRows.data || []); setProvinces((provinceRows.data || []) as Province[]);
    setMunicipalities((municipalityRows.data || []) as Municipality[]); setLocations((locationRows.data || []) as Location[]);
    setForm((current: any) => ({ ...current, service_type_id: current.service_type_id || serviceRows.data?.[0]?.id || "", country_id: current.country_id || countryRows.data?.[0]?.id || "" }));
    setLoading(false);
  }

  useEffect(() => { void load(); }, [store?.id]);

  async function saveSettings() {
    if (!store?.id || !settings) return;
    setSaving(true); setMessage("");
    const { error } = await supabase.from("customer_portal_settings").upsert({ ...settings, store_id: store.id, updated_at: new Date().toISOString() }, { onConflict: "store_id" });
    setSaving(false); setMessage(error ? error.message : "Configuración guardada correctamente.");
    if (!error) await load();
  }

  async function saveRule(event: FormEvent) {
    event.preventDefault();
    if (!store?.id) return;
    setSaving(true); setMessage("");
    const payload = {
      ...form, store_id: store.id,
      service_type_id: form.service_type_id || null, country_id: form.country_id || null, province_id: form.province_id || null,
      municipality_id: form.municipality_id || null, location_id: form.location_id || null,
      maximum_weight_lb: form.maximum_weight_lb === "" ? null : Number(form.maximum_weight_lb),
      updated_at: new Date().toISOString(),
    };
    const response = editingId
      ? await supabase.from("quote_rate_rules").update(payload).eq("id", editingId).eq("store_id", store.id)
      : await supabase.from("quote_rate_rules").insert(payload);
    setSaving(false); setMessage(response.error ? response.error.message : editingId ? "Tarifa actualizada." : "Tarifa creada.");
    if (!response.error) { setEditingId(null); setForm({ ...emptyRule, service_type_id: services[0]?.id || "", country_id: countries[0]?.id || "" }); await load(); }
  }

  function editRule(rule: Rule) {
    setEditingId(rule.id);
    setForm({ ...rule, service_type_id: rule.service_type_id || "", country_id: rule.country_id || "", province_id: rule.province_id || "", municipality_id: rule.municipality_id || "", location_id: rule.location_id || "", maximum_weight_lb: rule.maximum_weight_lb ?? "" });
    window.scrollTo({ top: 520, behavior: "smooth" });
  }

  async function duplicateRule(rule: Rule) {
    if (!store?.id) return;
    const { id, ...copy } = rule;
    await supabase.from("quote_rate_rules").insert({ ...copy, store_id: store.id, name: `${rule.name} (copia)`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    await load();
  }

  async function toggleRule(rule: Rule) {
    await supabase.from("quote_rate_rules").update({ is_active: !rule.is_active, updated_at: new Date().toISOString() }).eq("id", rule.id);
    await load();
  }

  async function deleteRule(id: string) {
    if (!confirm("¿Eliminar esta regla de tarifa?")) return;
    await supabase.from("quote_rate_rules").delete().eq("id", id);
    await load();
  }

  if (loading) return <div className="flex min-h-[420px] items-center justify-center"><Loader2 className="animate-spin text-blue-700" size={38} /></div>;

  return <main className="mx-auto max-w-[1500px] space-y-7 pb-12 text-slate-900">
    <header className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#071d43] via-[#0b3473] to-[#0d62b8] p-7 text-white shadow-xl sm:p-9">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div><div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-[.16em]"><Calculator size={15}/> Portal del cliente</div><h1 className="mt-4 text-3xl font-black sm:text-4xl">Cotizador público</h1><p className="mt-2 max-w-3xl text-base font-medium text-blue-100">Configura precios aéreos, marítimos y especiales por destino. La landing y la página /cotizar usarán exactamente estas reglas.</p></div>
        <a href="/cotizar" target="_blank" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-[#071d43] shadow-lg"><Eye size={18}/> Ver cotizador público</a>
      </div>
    </header>

    {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 font-bold text-emerald-800">{message}</div>}

    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <SectionHeading icon={<CheckCircle2/>} title="Configuración pública" text="Estos textos y ajustes aparecen directamente en la landing y en el portal de cotización." />
      <div className="mt-7 grid gap-5 xl:grid-cols-3">
        <ToggleCard title="Cotizador activo" text="Permite que los clientes calculen y guarden cotizaciones." checked={!!settings?.quote_enabled} onChange={(value) => setSettings({ ...settings, quote_enabled: value })}/>
        <ToggleCard title="Recogida activa" text="Muestra la opción de recogida a domicilio." checked={!!settings?.pickup_enabled} onChange={(value) => setSettings({ ...settings, pickup_enabled: value })}/>
        <ToggleCard title="WhatsApp activo" text="Permite compartir el resultado con la agencia." checked={settings?.whatsapp_enabled !== false} onChange={(value) => setSettings({ ...settings, whatsapp_enabled: value })}/>
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Título público"><input value={settings?.quote_title || ""} onChange={(e) => setSettings({ ...settings, quote_title: e.target.value })}/></Field>
        <Field label="Subtítulo"><input value={settings?.quote_subtitle || ""} onChange={(e) => setSettings({ ...settings, quote_subtitle: e.target.value })}/></Field>
        <Field label="WhatsApp de la agencia"><input value={settings?.whatsapp_phone || ""} onChange={(e) => setSettings({ ...settings, whatsapp_phone: e.target.value })} placeholder="13055551234"/></Field>
        <Field label="Origen predeterminado"><input value={settings?.default_origin_label || ""} onChange={(e) => setSettings({ ...settings, default_origin_label: e.target.value })}/></Field>
        <Field label="Modalidad de recogida"><select value={settings?.pickup_mode || "optional"} onChange={(e) => setSettings({ ...settings, pickup_mode: e.target.value })}><option value="disabled">Desactivada</option><option value="free">Gratis</option><option value="paid">Obligatoria con cargo</option><option value="optional">Opcional con cargo</option></select></Field>
        <Field label="Fee de recogida"><input type="number" min="0" step="0.01" value={settings?.pickup_fee || 0} onChange={(e) => setSettings({ ...settings, pickup_fee: Number(e.target.value) })}/></Field>
        <Field label="Moneda"><select value={settings?.currency || "USD"} onChange={(e) => setSettings({ ...settings, currency: e.target.value })}><option value="USD">USD</option><option value="EUR">EUR</option><option value="CUP">CUP</option></select></Field>
        <Field label="Texto legal" wide><textarea value={settings?.disclaimer || ""} onChange={(e) => setSettings({ ...settings, disclaimer: e.target.value })}/></Field>
      </div>
      <button onClick={saveSettings} disabled={saving} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#071d43] px-6 py-3.5 font-black text-white shadow-lg disabled:opacity-60">{saving ? <Loader2 className="animate-spin"/> : <Save size={19}/>} Guardar configuración</button>
    </section>

    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <SectionHeading icon={form.transport_mode === "sea" ? <Ship/> : form.transport_mode === "ground" ? <Truck/> : <Plane/>} title={editingId ? "Editar regla de tarifa" : "Nueva regla de tarifa"} text="La regla más específica por lugar, municipio o provincia tendrá prioridad sobre la tarifa general." />
      <form onSubmit={saveRule} className="mt-7 space-y-7">
        <div><MiniHeading title="Servicio y modalidad"/><div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Nombre de la regla"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/></Field>
          <Field label="Servicio"><select value={form.service_type_id} onChange={(e) => setForm({ ...form, service_type_id: e.target.value })}>{services.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
          <Field label="Método de transporte"><select value={form.transport_mode} onChange={(e) => setForm({ ...form, transport_mode: e.target.value })}><option value="air">Aéreo</option><option value="sea">Marítimo</option><option value="express">Express</option><option value="ground">Terrestre</option><option value="other">Otro</option></select></Field>
          <Field label="Tipo de contenido"><select value={form.item_category} onChange={(e) => setForm({ ...form, item_category: e.target.value })}><option value="package">Paquete normal</option><option value="appliance">Electrodoméstico</option><option value="medicine">Medicinas</option><option value="documents">Documentos</option><option value="food">Alimentos</option><option value="electronics">Electrónica</option><option value="other">Otro</option></select></Field>
        </div></div>

        <div><MiniHeading title="Destino al que aplica"/><div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Field label="País"><select value={form.country_id} onChange={(e) => setForm({ ...form, country_id: e.target.value, province_id: "", municipality_id: "", location_id: "" })}><option value="">Todos los países</option>{countries.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
          <Field label="Provincia"><select value={form.province_id} onChange={(e) => setForm({ ...form, province_id: e.target.value, municipality_id: "", location_id: "" })}><option value="">Todas las provincias</option>{visibleProvinces.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
          <Field label="Municipio"><select value={form.municipality_id} onChange={(e) => setForm({ ...form, municipality_id: e.target.value, location_id: "" })}><option value="">Todos los municipios</option>{visibleMunicipalities.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
          <Field label="Lugar"><select value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })}><option value="">Todos los lugares</option>{visibleLocations.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        </div></div>

        <div><MiniHeading title="Precio, mínimos y entrega"/><div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Forma de cobro"><select value={form.billing_mode} onChange={(e) => setForm({ ...form, billing_mode: e.target.value })}><option value="per_lb">Por libra</option><option value="fixed">Precio fijo</option><option value="per_item">Por unidad</option><option value="quote_only">Cotización manual</option></select></Field>
          <Field label="Tarifa"><input type="number" min="0" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })}/></Field>
          <Field label="Peso mínimo facturable (lb)"><input type="number" min="0" step="0.1" value={form.minimum_weight_lb} onChange={(e) => setForm({ ...form, minimum_weight_lb: Number(e.target.value) })}/></Field>
          <Field label="Peso máximo (opcional)"><input type="number" min="0" step="0.1" value={form.maximum_weight_lb} onChange={(e) => setForm({ ...form, maximum_weight_lb: e.target.value })}/></Field>
          <Field label="Cobro mínimo"><input type="number" min="0" step="0.01" value={form.minimum_charge} onChange={(e) => setForm({ ...form, minimum_charge: Number(e.target.value) })}/></Field>
          <Field label="Fee fijo adicional"><input type="number" min="0" step="0.01" value={form.fixed_fee} onChange={(e) => setForm({ ...form, fixed_fee: Number(e.target.value) })}/></Field>
          <Field label="Entrega mínima (días)"><input type="number" min="0" value={form.estimated_days_min ?? ""} onChange={(e) => setForm({ ...form, estimated_days_min: e.target.value === "" ? null : Number(e.target.value) })}/></Field>
          <Field label="Entrega máxima (días)"><input type="number" min="0" value={form.estimated_days_max ?? ""} onChange={(e) => setForm({ ...form, estimated_days_max: e.target.value === "" ? null : Number(e.target.value) })}/></Field>
          <Field label="Prioridad"><input type="number" min="1" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}/></Field>
          <ToggleCard title="Regla activa" text="Disponible inmediatamente para los clientes." checked={!!form.is_active} onChange={(value) => setForm({ ...form, is_active: value })}/>
        </div></div>

        <div className="flex flex-wrap gap-3"><button disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 font-black text-white shadow-lg disabled:opacity-60">{saving ? <Loader2 className="animate-spin"/> : editingId ? <Save/> : <Plus/>}{editingId ? " Guardar cambios" : " Crear regla"}</button>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ ...emptyRule, service_type_id: services[0]?.id || "", country_id: countries[0]?.id || "" }); }} className="rounded-2xl border border-slate-300 px-6 py-3.5 font-black">Cancelar edición</button>}</div>
      </form>
    </section>

    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <SectionHeading icon={<Package/>} title="Tarifas configuradas" text={`${rules.length} reglas disponibles para esta empresa.`}/>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {rules.map((rule) => <article key={rule.id} className={`rounded-3xl border p-5 transition ${rule.is_active ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50 opacity-70"}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-black ${rule.transport_mode === "sea" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}>{modeLabels[rule.transport_mode] || rule.transport_mode}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{categoryLabels[rule.item_category] || rule.item_category}</span><span className={`rounded-full px-3 py-1 text-xs font-black ${rule.is_active ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-600"}`}>{rule.is_active ? "Activa" : "Inactiva"}</span></div><h3 className="mt-3 text-xl font-black text-[#071d43]">{rule.name}</h3><p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-500"><MapPin size={15}/>{destinationLabel(rule, countries, provinces, municipalities, locations)}</p></div><div className="text-left sm:text-right"><p className="text-xs font-black uppercase tracking-wider text-slate-400">{billingLabels[rule.billing_mode]}</p><p className="mt-1 text-3xl font-black text-[#071d43]">${Number(rule.rate).toFixed(2)}{rule.billing_mode === "per_lb" ? "/lb" : ""}</p></div></div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Peso mínimo" value={`${rule.minimum_weight_lb || 0} lb`}/><Stat label="Cobro mínimo" value={`$${Number(rule.minimum_charge || 0).toFixed(2)}`}/><Stat label="Fee fijo" value={`$${Number(rule.fixed_fee || 0).toFixed(2)}`}/><Stat label="Entrega" value={rule.estimated_days_min || rule.estimated_days_max ? `${rule.estimated_days_min ?? "?"}-${rule.estimated_days_max ?? "?"} días` : "Sin definir"}/></div>
          <div className="mt-5 flex flex-wrap gap-2 border-t pt-4"><Action icon={<Edit3/>} label="Editar" onClick={() => editRule(rule)}/><Action icon={<Copy/>} label="Duplicar" onClick={() => void duplicateRule(rule)}/><Action icon={<CheckCircle2/>} label={rule.is_active ? "Desactivar" : "Activar"} onClick={() => void toggleRule(rule)}/><Action danger icon={<Trash2/>} label="Eliminar" onClick={() => void deleteRule(rule.id)}/></div>
        </article>)}
        {!rules.length && <div className="col-span-full rounded-3xl border-2 border-dashed border-slate-200 p-10 text-center"><Calculator className="mx-auto text-slate-300" size={44}/><h3 className="mt-4 text-xl font-black">Todavía no hay tarifas</h3><p className="mt-2 text-slate-500">Crea primero una tarifa aérea o marítima general.</p></div>}
      </div>
    </section>
  </main>;
}

function SectionHeading({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">{icon}</div><div><h2 className="text-2xl font-black text-[#071d43]">{title}</h2><p className="mt-1 text-sm font-medium text-slate-500 sm:text-base">{text}</p></div></div>; }
function MiniHeading({ title }: { title: string }) { return <h3 className="border-b border-slate-100 pb-3 text-sm font-black uppercase tracking-[.12em] text-blue-700">{title}</h3>; }
function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) { return <label className={`block text-sm font-black text-slate-700 ${wide ? "md:col-span-2 xl:col-span-3" : ""}`}>{label}<div className="mt-2 [&_input]:w-full [&_input]:rounded-2xl [&_input]:border [&_input]:border-slate-200 [&_input]:bg-slate-50 [&_input]:px-4 [&_input]:py-3.5 [&_input]:font-semibold [&_input]:outline-none [&_input]:transition focus-within:[&_input]:border-blue-500 [&_select]:w-full [&_select]:rounded-2xl [&_select]:border [&_select]:border-slate-200 [&_select]:bg-slate-50 [&_select]:px-4 [&_select]:py-3.5 [&_select]:font-semibold [&_select]:outline-none [&_textarea]:min-h-24 [&_textarea]:w-full [&_textarea]:rounded-2xl [&_textarea]:border [&_textarea]:border-slate-200 [&_textarea]:bg-slate-50 [&_textarea]:px-4 [&_textarea]:py-3.5 [&_textarea]:font-semibold [&_textarea]:outline-none">{children}</div></label>; }
function ToggleCard({ title, text, checked, onChange }: { title: string; text: string; checked: boolean; onChange: (value: boolean) => void }) { return <button type="button" onClick={() => onChange(!checked)} className={`flex min-h-24 items-center justify-between gap-4 rounded-2xl border p-4 text-left transition ${checked ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-50"}`}><span><b className="block text-base text-[#071d43]">{title}</b><small className="mt-1 block font-medium leading-5 text-slate-500">{text}</small></span><span className={`relative h-7 w-12 shrink-0 rounded-full p-1 transition ${checked ? "bg-blue-700" : "bg-slate-300"}`}><span className={`block h-5 w-5 rounded-full bg-white shadow transition ${checked ? "translate-x-5" : ""}`}/></span></button>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-slate-50 p-3"><small className="block font-bold text-slate-400">{label}</small><b className="mt-1 block text-sm text-slate-800">{value}</b></div>; }
function Action({ icon, label, onClick, danger = false }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) { return <button type="button" onClick={onClick} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-black transition ${danger ? "text-red-600 hover:bg-red-50" : "text-slate-600 hover:bg-slate-100"}`}>{icon}{label}</button>; }
function destinationLabel(rule: Rule, countries: Option[], provinces: Province[], municipalities: Municipality[], locations: Location[]) { return locations.find((x) => x.id === rule.location_id)?.name || municipalities.find((x) => x.id === rule.municipality_id)?.name || provinces.find((x) => x.id === rule.province_id)?.name || countries.find((x) => x.id === rule.country_id)?.name || "Tarifa general"; }
