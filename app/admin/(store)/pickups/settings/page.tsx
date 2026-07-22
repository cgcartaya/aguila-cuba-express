"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Globe2,
  Loader2,
  MapPin,
  Save,
  ShieldCheck,
} from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import {
  getPickupServiceSettings,
  upsertPickupServiceSettings,
} from "@/lib/services/pickups";
import type {
  AddressValidationProvider,
  PickupCoverageMode,
  PickupServiceSettings,
} from "@/lib/pickups/types";

const defaults: Partial<PickupServiceSettings> = {
  is_enabled: true,
  country_code: "US",
  country_name: "Estados Unidos",
  region_name: "South Carolina",
  region_code: "SC",
  base_city: "Hopkins",
  timezone: "America/New_York",
  currency_code: "USD",
  pickup_fee: 0,
  max_preferred_dates: 3,
  coverage_mode: "region",
  allowed_cities: [],
  allowed_postal_codes: [],
  require_verified_address: true,
  address_validation_provider: "auto",
  public_headline: "Recogemos en tu puerta",
  public_description: "Selecciona los días que te convienen y confirmaremos la ruta final.",
};

function parseList(value: string) {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function PickupSettingsPage() {
  const { store: selectedStore, loading: storeLoading } = useStore() as any;
  const { store: accessStore, isSuperAdmin, loading: accessLoading } = useAdminAccess();
  const store = isSuperAdmin ? selectedStore || accessStore : accessStore;
  const [form, setForm] = useState<Partial<PickupServiceSettings>>(defaults);
  const [citiesText, setCitiesText] = useState("");
  const [postalText, setPostalText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!store?.id) return;
    (async () => {
      setLoading(true);
      const result = await getPickupServiceSettings(store.id);
      if (result.error) setError(result.error.message);
      const data = result.data ? { ...defaults, ...result.data } : defaults;
      setForm(data);
      setCitiesText((data.allowed_cities || []).join(", "));
      setPostalText((data.allowed_postal_codes || []).join(", "));
      setLoading(false);
    })();
  }, [store?.id]);

  const coverageHint = useMemo(() => {
    if (form.coverage_mode === "country") return `Toda la cobertura del país ${form.country_name || form.country_code || "configurado"}.`;
    if (form.coverage_mode === "region") return `Solo direcciones dentro de ${form.region_name || form.region_code || "la región configurada"}.`;
    if (form.coverage_mode === "cities") return `${parseList(citiesText).length} ciudad(es) permitida(s).`;
    if (form.coverage_mode === "postal_codes") return `${parseList(postalText).length} código(s) postal(es) permitido(s).`;
    return `Radio de ${form.coverage_radius_km || 0} km desde el punto base.`;
  }, [form, citiesText, postalText]);

  function update<K extends keyof PickupServiceSettings>(key: K, value: PickupServiceSettings[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (!store?.id) return;
    setSaving(true);
    setMessage("");
    setError("");
    const result = await upsertPickupServiceSettings(store.id, {
      ...form,
      allowed_cities: parseList(citiesText),
      allowed_postal_codes: parseList(postalText),
      pickup_fee: Number(form.pickup_fee) || 0,
      max_preferred_dates: Math.max(1, Math.min(7, Number(form.max_preferred_dates) || 3)),
      coverage_radius_km: form.coverage_radius_km == null ? null : Number(form.coverage_radius_km),
      base_latitude: form.base_latitude == null ? null : Number(form.base_latitude),
      base_longitude: form.base_longitude == null ? null : Number(form.base_longitude),
    });
    if (result.error) setError(result.error.message);
    else setMessage("Configuración de recogidas guardada correctamente.");
    setSaving(false);
  }

  if (accessLoading || storeLoading || loading) {
    return <div className="rounded-[2rem] border bg-white p-12 text-center font-bold text-slate-500"><Loader2 className="mx-auto mb-3 animate-spin" />Cargando configuración...</div>;
  }

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#061b3a] via-[#0a3474] to-[#1174c4] p-6 text-white shadow-xl sm:p-8">
        <Link href="/admin/pickups" className="inline-flex items-center gap-2 text-sm font-black text-blue-100"><ArrowLeft size={17} /> Volver a solicitudes</Link>
        <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">Cobertura y validación</p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">Configuración de recogidas</h1>
            <p className="mt-3 max-w-2xl font-semibold text-blue-100/75">Define dónde opera la agencia y cómo deben validarse las direcciones. Esta configuración funciona para cualquier país o región.</p>
          </div>
          <button onClick={save} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-[#061b3a] disabled:opacity-60">{saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Guardar cambios</button>
        </div>
      </header>

      {message && <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-800"><CheckCircle2 size={20} /> {message}</div>}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">{error}</div>}

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3"><Globe2 className="text-blue-700" /><div><h2 className="text-xl font-black">Ubicación principal</h2><p className="text-sm font-semibold text-slate-500">La base geográfica del servicio.</p></div></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Código de país"><input value={form.country_code || ""} onChange={(e) => update("country_code", e.target.value.toUpperCase())} maxLength={2} className="input" /></Field>
            <Field label="Nombre del país"><input value={form.country_name || ""} onChange={(e) => update("country_name", e.target.value)} className="input" /></Field>
            <Field label="Estado / provincia"><input value={form.region_name || ""} onChange={(e) => update("region_name", e.target.value)} className="input" /></Field>
            <Field label="Código región"><input value={form.region_code || ""} onChange={(e) => update("region_code", e.target.value.toUpperCase())} className="input" /></Field>
            <Field label="Ciudad base"><input value={form.base_city || ""} onChange={(e) => update("base_city", e.target.value)} className="input" /></Field>
            <Field label="Zona horaria"><input value={form.timezone || ""} onChange={(e) => update("timezone", e.target.value)} className="input" /></Field>
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3"><MapPin className="text-red-600" /><div><h2 className="text-xl font-black">Área de cobertura</h2><p className="text-sm font-semibold text-slate-500">Escoge cómo decide el sistema si una dirección es válida.</p></div></div>
          <div className="mt-5 space-y-4">
            <Field label="Modo de cobertura">
              <select value={form.coverage_mode || "region"} onChange={(e) => update("coverage_mode", e.target.value as PickupCoverageMode)} className="input">
                <option value="country">Todo el país</option>
                <option value="region">Estado o provincia</option>
                <option value="cities">Lista de ciudades</option>
                <option value="postal_codes">Códigos postales</option>
                <option value="radius">Radio desde la base</option>
              </select>
            </Field>
            {form.coverage_mode === "cities" && <Field label="Ciudades permitidas"><textarea value={citiesText} onChange={(e) => setCitiesText(e.target.value)} rows={4} placeholder="Columbia, Lexington, Charleston" className="input h-auto" /></Field>}
            {form.coverage_mode === "postal_codes" && <Field label="Códigos postales permitidos"><textarea value={postalText} onChange={(e) => setPostalText(e.target.value)} rows={4} placeholder="29201, 29073, 29401" className="input h-auto" /></Field>}
            {form.coverage_mode === "radius" && <div className="grid gap-3 sm:grid-cols-3"><Field label="Latitud"><input type="number" step="any" value={form.base_latitude ?? ""} onChange={(e) => update("base_latitude", e.target.value ? Number(e.target.value) : null)} className="input" /></Field><Field label="Longitud"><input type="number" step="any" value={form.base_longitude ?? ""} onChange={(e) => update("base_longitude", e.target.value ? Number(e.target.value) : null)} className="input" /></Field><Field label="Radio km"><input type="number" min="1" value={form.coverage_radius_km ?? ""} onChange={(e) => update("coverage_radius_km", e.target.value ? Number(e.target.value) : null)} className="input" /></Field></div>}
            <div className="rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-900">{coverageHint}</div>
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3"><ShieldCheck className="text-emerald-600" /><div><h2 className="text-xl font-black">Validación de dirección</h2><p className="text-sm font-semibold text-slate-500">Controla qué tan estricta será la comprobación.</p></div></div>
          <div className="mt-5 space-y-4">
            <Field label="Proveedor">
              <select value={form.address_validation_provider || "auto"} onChange={(e) => update("address_validation_provider", e.target.value as AddressValidationProvider)} className="input">
                <option value="auto">Automático: Google y alternativa postal</option>
                <option value="google">Google Maps únicamente</option>
                <option value="postal">Código postal, recomendado para EE. UU.</option>
                <option value="manual">Manual, sin verificación externa</option>
              </select>
            </Field>
            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4"><input type="checkbox" checked={Boolean(form.require_verified_address)} onChange={(e) => update("require_verified_address", e.target.checked)} className="mt-1 h-5 w-5" /><span><strong className="block">Exigir dirección verificada</strong><span className="text-sm font-semibold text-slate-500">Impide guardar combinaciones incoherentes de ciudad, región y código postal.</span></span></label>
            <p className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900">Para autocompletado y coordenadas exactas agrega <code>GOOGLE_MAPS_SERVER_API_KEY</code> en Vercel. Sin esa clave, en Estados Unidos se valida ciudad, estado y ZIP mediante el proveedor postal.</p>
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">Experiencia pública</h2>
          <div className="mt-5 grid gap-4">
            <Field label="Título"><input value={form.public_headline || ""} onChange={(e) => update("public_headline", e.target.value)} className="input" /></Field>
            <Field label="Descripción"><textarea value={form.public_description || ""} onChange={(e) => update("public_description", e.target.value)} rows={3} className="input h-auto" /></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Cargo de recogida"><input type="number" min="0" step="0.01" value={form.pickup_fee ?? 0} onChange={(e) => update("pickup_fee", Number(e.target.value))} className="input" /></Field><Field label="Máximo de fechas"><input type="number" min="1" max="7" value={form.max_preferred_dates ?? 3} onChange={(e) => update("max_preferred_dates", Number(e.target.value))} className="input" /></Field></div>
          </div>
        </div>
      </section>

      <style jsx>{`.input{width:100%;border:1px solid rgb(226 232 240);border-radius:1rem;background:white;padding:.8rem 1rem;font-weight:700;outline:none}.input:focus{border-color:rgb(96 165 250);box-shadow:0 0 0 4px rgb(219 234 254)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-black text-slate-700">{label}</span>{children}</label>;
}
