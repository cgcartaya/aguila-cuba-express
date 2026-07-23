"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import {
  createPickupZone,
  deletePickupZone,
  getPickupServiceSettings,
  getPickupZones,
  replacePickupZoneCities,
  updatePickupZone,
} from "@/lib/services/pickups";
import type { PickupZone } from "@/lib/pickups/types";

const dayLabels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const zoneColors = ["#ef4444", "#2563eb", "#16a34a", "#f59e0b", "#7c3aed", "#0f766e"];

type ZoneDraft = {
  name: string;
  description: string;
  color: string;
  habitualDays: number[];
  isActive: boolean;
  cities: string[];
  search: string;
  newCity: string;
  bulkCities: string;
  expanded: boolean;
};

function normalizeCity(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function uniqueCities(values: string[]) {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const city = normalizeCity(raw);
    const key = city.toLocaleLowerCase("es");
    if (!city || seen.has(key)) continue;
    seen.add(key);
    result.push(city);
  }
  return result.sort((a, b) => a.localeCompare(b, "es"));
}

function draftFromZone(zone: PickupZone): ZoneDraft {
  return {
    name: zone.name || "",
    description: zone.description || "",
    color: zone.color || "#2563eb",
    habitualDays: [...(zone.habitual_days || [])],
    isActive: zone.is_active !== false,
    cities: uniqueCities((zone.cities || []).map((city) => city.city_name)),
    search: "",
    newCity: "",
    bulkCities: "",
    expanded: true,
  };
}

