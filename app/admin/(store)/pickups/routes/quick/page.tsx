"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, CalendarDays, Camera, CheckCircle2, Loader2, MapPin, Plus, Save, Trash2, Truck } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { supabase } from "@/lib/supabase";
import { getPickupZones } from "@/lib/services/pickups";
import { cityKey, localDate, timeWindow, validateItinerary, type ItineraryGroup } from "@/lib/pickups/itinerary";
import type { PickupZone } from "@/lib/pickups/types";

type Template = { id: string; name: string; zone_id: string | null; itinerary: ItineraryGroup[] };
type Config = { templates: Template[]; cities: { label: string }[]; today: string; image_import_enabled: boolean };
const emptyConfig: Config = { templates: [], cities: [], today: "", image_import_enabled: false };

async function api(path: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Inicia sesión para continuar.");
  const response = await fetch(path, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${data.session.access_token}` }, cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "No se pudo completar la operación.");
  return payload;
}

async function shrinkImage(file: File) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 15 * 1024 * 1024) throw new Error("Usa una imagen JPG, PNG o WebP de hasta 15 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo preparar la imagen.");
    context.fillStyle = "white"; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("No se pudo preparar la imagen.")), "image/jpeg", .88));
    if (blob.size > 3 * 1024 * 1024) throw new Error("La imagen es demasiado grande. Usa una versión más pequeña.");
    return new File([blob], "cartel.jpg", { type: "image/jpeg" });
  } finally { bitmap.close(); }
}

export default function QuickPickupRoutePage() {
  const router = useRouter(), params = useSearchParams();
  const routeId = params.get("route");
  const { store: selectedStore } = useStore();
  const { store: accessStore, isSuperAdmin, loading: accessLoading } = useAdminAccess();
  const store = isSuperAdmin ? selectedStore || accessStore : accessStore;
  const storeId = store?.id;
  const [config, setConfig] = useState<Config>(emptyConfig), [zones, setZones] = useState<PickupZone[]>([]);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState("");
  const [error, setError] = useState(""), [success, setSuccess] = useState("");
  const [mode, setMode] = useState<"manual" | "image">("manual");
  const [name, setName] = useState(""), [date, setDate] = useState(""), [zone, setZone] = useState("");
  const [summary, setSummary] = useState(""), [groups, setGroups] = useState<ItineraryGroup[]>([]);
  const [citySearch, setCitySearch] = useState(""), [reviewed, setReviewed] = useState(false);
  const [file, setFile] = useState<File | null>(null), [poster, setPoster] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null), [warnings, setWarnings] = useState<string[]>([]);
  const endpoint = `/api/admin/pickups/routes/quick?store_id=${encodeURIComponent(store?.id || "")}`;

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true); setError("");
    try {
      const [settings, zoneResult] = await Promise.all([api(`/api/admin/pickups/routes/quick?store_id=${storeId}`), getPickupZones(storeId)]);
      if (zoneResult.error) throw new Error(zoneResult.error.message);
      setConfig(settings); setZones(zoneResult.data); setDate(settings.today);
      if (routeId) {
        const { data, error } = await supabase.from("pickup_routes").select("*,pickup_route_stops(stop_order,pickup_requests(city))").eq("id", routeId).eq("store_id", storeId).single();
        if (error || !data) throw new Error("No se pudo cargar la ruta.");
        if (!["draft", "published"].includes(data.status)) throw new Error("Solo puedes editar borradores y rutas publicadas desde aquí.");
        setName(data.name); setDate(data.route_date); setZone(data.zone_id || ""); setSummary(data.public_summary || "");
        setGroups(data.public_itinerary?.length ? data.public_itinerary : Array.from(new Set((data.pickup_route_stops || []).sort((a: { stop_order: number }, b: { stop_order: number }) => a.stop_order - b.stop_order).map((stop: { pickup_requests: { city: string } | null }) => stop.pickup_requests?.city).filter(Boolean))).map((city) => ({ cities: [String(city)], start_time: null, end_time: null }))); setPoster(data.poster_image_url || null);
      }
    } catch (error) { setError(error instanceof Error ? error.message : "No se pudo cargar el editor."); }
    finally { setLoading(false); }
  }, [storeId, routeId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function changeGroups(next: ItineraryGroup[]) { setGroups(next); setReviewed(false); setSuccess(""); }
  function addCity(city: string) {
    if (groups.some((group) => group.cities.some((name) => cityKey(name) === cityKey(city)))) return;
    changeGroups([...groups, { cities: [city], start_time: null, end_time: null }]); setCitySearch("");
  }
  function move(index: number, delta: number) {
    const next = [...groups], target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]]; changeGroups(next);
  }
  function updateGroup(index: number, updates: Partial<ItineraryGroup>) {
    changeGroups(groups.map((group, i) => i === index ? { ...group, ...updates } : group));
  }
  async function chooseImage(input: File | undefined) {
    if (!input) return;
    setBusy("image"); setError("");
    try { setFile(await shrinkImage(input)); setWarnings([]); setReviewed(false); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(""); }
  }
  async function interpret() {
    if (!file || !store?.id) return;
    setBusy("interpret"); setError("");
    try {
      const form = new FormData(); form.set("image", file);
      const { result } = await api(`/api/admin/pickups/routes/interpret?store_id=${store.id}`, { method: "POST", body: form });
      setName(result.name || "Ruta de recogida"); setDate(result.route_date || ""); setGroups(result.itinerary || []);
      setWarnings(result.warnings || []); setReviewed(false); setSuccess("Lectura terminada. Revisa fecha, ciudades y horarios antes de publicar.");
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(""); }
  }
  async function save(action: "draft" | "publish" | "template") {
    setError(""); setSuccess("");
    try {
      validateItinerary(groups);
      if (!name.trim()) throw new Error("Escribe un nombre.");
      if (action !== "template" && !date) throw new Error("Selecciona la fecha y confirma el año del cartel.");
      if (action === "publish" && !reviewed) throw new Error("Confirma que revisaste la fecha, las ciudades y los horarios.");
      setBusy(action);
      const form = new FormData();
      form.set("plan", JSON.stringify({ name, route_date: date, zone_id: zone || null, itinerary: groups, public_summary: summary, route_id: routeId, poster_image_url: poster, action, publish: action === "publish", reviewed }));
      if (file && action !== "template") form.set("image", file);
      const payload = await api(endpoint, { method: "POST", body: form });
      if (action === "template") {
        setConfig((value) => ({ ...value, templates: [payload.template, ...value.templates] })); setSuccess("Plantilla guardada. Podrás usarla cambiando solo la fecha.");
      } else router.push(`/admin/pickups/routes/${payload.route.id}`);
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(""); }
  }
  const zoneCities = zones.find((item) => item.id === zone)?.cities?.map((city) => city.city_name) || [];
  const options = zone ? zoneCities : config.cities.map((city) => city.label);
  const choices = options.filter((city) => cityKey(city).includes(cityKey(citySearch)));

  if (loading || accessLoading) return <div className="p-12 text-center"><Loader2 className="mx-auto animate-spin" /></div>;
  return <div className="mx-auto max-w-5xl space-y-5 pb-[calc(8rem+env(safe-area-inset-bottom))] lg:pb-8">
    <Link href="/admin/pickups/routes" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700"><ArrowLeft size={17} /> Volver a rutas</Link>
    <header className="rounded-3xl bg-[#071d43] p-6 text-white sm:p-8"><p className="text-xs font-black uppercase tracking-widest text-blue-200">Publicar sin complicaciones</p><h1 className="mt-2 text-3xl font-black">{routeId ? "Editar recorrido público" : "¿Por dónde pasamos?"}</h1><p className="mt-3 text-blue-100">Anuncia ciudades y horarios. Puedes añadir las recogidas de clientes después.</p></header>
    <div className="grid grid-cols-2 gap-3">{[["manual", MapPin, "Elegir ciudades"], ["image", Camera, "Desde un cartel"]].map(([key, Icon, label]) => { const Symbol = Icon as typeof MapPin; return <button key={String(key)} type="button" disabled={Boolean(busy)} onClick={() => setMode(key as "manual" | "image")} className={`flex min-w-0 items-center justify-center gap-2 rounded-2xl border p-4 text-sm font-black ${mode === key ? "border-blue-700 bg-blue-50 text-blue-800" : "bg-white text-slate-600"}`}><Symbol size={20} />{String(label)}</button>; })}</div>
    {mode === "image" && <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7"><h2 className="text-xl font-black">Carga el cartel que ya compartes</h2><p className="mt-2 text-sm text-slate-500">Puede ser la imagen original o una captura del estado. La lectura prepara un borrador editable.</p><label className="mt-4 block cursor-pointer rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50 p-5 text-center font-bold text-blue-800">Seleccionar imagen<input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(busy)} onChange={(event) => { void chooseImage(event.target.files?.[0]); event.target.value = ""; }} className="mt-3 block w-full text-xs" /></label>{(preview || poster) && <img src={preview || poster || ""} alt="Cartel a revisar" className="mx-auto mt-4 max-h-80 max-w-full rounded-xl object-contain" />}{(preview || poster) && <button onClick={() => { setFile(null); setPoster(null); setReviewed(false); }} className="mt-3 text-sm font-bold text-red-700">Quitar cartel</button>}{!config.image_import_enabled && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">La lectura automática está pendiente de activación. Puedes adjuntar el cartel y completar las ciudades aquí abajo.</p>}<button disabled={!file || Boolean(busy) || !config.image_import_enabled} onClick={interpret} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 p-4 font-black text-white disabled:opacity-40">{busy === "interpret" ? <Loader2 className="animate-spin" size={19} /> : <Camera size={19} />} {busy === "interpret" ? "Interpretando cartel…" : "Leer fecha, ciudades y horarios"}</button></section>}
    {config.templates.length > 0 && <section className="rounded-3xl border border-slate-200 bg-white p-5"><h2 className="font-black">Usar una ruta habitual</h2><div className="mt-3 flex flex-wrap gap-2">{config.templates.map((template) => <div key={template.id} className="flex overflow-hidden rounded-xl border border-slate-200"><button disabled={Boolean(busy)} onClick={() => { setName(template.name); setZone(template.zone_id || ""); changeGroups(structuredClone(template.itinerary)); setFile(null); setPoster(null); setWarnings([]); }} className="px-4 py-3 text-sm font-bold text-blue-800">{template.name}</button><button aria-label={`Eliminar plantilla ${template.name}`} disabled={Boolean(busy)} onClick={async () => { if (!confirm("¿Eliminar esta plantilla? Las rutas creadas se conservan.")) return; try { await api(`${endpoint}&template_id=${template.id}`, { method: "DELETE" }); setConfig((value) => ({ ...value, templates: value.templates.filter((item) => item.id !== template.id) })); } catch (error) { setError((error as Error).message); } }} className="border-l px-3 text-slate-500"><Trash2 size={15} /></button></div>)}</div></section>}
    <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7"><h2 className="text-xl font-black">Fecha y zona</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Nombre"><input value={name} maxLength={120} onChange={(event) => { setName(event.target.value); setReviewed(false); }} placeholder="Ej. Ruta costa" className="input" /></Field><Field label="Fecha (revisa también el año)"><input type="date" min={config.today || localDate()} value={date} onChange={(event) => { setDate(event.target.value); setReviewed(false); }} className="input" /></Field><Field label="Zona"><select aria-label="Zona" value={zone} onChange={(event) => { setZone(event.target.value); setReviewed(false); }} className="input"><option value="">Todas las ciudades</option>{zones.filter((zone) => zone.is_active).map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></Field><Field label="Mensaje para clientes (opcional)"><input value={summary} maxLength={1000} onChange={(event) => setSummary(event.target.value)} placeholder="Horarios orientativos según las recogidas" className="input" /></Field></div></section>
    <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7"><h2 className="text-xl font-black">Ciudades del recorrido</h2><p className="mt-2 text-sm text-slate-500">Toca para añadir. Usa las flechas para elegir el orden; los horarios son opcionales.</p><input aria-label="Buscar ciudad" value={citySearch} onChange={(event) => setCitySearch(event.target.value)} placeholder="Buscar ciudad…" className="input mt-4" /><div className="mt-3 flex max-h-40 flex-wrap gap-2 overflow-y-auto">{choices.slice(0, citySearch ? 80 : 40).map((city) => <button key={city} disabled={Boolean(busy) || groups.some((group) => group.cities.some((name) => cityKey(name) === cityKey(city)))} onClick={() => addCity(city)} className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-2 text-sm font-bold text-blue-800 disabled:bg-slate-100 disabled:text-slate-400"><Plus size={14} />{city}</button>)}</div>{zone && !zoneCities.length && <p className="mt-2 text-sm text-amber-800">Esta zona todavía no tiene ciudades. Selecciona Todas las ciudades o configura la zona.</p>}<p className="mt-3 text-xs text-slate-500">Si no aparece una ciudad, puedes escribirla al añadir una parada y revisarla antes de publicar.</p><button onClick={() => changeGroups([...groups, { cities: [citySearch.trim()], start_time: null, end_time: null }])} disabled={Boolean(busy)} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-800"><Plus size={16} />Añadir parada editable</button>
      <div className="mt-5 space-y-3">{groups.map((group, index) => <article key={index} className="rounded-2xl border bg-slate-50 p-4"><div className="flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#071d43] text-sm font-black text-white">{index + 1}</span><div className="min-w-0 flex-1"><label className="text-xs font-bold text-slate-500">Ciudad o ciudades con el mismo horario (separadas por /)<input aria-label={`Ciudades de parada ${index + 1}`} value={group.cities.join(" / ")} onChange={(event) => updateGroup(index, { cities: event.target.value.split("/").map((city) => city.trimStart()) })} className="input mt-1" /></label><div className="mt-3 grid grid-cols-2 gap-2"><Field label="Desde"><input type="time" aria-label={`Desde parada ${index + 1}`} value={group.start_time || ""} onChange={(event) => updateGroup(index, { start_time: event.target.value || null })} className="input" /></Field><Field label="Hasta"><input type="time" aria-label={`Hasta parada ${index + 1}`} value={group.end_time || ""} onChange={(event) => updateGroup(index, { end_time: event.target.value || null })} className="input" /></Field></div></div></div><div className="mt-3 flex justify-end gap-2"><button aria-label={`Subir parada ${index + 1}`} disabled={index === 0 || Boolean(busy)} onClick={() => move(index, -1)} className="control"><ArrowUp size={17} /></button><button aria-label={`Bajar parada ${index + 1}`} disabled={index === groups.length - 1 || Boolean(busy)} onClick={() => move(index, 1)} className="control"><ArrowDown size={17} /></button><button aria-label={`Quitar parada ${index + 1}`} disabled={Boolean(busy)} onClick={() => changeGroups(groups.filter((_, i) => i !== index))} className="control text-red-600"><Trash2 size={17} /></button></div></article>)}</div></section>
    <section className="rounded-3xl border border-blue-100 bg-white p-5 sm:p-7"><h2 className="flex items-center gap-2 text-xl font-black"><CalendarDays size={21} />Revisa antes de publicar</h2><p className="mt-3 font-black">{name || "Tu próxima ruta"} · {date || "Selecciona la fecha"}</p><ol className="mt-3 space-y-2">{groups.map((group, index) => <li key={index} className="text-sm"><strong>{index + 1}. {group.cities.join(" / ") || "Ciudad pendiente"}</strong><span className="mt-0.5 block text-slate-500">{timeWindow(group.start_time, group.end_time)}</span></li>)}</ol>{warnings.length > 0 && <ul className="mt-4 space-y-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}<label className="mt-5 flex items-start gap-3 rounded-2xl bg-blue-50 p-4 text-sm font-bold"><input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" />Confirmé la fecha y el año, las ciudades, el orden y los horarios.</label>{groups.some((group) => group.cities.some((name) => !config.cities.some((city) => cityKey(city.label) === cityKey(name)))) && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Hay ciudades que no coinciden con el catálogo. Revisa sus nombres; pueden aparecer en la lista sin un punto en el mapa.</p>}<p className="mt-3 text-xs text-slate-500">Al publicar se mostrará en la landing. Las direcciones de clientes permanecen en administración.</p></section>
    {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</p>}{success && <p role="status" className="flex gap-2 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800"><CheckCircle2 className="shrink-0" size={20} />{success}</p>}
    <div className="grid gap-3 sm:grid-cols-3"><button disabled={Boolean(busy) || !groups.length} onClick={() => save("template")} className="action border border-slate-200 bg-white text-slate-700"><Save size={18} />Guardar plantilla</button><button disabled={Boolean(busy) || !groups.length} onClick={() => save("draft")} className="action border border-slate-200 bg-white text-blue-800"><Save size={18} />Guardar borrador</button><button disabled={Boolean(busy) || !groups.length || !reviewed} onClick={() => save("publish")} className="action bg-red-600 text-white">{busy ? <Loader2 size={18} className="animate-spin" /> : <Truck size={18} />}Publicar ruta</button></div>
    <style jsx>{`.input{width:100%;min-width:0;border:1px solid #cbd5e1;border-radius:.8rem;background:white;padding:.75rem;font-size:16px;font-weight:600;color:#0f172a}.input:focus{outline:2px solid #93c5fd;outline-offset:1px}.control{display:flex;align-items:center;justify-content:center;width:44px;height:44px;border:1px solid #cbd5e1;border-radius:.75rem;background:white}.control:disabled{opacity:.3}.action{display:flex;align-items:center;justify-content:center;gap:.5rem;border-radius:1rem;padding:1rem;font-weight:900}.action:disabled{opacity:.4}`}</style>
  </div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block min-w-0"><span className="mb-1.5 block text-sm font-bold text-slate-600">{label}</span>{children}</label>; }
