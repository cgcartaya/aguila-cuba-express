"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPinned,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import {
  createPickupZone,
  deletePickupZone,
  getPickupZones,
  replacePickupZoneCities,
  updatePickupZone,
} from "@/lib/services/pickups";
import type { PickupZone } from "@/lib/pickups/types";

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const COLORS = ["#ef4444", "#2563eb", "#16a34a", "#f59e0b", "#7c3aed", "#0f766e"];

const SOUTH_CAROLINA_COUNTIES = [
  "Abbeville", "Aiken", "Allendale", "Anderson", "Bamberg", "Barnwell", "Beaufort", "Berkeley",
  "Calhoun", "Charleston", "Cherokee", "Chester", "Chesterfield", "Clarendon", "Colleton", "Darlington",
  "Dillon", "Dorchester", "Edgefield", "Fairfield", "Florence", "Georgetown", "Greenville", "Greenwood",
  "Hampton", "Horry", "Jasper", "Kershaw", "Lancaster", "Laurens", "Lee", "Lexington", "Marion",
  "Marlboro", "McCormick", "Newberry", "Oconee", "Orangeburg", "Pickens", "Richland", "Saluda",
  "Spartanburg", "Sumter", "Union", "Williamsburg", "York", "Myrtle Beach", "Columbia"
];

const PRESETS = [
  {
    id: "sc-west",
    label: "Carolina del Sur · Zona Oeste",
    cities: ["Oconee", "Pickens", "Anderson", "Greenville", "Spartanburg", "Union", "Laurens", "Greenwood", "Abbeville", "McCormick", "Edgefield", "Newberry", "Cherokee"],
  },
  {
    id: "sc-east",
    label: "Carolina del Sur · Zona Este",
    cities: ["Myrtle Beach", "Horry", "Marion", "Florence", "Dillon", "Darlington", "Williamsburg", "Georgetown", "Lee", "Chesterfield", "Marlboro"],
  },
  {
    id: "sc-south",
    label: "Carolina del Sur · Zona Sur",
    cities: ["Charleston", "Berkeley", "Dorchester", "Colleton", "Beaufort", "Jasper", "Hampton", "Allendale", "Bamberg", "Barnwell", "Orangeburg", "Aiken"],
  },
  {
    id: "sc-north",
    label: "Carolina del Sur · Zona Norte",
    cities: ["Columbia", "Richland", "Lexington", "Fairfield", "York", "Lancaster", "Chester", "Kershaw", "Sumter", "Calhoun"],
  },
];

type ZoneDraft = {
  name: string;
  description: string;
  color: string;
  habitualDays: number[];
  isActive: boolean;
  cities: string[];
  expanded: boolean;
  search: string;
  selected: string[];
  bulkText: string;
};

function normalize(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function unique(values: string[]) {
  const map = new Map<string, string>();
  for (const raw of values) {
    const value = normalize(raw);
    if (value) map.set(value.toLocaleLowerCase("es"), value);
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, "es"));
}

function fromZone(zone: PickupZone): ZoneDraft {
  return {
    name: zone.name || "",
    description: zone.description || "",
    color: zone.color || "#2563eb",
    habitualDays: [...(zone.habitual_days || [])],
    isActive: zone.is_active !== false,
    cities: unique((zone.cities || []).map((city) => city.city_name)),
    expanded: true,
    search: "",
    selected: [],
    bulkText: "",
  };
}