export default function PickupZonesPage() {
  const { store: selectedStore, loading: storeLoading } = useStore() as any;
  const { store: accessStore, isSuperAdmin, loading: accessLoading } = useAdminAccess();
  const store = isSuperAdmin ? selectedStore || accessStore : accessStore;

  const [zones, setZones] = useState<PickupZone[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ZoneDraft>>({});
  const [catalogCities, setCatalogCities] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingZoneId, setSavingZoneId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    if (!store?.id) return;
    setLoading(true);
    setError("");

    const [zonesResult, settingsResult] = await Promise.all([
      getPickupZones(store.id),
      getPickupServiceSettings(store.id),
    ]);

    const nextZones = (zonesResult.data || []) as PickupZone[];
    const settingsCities = (settingsResult.data?.allowed_cities || []) as string[];
    const assignedCities = nextZones.flatMap((zone) => (zone.cities || []).map((city) => city.city_name));

    setZones(nextZones);
    setCatalogCities(uniqueCities([...settingsCities, ...assignedCities]));
    setDrafts((current) => {
      const next: Record<string, ZoneDraft> = {};
      for (const zone of nextZones) {
        next[zone.id] = current[zone.id]
          ? { ...draftFromZone(zone), expanded: current[zone.id].expanded }
          : draftFromZone(zone);
      }
      return next;
    });
    setError((zonesResult.error as any)?.message || (settingsResult.error as any)?.message || "");
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [store?.id]);

  const cityOwner = useMemo(() => {
    const result = new Map<string, string>();
    for (const zone of zones) {
      for (const city of zone.cities || []) {
        result.set(city.city_name.toLocaleLowerCase("es"), zone.id);
      }
    }
    return result;
  }, [zones]);

  function patchDraft(zoneId: string, patch: Partial<ZoneDraft>) {
    setDrafts((current) => ({
      ...current,
      [zoneId]: { ...current[zoneId], ...patch },
    }));
  }

  async function addZone() {
    if (!store?.id || !name.trim()) return;
    setCreating(true);
    setError("");
    setSuccess("");
    const result = await createPickupZone(store.id, { name: name.trim() });
    setCreating(false);
    if (result.error) return setError(result.error.message);
    setName("");
    setSuccess("Zona creada correctamente.");
    await load();
  }

  function addCitiesToDraft(zoneId: string, rawValues: string[]) {
    const draft = drafts[zoneId];
    if (!draft) return;

    const requested = uniqueCities(rawValues);
    const conflicts = requested.filter((city) => {
      const owner = cityOwner.get(city.toLocaleLowerCase("es"));
      return owner && owner !== zoneId;
    });

    if (conflicts.length) {
      setError(`Estas ciudades ya pertenecen a otra zona: ${conflicts.join(", ")}.`);
      return;
    }

    patchDraft(zoneId, {
      cities: uniqueCities([...draft.cities, ...requested]),
      newCity: "",
      bulkCities: "",
    });
    setError("");
  }

  function toggleCatalogCity(zoneId: string, city: string, checked: boolean) {
    const draft = drafts[zoneId];
    if (!draft) return;
    patchDraft(zoneId, {
      cities: checked
        ? uniqueCities([...draft.cities, city])
        : draft.cities.filter((value) => value.toLocaleLowerCase("es") !== city.toLocaleLowerCase("es")),
    });
  }

  async function saveZone(zone: PickupZone) {
    const draft = drafts[zone.id];
    if (!store?.id || !draft || !draft.name.trim()) return;

    setSavingZoneId(zone.id);
    setError("");
    setSuccess("");

    const zoneResult = await updatePickupZone(zone.id, store.id, {
      name: draft.name.trim(),
      description: draft.description.trim(),
      color: draft.color,
      habitual_days: draft.habitualDays,
      is_active: draft.isActive,
    });

    if (zoneResult.error) {
      setSavingZoneId(null);
      return setError(zoneResult.error.message);
    }

    const cityResult = await replacePickupZoneCities(store.id, zone.id, draft.cities);
    setSavingZoneId(null);
    if (cityResult.error) return setError(cityResult.error.message);

    setCatalogCities((current) => uniqueCities([...current, ...draft.cities]));
    setSuccess(`Cambios guardados en ${draft.name}.`);
    await load();
  }

  async function removeZone(zone: PickupZone) {
    if (!store?.id || !confirm(`¿Eliminar ${zone.name} y todas sus ciudades asignadas?`)) return;
    setSavingZoneId(zone.id);
    const result = await deletePickupZone(zone.id, store.id);
    setSavingZoneId(null);
    if (result.error) return setError(result.error.message);
    setSuccess("Zona eliminada correctamente.");
    await load();
  }

  if (accessLoading || storeLoading || loading) {
    return <div className="p-12 text-center"><Loader2 className="mx-auto animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <header className="rounded-[2rem] bg-[#071d43] p-7 text-white">
        <p className="text-xs font-black uppercase tracking-[.18em] text-blue-200">Organización territorial</p>
        <h1 className="mt-2 text-3xl font-black">Zonas de recogida</h1>
        <p className="mt-2 max-w-3xl text-blue-100/80">
          Crea zonas, asigna varios días y administra ciudades individualmente o pegando una lista completa.
        </p>
      </header>

      <section className="rounded-[1.6rem] border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") void addZone(); }}
            placeholder="Ej. Zona Oeste"
            className="h-12 flex-1 rounded-2xl border px-4 font-bold outline-none focus:border-blue-500"
          />
          <button
            onClick={() => void addZone()}
            disabled={creating || !name.trim()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#071d43] px-5 font-black text-white disabled:opacity-50"
          >
            {creating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Crear zona
          </button>
        </div>
      </section>

      {error && <div className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</div>}
      {success && <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-700"><Check size={18} />{success}</div>}

      {!zones.length && (
        <div className="rounded-[1.8rem] border border-dashed bg-white p-10 text-center text-slate-500">
          Crea tu primera zona para comenzar a asignar ciudades.
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        {zones.map((zone) => {
          const draft = drafts[zone.id] || draftFromZone(zone);
          const saving = savingZoneId === zone.id;
          const availableCities = catalogCities.filter((city) => {
            const owner = cityOwner.get(city.toLocaleLowerCase("es"));
            return !owner || owner === zone.id;
          });
          const filteredCities = availableCities.filter((city) =>
            city.toLocaleLowerCase("es").includes(draft.search.toLocaleLowerCase("es"))
          );

          return (
            <article key={zone.id} className="overflow-hidden rounded-[1.8rem] border bg-white shadow-sm">
              <div className="flex items-start justify-between gap-4 p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="h-11 w-3 shrink-0 rounded-full" style={{ backgroundColor: draft.color }} />
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-black">{draft.name || zone.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">{draft.cities.length} ciudades asignadas</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => patchDraft(zone.id, { expanded: !draft.expanded })}
                    className="rounded-xl border p-2 text-slate-600"
                    title={draft.expanded ? "Contraer" : "Editar"}
                  >
                    {draft.expanded ? <ChevronUp size={18} /> : <Pencil size={18} />}
                  </button>
                  <button
                    onClick={() => void removeZone(zone)}
                    disabled={saving}
                    className="rounded-xl border border-red-200 p-2 text-red-600 disabled:opacity-50"
                    title="Eliminar zona"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>

              {draft.expanded && (
                <div className="space-y-5 border-t p-5">
                  <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                    <label className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-wide text-slate-500">Nombre de la zona</span>
                      <input
                        value={draft.name}
                        onChange={(event) => patchDraft(zone.id, { name: event.target.value })}
                        className="h-11 w-full rounded-xl border px-3 font-bold outline-none focus:border-blue-500"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-wide text-slate-500">Color</span>
                      <div className="flex h-11 items-center gap-2 rounded-xl border px-3">
                        <input
                          type="color"
                          value={draft.color}
                          onChange={(event) => patchDraft(zone.id, { color: event.target.value })}
                          className="h-7 w-10 cursor-pointer border-0 bg-transparent p-0"
                        />
                        <div className="hidden gap-1 sm:flex">
                          {zoneColors.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => patchDraft(zone.id, { color })}
                              className={`h-5 w-5 rounded-full border-2 ${draft.color === color ? "border-slate-900" : "border-white"}`}
                              style={{ backgroundColor: color }}
                              aria-label={`Usar color ${color}`}
                            />
                          ))}
                        </div>
                      </div>
                    </label>
                  </div>

                  <label className="block space-y-2">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-500">Descripción opcional</span>
                    <input
                      value={draft.description}
                      onChange={(event) => patchDraft(zone.id, { description: event.target.value })}
                      placeholder="Ej. Recogemos en los condados de la zona oeste"
                      className="h-11 w-full rounded-xl border px-3 outline-none focus:border-blue-500"
                    />
                  </label>

                  <div>
                    <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Días habituales</p>
                    <div className="flex flex-wrap gap-2">
                      {dayLabels.map((day, index) => {
                        const active = draft.habitualDays.includes(index);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => patchDraft(zone.id, {
                              habitualDays: active
                                ? draft.habitualDays.filter((value) => value !== index)
                                : [...draft.habitualDays, index].sort(),
                            })}
                            className={`rounded-full px-4 py-2 text-xs font-black transition ${active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="flex items-center justify-between rounded-xl border bg-slate-50 px-4 py-3">
                    <span>
                      <span className="block font-black">Zona activa</span>
                      <span className="text-xs text-slate-500">Las zonas inactivas no se sugerirán automáticamente.</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={draft.isActive}
                      onChange={(event) => patchDraft(zone.id, { isActive: event.target.checked })}
                      className="h-5 w-5"
                    />
                  </label>

                  <div className="rounded-2xl border bg-slate-50 p-4">
                    <div className="mb-4">
                      <h3 className="font-black">Ciudades o condados</h3>
                      <p className="text-sm text-slate-500">Agrega una, pega muchas o selecciónalas del catálogo.</p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        value={draft.newCity}
                        onChange={(event) => patchDraft(zone.id, { newCity: event.target.value })}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addCitiesToDraft(zone.id, [draft.newCity]);
                          }
                        }}
                        placeholder="Ej. Greenville"
                        className="h-11 flex-1 rounded-xl border bg-white px-3 outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => addCitiesToDraft(zone.id, [draft.newCity])}
                        disabled={!draft.newCity.trim()}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 font-black text-[#071d43] ring-1 ring-slate-200 disabled:opacity-50"
                      >
                        <Plus size={17} /> Agregar
                      </button>
                    </div>

                    <details className="mt-3 rounded-xl border bg-white p-3">
                      <summary className="cursor-pointer font-black text-slate-700">Pegar varias ciudades</summary>
                      <textarea
                        value={draft.bulkCities}
                        onChange={(event) => patchDraft(zone.id, { bulkCities: event.target.value })}
                        placeholder={"Greenville\nSpartanburg\nAnderson\nPickens"}
                        rows={5}
                        className="mt-3 w-full rounded-xl border p-3 outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => addCitiesToDraft(zone.id, draft.bulkCities.split(/[\n,;]+/))}
                        disabled={!draft.bulkCities.trim()}
                        className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#071d43] px-4 py-2 font-black text-white disabled:opacity-50"
                      >
                        <Plus size={17} /> Agregar todas
                      </button>
                    </details>

                    {!!availableCities.length && (
                      <div className="mt-4">
                        <div className="relative">
                          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            value={draft.search}
                            onChange={(event) => patchDraft(zone.id, { search: event.target.value })}
                            placeholder="Buscar en el catálogo..."
                            className="h-11 w-full rounded-xl border bg-white pl-10 pr-3 outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => patchDraft(zone.id, { cities: uniqueCities([...draft.cities, ...filteredCities]) })}
                            className="rounded-lg bg-white px-3 py-1.5 text-xs font-black ring-1 ring-slate-200"
                          >
                            Seleccionar visibles
                          </button>
                          <button
                            type="button"
                            onClick={() => patchDraft(zone.id, {
                              cities: draft.cities.filter((city) => !filteredCities.some((visible) => visible.toLocaleLowerCase("es") === city.toLocaleLowerCase("es"))),
                            })}
                            className="rounded-lg bg-white px-3 py-1.5 text-xs font-black ring-1 ring-slate-200"
                          >
                            Quitar visibles
                          </button>
                        </div>
                        <div className="mt-3 max-h-52 space-y-2 overflow-auto rounded-xl border bg-white p-2">
                          {filteredCities.map((city) => {
                            const checked = draft.cities.some((value) => value.toLocaleLowerCase("es") === city.toLocaleLowerCase("es"));
                            return (
                              <label key={city} className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50">
                                <span className="flex items-center gap-2 font-bold"><MapPin size={15} className="text-red-500" />{city}</span>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(event) => toggleCatalogCity(zone.id, city, event.target.checked)}
                                  className="h-5 w-5"
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">Asignadas ({draft.cities.length})</p>
                        {!!draft.cities.length && (
                          <button type="button" onClick={() => patchDraft(zone.id, { cities: [] })} className="text-xs font-black text-red-600">Quitar todas</button>
                        )}
                      </div>
                      {draft.cities.length ? (
                        <div className="flex flex-wrap gap-2">
                          {draft.cities.map((city) => (
                            <span key={city} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-bold ring-1 ring-slate-200">
                              {city}
                              <button
                                type="button"
                                onClick={() => patchDraft(zone.id, { cities: draft.cities.filter((value) => value !== city) })}
                                className="rounded-full text-red-500 hover:bg-red-50"
                                aria-label={`Quitar ${city}`}
                              >
                                <X size={15} />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-xl border border-dashed bg-white p-4 text-center text-sm text-slate-500">
                          Todavía no hay ciudades asignadas. Escríbelas arriba o pega una lista.
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void saveZone(zone)}
                    disabled={saving || !draft.name.trim()}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#071d43] px-5 font-black text-white disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Guardar cambios
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
