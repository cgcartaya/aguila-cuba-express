"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, CheckCircle2, Globe2, Loader2, MapPin, Save, Search } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { getPickupServiceSettings, upsertPickupServiceSettings } from "@/lib/services/pickups";
import { getCityOptions, getCountryName, getCountryOptions, getStateName, getStateOptions } from "@/lib/geo/location-catalog";
import type { PickupServiceSettings } from "@/lib/pickups/types";

const defaults: Partial<PickupServiceSettings> = {
  is_enabled: true,
  country_code: "US",
  country_name: "United States",
  region_name: "South Carolina",
  region_code: "SC",
  base_city: "Hopkins",
  timezone: "America/New_York",
  currency_code: "USD",
  pickup_fee: 0,
  max_preferred_dates: 3,
  coverage_mode: "region",
  city_selection_mode: "all_region",
  allowed_cities: [],
  allowed_postal_codes: [],
  require_verified_address: false,
  address_validation_provider: "manual",
  public_headline: "Recogemos en tu puerta",
  public_description: "Selecciona los días que te convienen y confirmaremos la ruta final.",
};

export default function PickupSettingsPage() {
  const { store: selectedStore, loading: storeLoading } = useStore() as any;
  const { store: accessStore, isSuperAdmin, loading: accessLoading } = useAdminAccess();
  const store = isSuperAdmin ? selectedStore || accessStore : accessStore;
  const [form, setForm] = useState<Partial<PickupServiceSettings>>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [citySearch, setCitySearch] = useState("");

  useEffect(() => {
    if (!store?.id) return;
    (async () => {
      setLoading(true);
      const result = await getPickupServiceSettings(store.id);
      if (result.error) setError(result.error.message);
      setForm(result.data ? { ...defaults, ...result.data } : defaults);
      setLoading(false);
    })();
  }, [store?.id]);

  const countries = useMemo(() => getCountryOptions(), []);
  const states = useMemo(() => getStateOptions(form.country_code || ""), [form.country_code]);
  const cities = useMemo(() => getCityOptions(form.country_code || "", form.region_code || ""), [form.country_code, form.region_code]);
  const filteredCities = useMemo(() => {
    const query = citySearch.trim().toLocaleLowerCase();
    return query ? cities.filter((city) => city.label.toLocaleLowerCase().includes(query)) : cities;
  }, [cities, citySearch]);

  function update<K extends keyof PickupServiceSettings>(key: K, value: PickupServiceSettings[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function chooseCountry(code: string) {
    const nextStates = getStateOptions(code);
    const nextState = nextStates[0];
    setForm((current) => ({
      ...current,
      country_code: code,
      country_name: getCountryName(code),
      region_code: nextState?.value || "",
      region_name: nextState?.label || "",
      base_city: null,
      allowed_cities: [],
    }));
  }

  function chooseState(code: string) {
    setForm((current) => ({
      ...current,
      region_code: code,
      region_name: getStateName(current.country_code || "", code),
      base_city: null,
      allowed_cities: [],
    }));
  }

  function toggleCity(name: string) {
    const current = form.allowed_cities || [];
    update("allowed_cities", current.includes(name) ? current.filter((city) => city !== name) : [...current, name]);
  }

  async function save() {
    if (!store?.id) return;
    setSaving(true); setMessage(""); setError("");
    const selectedMode = form.city_selection_mode || "all_region";
    if (!form.country_code || !form.region_code) {
      setError("Selecciona un país y un estado o provincia."); setSaving(false); return;
    }
    if (selectedMode === "selected" && !(form.allowed_cities || []).length) {
      setError("Selecciona al menos una ciudad o usa cobertura de todo el estado."); setSaving(false); return;
    }
    const result = await upsertPickupServiceSettings(store.id, {
      ...form,
      country_name: getCountryName(form.country_code),
      region_name: getStateName(form.country_code, form.region_code),
      coverage_mode: selectedMode === "selected" ? "cities" : "region",
      allowed_cities: selectedMode === "selected" ? form.allowed_cities || [] : [],
      pickup_fee: Number(form.pickup_fee) || 0,
      max_preferred_dates: Math.max(1, Math.min(7, Number(form.max_preferred_dates) || 3)),
      require_verified_address: false,
      address_validation_provider: "manual",
    });
    if (result.error) setError(result.error.message);
    else setMessage("Cobertura y ciudades guardadas correctamente.");
    setSaving(false);
  }

  if (accessLoading || storeLoading || loading) return <div className="rounded-[2rem] border bg-white p-12 text-center font-bold text-slate-500"><Loader2 className="mx-auto mb-3 animate-spin" />Cargando configuración...</div>;

  return <div className="space-y-6">
    <header className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#061b3a] via-[#0a3474] to-[#1174c4] p-6 text-white shadow-xl sm:p-8">
      <Link href="/admin/pickups" className="inline-flex items-center gap-2 text-sm font-black text-blue-100"><ArrowLeft size={17}/> Volver a solicitudes</Link>
      <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="text-xs font-black uppercase tracking-[.18em] text-blue-200">Cobertura automática</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">País, estado y ciudades</h1><p className="mt-3 max-w-2xl font-semibold text-blue-100/75">Elige la ubicación del negocio y Perla cargará automáticamente las ciudades disponibles.</p></div><button onClick={save} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-[#061b3a] disabled:opacity-60">{saving?<Loader2 className="animate-spin" size={18}/>:<Save size={18}/>} Guardar cambios</button></div>
    </header>
    {message&&<div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-800"><CheckCircle2 size={20}/>{message}</div>}
    {error&&<div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">{error}</div>}

    <section className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <div className="space-y-5">
        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3"><Globe2 className="text-blue-700"/><div><h2 className="text-xl font-black">Ubicación del servicio</h2><p className="text-sm font-semibold text-slate-500">Catálogo internacional sin Google Maps.</p></div></div>
          <div className="mt-5 space-y-4">
            <Field label="País"><select value={form.country_code||""} onChange={(e)=>chooseCountry(e.target.value)} className="input">{countries.map((country)=><option key={country.value} value={country.value}>{country.label}</option>)}</select></Field>
            <Field label="Estado / provincia"><select value={form.region_code||""} onChange={(e)=>chooseState(e.target.value)} className="input">{states.map((state)=><option key={state.value} value={state.value}>{state.label}</option>)}</select></Field>
            <Field label="Ciudad base"><select value={form.base_city||""} onChange={(e)=>update("base_city",e.target.value)} className="input"><option value="">Seleccionar...</option>{cities.map((city)=><option key={city.value} value={city.value}>{city.label}</option>)}</select></Field>
          </div>
        </div>
        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">Reglas rápidas</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1"><Field label="Cargo de recogida"><input type="number" min="0" step=".01" value={form.pickup_fee??0} onChange={(e)=>update("pickup_fee",Number(e.target.value))} className="input"/></Field><Field label="Máximo de fechas preferidas"><input type="number" min="1" max="7" value={form.max_preferred_dates??3} onChange={(e)=>update("max_preferred_dates",Number(e.target.value))} className="input"/></Field></div>
        </div>
      </div>

      <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3"><MapPin className="text-red-600"/><div><h2 className="text-xl font-black">Ciudades cubiertas</h2><p className="text-sm font-semibold text-slate-500">Encontramos {cities.length} ciudades en {form.region_name}.</p></div></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button onClick={()=>update("city_selection_mode","all_region")} className={`rounded-2xl border p-4 text-left ${form.city_selection_mode!=="selected"?"border-blue-500 bg-blue-50":"border-slate-200"}`}><p className="font-black">Todo el estado o provincia</p><p className="mt-1 text-sm font-semibold text-slate-500">El cliente podrá elegir cualquiera de las {cities.length} ciudades.</p></button>
          <button onClick={()=>update("city_selection_mode","selected")} className={`rounded-2xl border p-4 text-left ${form.city_selection_mode==="selected"?"border-blue-500 bg-blue-50":"border-slate-200"}`}><p className="font-black">Solo ciudades seleccionadas</p><p className="mt-1 text-sm font-semibold text-slate-500">Ideal para una cobertura parcial.</p></button>
        </div>
        {form.city_selection_mode==="selected"&&<div className="mt-5">
          <label className="relative block"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input value={citySearch} onChange={(e)=>setCitySearch(e.target.value)} placeholder="Buscar ciudad..." className="input pl-11"/></label>
          <div className="mt-3 flex items-center justify-between text-sm font-bold text-slate-500"><span>{(form.allowed_cities||[]).length} seleccionada(s)</span><button onClick={()=>update("allowed_cities",filteredCities.map((city)=>city.label))} className="text-blue-700">Seleccionar visibles</button></div>
          <div className="mt-3 grid max-h-[480px] gap-2 overflow-y-auto rounded-2xl border bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-3">{filteredCities.map((city)=>{const active=(form.allowed_cities||[]).includes(city.label);return <button key={city.value} onClick={()=>toggleCity(city.label)} className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm font-bold ${active?"border-blue-500 bg-blue-600 text-white":"border-slate-200 bg-white text-slate-700"}`}><span>{city.label}</span>{active&&<Check size={16}/>}</button>})}</div>
        </div>}
      </div>
    </section>
    <style jsx global>{`.input{width:100%;border:1px solid #cbd5e1;border-radius:1rem;background:white;padding:.8rem 1rem;font-weight:700;outline:none}.input:focus{border-color:#60a5fa;box-shadow:0 0 0 4px #dbeafe}`}</style>
  </div>;
}

function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className="mb-2 block text-sm font-black text-slate-700">{label}</span>{children}</label>}