export default function PickupZonesPage() {
  const { store: selectedStore, loading: storeLoading } = useStore() as any;
  const { store: accessStore, isSuperAdmin, loading: accessLoading } = useAdminAccess();
  const store = isSuperAdmin ? selectedStore || accessStore : accessStore;

  const [zones, setZones] = useState<PickupZone[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ZoneDraft>>({});
  const [newZoneName, setNewZoneName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    if (!store?.id) return;
    setLoading(true);
    const result = await getPickupZones(store.id);
    const next = (result.data || []) as PickupZone[];
    setZones(next);
    setDrafts((current) => {
      const value: Record<string, ZoneDraft> = {};
      for (const zone of next) {
        value[zone.id] = current[zone.id]
          ? { ...fromZone(zone), expanded: current[zone.id].expanded }
          : fromZone(zone);
      }
      return value;
    });
    setError(result.error?.message || "");
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [store?.id]);

  const ownerByCity = useMemo(() => {
    const map = new Map<string, string>();
    for (const zone of zones) {
      for (const city of zone.cities || []) map.set(city.city_name.toLocaleLowerCase("es"), zone.id);
    }
    return map;
  }, [zones]);

  function patch(zoneId: string, values: Partial<ZoneDraft>) {
    setDrafts((current) => ({ ...current, [zoneId]: { ...current[zoneId], ...values } }));
  }

  async function createZone() {
    if (!store?.id || !newZoneName.trim()) return;
    setBusyId("new");
    setError("");
    const result = await createPickupZone(store.id, { name: newZoneName.trim() });
    setBusyId(null);
    if (result.error) return setError(result.error.message);
    setNewZoneName("");
    setMessage("Zona creada correctamente.");
    await load();
  }

  function availableCatalog(zoneId: string) {
    return SOUTH_CAROLINA_COUNTIES.filter((city) => {
      const owner = ownerByCity.get(city.toLocaleLowerCase("es"));
      return !owner || owner === zoneId;
    });
  }

  function assignSelected(zoneId: string) {
    const draft = drafts[zoneId];
    patch(zoneId, { cities: unique([...draft.cities, ...draft.selected]), selected: [] });
  }

  function importBulk(zoneId: string) {
    const draft = drafts[zoneId];
    const parsed = draft.bulkText.split(/[\n,;]+/).map(normalize).filter(Boolean);
    const conflicts = parsed.filter((city) => {
      const owner = ownerByCity.get(city.toLocaleLowerCase("es"));
      return owner && owner !== zoneId;
    });
    if (conflicts.length) return setError(`Ya pertenecen a otra zona: ${unique(conflicts).join(", ")}.`);
    patch(zoneId, { cities: unique([...draft.cities, ...parsed]), bulkText: "" });
    setMessage(`${unique(parsed).length} ciudades agregadas al borrador.`);
  }

  function applyPreset(zoneId: string, presetId: string) {
    const preset = PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    const conflicts = preset.cities.filter((city) => {
      const owner = ownerByCity.get(city.toLocaleLowerCase("es"));
      return owner && owner !== zoneId;
    });
    if (conflicts.length) return setError(`Estas ciudades ya están en otra zona: ${conflicts.join(", ")}.`);
    patch(zoneId, { cities: unique([...drafts[zoneId].cities, ...preset.cities]) });
    setMessage(`Preset “${preset.label}” aplicado.`);
  }

  async function save(zone: PickupZone) {
    const draft = drafts[zone.id];
    if (!store?.id || !draft.name.trim()) return;
    setBusyId(zone.id);
    setError("");
    setMessage("");

    const zoneResult = await updatePickupZone(zone.id, store.id, {
      name: draft.name.trim(),
      description: draft.description.trim(),
      color: draft.color,
      habitual_days: draft.habitualDays,
      is_active: draft.isActive,
    });
    if (zoneResult.error) {
      setBusyId(null);
      return setError(zoneResult.error.message);
    }

    const cityResult = await replacePickupZoneCities(store.id, zone.id, draft.cities);
    setBusyId(null);
    if (cityResult.error) return setError(cityResult.error.message);
    setMessage(`Zona ${draft.name} guardada con ${draft.cities.length} ciudades.`);
    await load();
  }

  async function remove(zone: PickupZone) {
    if (!store?.id || !confirm(`¿Eliminar ${zone.name}?`)) return;
    setBusyId(zone.id);
    const result = await deletePickupZone(zone.id, store.id);
    setBusyId(null);
    if (result.error) return setError(result.error.message);
    setMessage("Zona eliminada.");
    await load();
  }

  if (loading || accessLoading || storeLoading) {
    return <div className="p-12 text-center"><Loader2 className="mx-auto animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <header className="rounded-[2rem] bg-[#071d43] p-7 text-white">
        <p className="text-xs font-black uppercase tracking-[.18em] text-blue-200">Organización territorial · V8</p>
        <h1 className="mt-2 text-3xl font-black">Zonas y cobertura</h1>
        <p className="mt-2 max-w-3xl text-blue-100/80">Selecciona varias ciudades, usa presets o pega listas completas. Ya no tienes que agregarlas una por una.</p>
      </header>

      <section className="rounded-[1.6rem] border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input value={newZoneName} onChange={(e) => setNewZoneName(e.target.value)} placeholder="Ej. Zona Oeste" className="h-12 flex-1 rounded-2xl border px-4 font-bold" />
          <button onClick={() => void createZone()} disabled={!newZoneName.trim() || busyId === "new"} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#071d43] px-5 font-black text-white disabled:opacity-50">
            {busyId === "new" ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Crear zona
          </button>
        </div>
      </section>

      {error && <div className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</div>}
      {message && <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-700"><Check size={18} />{message}</div>}

      <div className="space-y-5">
        {zones.map((zone) => {
          const draft = drafts[zone.id] || fromZone(zone);
          const catalog = availableCatalog(zone.id).filter((city) => city.toLocaleLowerCase("es").includes(draft.search.toLocaleLowerCase("es")));
          const allVisibleSelected = catalog.length > 0 && catalog.every((city) => draft.selected.includes(city));

          return (
            <article key={zone.id} className="overflow-hidden rounded-[1.8rem] border bg-white shadow-sm">
              <div className="flex items-center justify-between gap-4 p-5">
                <div className="flex items-center gap-3">
                  <span className="h-11 w-3 rounded-full" style={{ backgroundColor: draft.color }} />
                  <div><h2 className="text-xl font-black">{draft.name}</h2><p className="text-sm text-slate-500">{draft.cities.length} ciudades asignadas</p></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => patch(zone.id, { expanded: !draft.expanded })} className="rounded-xl border p-2">{draft.expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>
                  <button onClick={() => void remove(zone)} className="rounded-xl border border-red-200 p-2 text-red-600"><Trash2 size={17} /></button>
                </div>
              </div>

              {draft.expanded && (
                <div className="grid gap-5 border-t p-5 xl:grid-cols-[360px_1fr]">
                  <section className="space-y-4 rounded-2xl border bg-slate-50 p-4">
                    <h3 className="font-black">Configuración de la zona</h3>
                    <label className="block space-y-1"><span className="text-xs font-black uppercase text-slate-500">Nombre</span><input value={draft.name} onChange={(e) => patch(zone.id, { name: e.target.value })} className="h-11 w-full rounded-xl border px-3 font-bold" /></label>
                    <label className="block space-y-1"><span className="text-xs font-black uppercase text-slate-500">Descripción</span><textarea value={draft.description} onChange={(e) => patch(zone.id, { description: e.target.value })} className="min-h-24 w-full rounded-xl border p-3" /></label>
                    <div><span className="text-xs font-black uppercase text-slate-500">Color</span><div className="mt-2 flex flex-wrap gap-2">{COLORS.map((color) => <button key={color} onClick={() => patch(zone.id, { color })} className={`h-8 w-8 rounded-full border-4 ${draft.color === color ? "border-slate-900" : "border-white"}`} style={{ backgroundColor: color }} />)}</div></div>
                    <div><span className="text-xs font-black uppercase text-slate-500">Días habituales</span><div className="mt-2 flex flex-wrap gap-2">{DAY_LABELS.map((label, day) => <button key={label} onClick={() => patch(zone.id, { habitualDays: draft.habitualDays.includes(day) ? draft.habitualDays.filter((v) => v !== day) : [...draft.habitualDays, day].sort() })} className={`rounded-full px-3 py-2 text-sm font-bold ${draft.habitualDays.includes(day) ? "bg-[#071d43] text-white" : "bg-white text-slate-600"}`}>{label}</button>)}</div></div>
                    <label className="flex items-center justify-between rounded-xl border bg-white p-3 font-bold"><span>Zona activa</span><input type="checkbox" checked={draft.isActive} onChange={(e) => patch(zone.id, { isActive: e.target.checked })} /></label>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2"><MapPinned className="text-blue-600" /><div><h3 className="font-black">Ciudades y condados</h3><p className="text-sm text-slate-500">Selecciona múltiples, usa un preset o importa una lista.</p></div></div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-1"><span className="text-xs font-black uppercase text-slate-500">Preset rápido</span><select defaultValue="" onChange={(e) => { applyPreset(zone.id, e.target.value); e.currentTarget.value = ""; }} className="h-11 w-full rounded-xl border px-3"><option value="">Seleccionar preset…</option>{PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select></label>
                      <label className="space-y-1"><span className="text-xs font-black uppercase text-slate-500">Buscar</span><div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input value={draft.search} onChange={(e) => patch(zone.id, { search: e.target.value })} className="h-11 w-full rounded-xl border pl-10 pr-3" placeholder="Greenville, Charleston…" /></div></label>
                    </div>

                    <div className="rounded-2xl border">
                      <div className="flex items-center justify-between border-b p-3">
                        <button onClick={() => patch(zone.id, { selected: allVisibleSelected ? draft.selected.filter((city) => !catalog.includes(city)) : unique([...draft.selected, ...catalog]) })} className="text-sm font-black text-blue-700">{allVisibleSelected ? "Deseleccionar visibles" : "Seleccionar visibles"}</button>
                        <span className="text-sm text-slate-500">{draft.selected.length} seleccionadas</span>
                      </div>
                      <div className="grid max-h-64 gap-1 overflow-y-auto p-3 sm:grid-cols-2 lg:grid-cols-3">
                        {catalog.map((city) => <label key={city} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-slate-50"><input type="checkbox" checked={draft.selected.includes(city)} onChange={(e) => patch(zone.id, { selected: e.target.checked ? unique([...draft.selected, city]) : draft.selected.filter((v) => v !== city) })} /><span className="text-sm font-semibold">{city}</span></label>)}
                      </div>
                      <div className="border-t p-3"><button onClick={() => assignSelected(zone.id)} disabled={!draft.selected.length} className="rounded-xl bg-blue-600 px-4 py-2 font-black text-white disabled:opacity-40">Asignar seleccionadas</button></div>
                    </div>

                    <details className="rounded-2xl border p-4">
                      <summary className="cursor-pointer font-black"><Upload className="mr-2 inline" size={18} />Importar lista personalizada</summary>
                      <textarea value={draft.bulkText} onChange={(e) => patch(zone.id, { bulkText: e.target.value })} placeholder={"Greenville\nSpartanburg\nAnderson"} className="mt-3 min-h-32 w-full rounded-xl border p-3" />
                      <button onClick={() => importBulk(zone.id)} disabled={!draft.bulkText.trim()} className="mt-2 rounded-xl bg-slate-900 px-4 py-2 font-black text-white disabled:opacity-40">Importar lista</button>
                    </details>

                    <div className="rounded-2xl border bg-slate-50 p-4">
                      <div className="mb-3 flex items-center justify-between"><h4 className="font-black">Asignadas ({draft.cities.length})</h4>{draft.cities.length > 0 && <button onClick={() => patch(zone.id, { cities: [] })} className="text-sm font-black text-red-600">Quitar todas</button>}</div>
                      <div className="flex flex-wrap gap-2">{draft.cities.map((city) => <span key={city} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-2 text-sm font-bold shadow-sm">{city}<button onClick={() => patch(zone.id, { cities: draft.cities.filter((value) => value !== city) })}><X size={15} /></button></span>)}</div>
                    </div>

                    <div className="flex justify-end"><button onClick={() => void save(zone)} disabled={busyId === zone.id} className="inline-flex items-center gap-2 rounded-2xl bg-[#071d43] px-6 py-3 font-black text-white disabled:opacity-50">{busyId === zone.id ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Guardar zona</button></div>
                  </section>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
