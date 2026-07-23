"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, Plus, Save, Trash2 } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { createPickupZone, deletePickupZone, getPickupServiceSettings, getPickupZones, replacePickupZoneCities } from "@/lib/services/pickups";
import type { PickupZone } from "@/lib/pickups/types";

const dayLabels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function PickupZonesPage() {
  const { store: selectedStore, loading: storeLoading } = useStore() as any;
  const { store: accessStore, isSuperAdmin, loading: accessLoading } = useAdminAccess();
  const store = isSuperAdmin ? selectedStore || accessStore : accessStore;
  const [zones, setZones] = useState<PickupZone[]>([]);
  const [allowedCities, setAllowedCities] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    if (!store?.id) return;
    setLoading(true);
    const [zonesResult, settingsResult] = await Promise.all([getPickupZones(store.id), getPickupServiceSettings(store.id)]);
    setZones(zonesResult.data as PickupZone[]);
    setAllowedCities((settingsResult.data?.allowed_cities || []).slice().sort());
    setError((zonesResult.error as any)?.message || "");
    setLoading(false);
  }

  useEffect(() => { load(); }, [store?.id]);
  const assigned = useMemo(() => new Set(zones.flatMap((zone) => (zone.cities || []).map((city) => city.city_name.toLowerCase()))), [zones]);

  async function addZone() {
    if (!store?.id || !name.trim()) return;
    setSaving(true);
    const result = await createPickupZone(store.id, { name: name.trim() });
    setSaving(false);
    if (result.error) return setError(result.error.message);
    setName("");
    load();
  }

  async function saveCities(zone: PickupZone, cities: string[]) {
    if (!store?.id) return;
    const result = await replacePickupZoneCities(store.id, zone.id, cities);
    if (result.error) return setError(result.error.message);
    load();
  }

  if (accessLoading || storeLoading || loading) return <div className="p-12 text-center"><Loader2 className="mx-auto animate-spin" /></div>;

  return <div className="space-y-6">
    <header className="rounded-[2rem] bg-[#071d43] p-7 text-white">
      <p className="text-xs font-black uppercase tracking-[.18em] text-blue-200">Organización territorial</p>
      <h1 className="mt-2 text-3xl font-black">Zonas de recogida</h1>
      <p className="mt-2 max-w-2xl text-blue-100/80">Agrupa ciudades por zonas operativas. Una zona puede recorrerse más de una vez por semana según la demanda.</p>
    </header>

    <section className="rounded-[1.6rem] border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Zona Centro" className="h-12 flex-1 rounded-2xl border px-4 font-bold" />
        <button onClick={addZone} disabled={saving} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#071d43] px-5 font-black text-white"><Plus size={18} /> Crear zona</button>
      </div>
    </section>

    {error && <div className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</div>}

    <div className="grid gap-5 xl:grid-cols-2">
      {zones.map((zone) => {
        const selectedCities = (zone.cities || []).map((city) => city.city_name);
        return <article key={zone.id} className="rounded-[1.8rem] border bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div><h2 className="text-xl font-black">{zone.name}</h2><p className="mt-1 text-sm text-slate-500">{selectedCities.length} ciudades asignadas</p></div>
            <button onClick={async () => { if (confirm(`¿Eliminar ${zone.name}?`)) { await deletePickupZone(zone.id, store.id); load(); } }} className="rounded-xl border border-red-200 p-2 text-red-600"><Trash2 size={17} /></button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">{dayLabels.map((day, index) => <span key={day} className={`rounded-full px-3 py-1 text-xs font-black ${(zone.habitual_days || []).includes(index) ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400"}`}>{day}</span>)}</div>
          <div className="mt-5 max-h-72 space-y-2 overflow-auto rounded-2xl border bg-slate-50 p-3">
            {allowedCities.map((city) => {
              const checked = selectedCities.includes(city);
              const occupiedElsewhere = assigned.has(city.toLowerCase()) && !checked;
              return <label key={city} className={`flex items-center justify-between rounded-xl bg-white px-3 py-2 ${occupiedElsewhere ? "opacity-45" : ""}`}>
                <span className="flex items-center gap-2 font-bold"><MapPin size={15} className="text-red-500" />{city}</span>
                <input type="checkbox" checked={checked} disabled={occupiedElsewhere} onChange={(e) => saveCities(zone, e.target.checked ? [...selectedCities, city] : selectedCities.filter((value) => value !== city))} className="h-5 w-5" />
              </label>;
            })}
          </div>
        </article>;
      })}
    </div>
  </div>;
}
