"use client";

import { useEffect, useId, useState } from "react";
import { ArrowDown, ArrowUp, Clock3, MapPin, Plus, Save, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cityKey, type ItineraryGroup } from "@/lib/pickups/itinerary";

type Props = {
  storeId: string;
  groups: ItineraryGroup[];
  onChange: (groups: ItineraryGroup[]) => void;
  onSave: () => void;
  saving: boolean;
  readOnly: boolean;
  isPublic: boolean;
  saveError?: string;
  saveSuccess?: string;
};

export default function PublicItineraryEditor({ storeId, groups, onChange, onSave, saving, readOnly, isPublic, saveError, saveSuccess }: Props) {
  const [options, setOptions] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [message, setMessage] = useState("");
  const listId = useId();
  const disabled = saving || readOnly;

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) return;
        const response = await fetch(`/api/admin/pickups/routes/quick?store_id=${encodeURIComponent(storeId)}`, {
          headers: { Authorization: `Bearer ${data.session.access_token}` }, signal: controller.signal,
        });
        if (!response.ok) return;
        const result = await response.json();
        setOptions((result.cities || []).map((item: { label: string }) => item.label));
      } catch { /* Manual city entry remains available when suggestions fail. */ }
    })();
    return () => controller.abort();
  }, [storeId]);

  function addCity() {
    const name = city.trim();
    if (!name) return setMessage("Escribe o selecciona una ciudad.");
    if (groups.some((group) => group.cities.some((item) => cityKey(item) === cityKey(name)))) return setMessage("Esa ciudad ya está en el recorrido.");
    if (groups.length >= 40) return setMessage("El recorrido admite hasta 40 paradas.");
    onChange([...groups, { cities: [name], start_time: null, end_time: null }]);
    setCity(""); setMessage("");
  }

  function update(index: number, patch: Partial<ItineraryGroup>) {
    onChange(groups.map((group, position) => position === index ? { ...group, ...patch } : group));
  }

  function move(index: number, delta: number) {
    const next = [...groups], target = index + delta;
    if (target < 0 || target >= groups.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return <section aria-label="Editar ciudades del recorrido" className="min-w-0 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div><p className="text-xs font-black uppercase tracking-widest text-blue-600">Recorrido por ciudades</p>
        <h2 className="mt-2 text-2xl font-black text-[#071d43]">Añade, quita y ordena tus paradas</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Aquí están las ciudades y horarios del anuncio. Las recogidas de clientes se gestionan aparte, más abajo.</p>
      </div>
      <span className="shrink-0 self-start rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">{groups.length} {groups.length === 1 ? "parada" : "paradas"}</span>
    </div>
    {!readOnly && <form onSubmit={(event) => { event.preventDefault(); addCity(); }} className="mt-5 flex min-w-0 flex-col gap-3 sm:flex-row">
      <label className="min-w-0 flex-1"><span className="mb-1.5 block text-sm font-bold text-slate-600">Ciudad que quieres añadir</span>
        <input aria-label="Ciudad que quieres añadir" list={listId} value={city} maxLength={100} disabled={disabled} onChange={(event) => setCity(event.target.value)} placeholder="Ej. Okatie" className="h-12 w-full min-w-0 rounded-xl border border-slate-300 px-4 text-base outline-none focus:border-blue-500" />
        <datalist id={listId}>{options.map((name) => <option key={name} value={name} />)}</datalist>
      </label>
      <button disabled={disabled} className="inline-flex min-h-12 items-center justify-center gap-2 self-stretch rounded-xl bg-blue-700 px-5 font-black text-white disabled:opacity-40 sm:self-end"><Plus size={18} /> Añadir parada</button>
    </form>}
    {message && <p role="status" className="mt-3 text-sm font-bold text-amber-800">{message}</p>}
    {groups.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-6 text-center"><MapPin className="mx-auto text-blue-600" /><h3 className="mt-2 font-black text-[#071d43]">Todavía no hay ciudades en el anuncio</h3><p className="mt-2 text-sm text-slate-600">Añade la primera ciudad para preparar el recorrido. No hace falta registrar un cliente.</p></div> :
      <ol className="mt-5 space-y-3">{groups.map((group, index) => <li key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex min-w-0 items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#071d43] font-black text-white">{index + 1}</span>
          <div className="min-w-0 flex-1"><label className="block"><span className="text-xs font-bold text-slate-500">Ciudad o ciudades con el mismo horario (separadas por /)</span>
            <input aria-label={`Ciudades de parada ${index + 1}`} value={group.cities.join(" / ")} disabled={disabled} onChange={(event) => update(index, { cities: event.target.value.split("/").map((name) => name.trimStart()) })} className="mt-1 w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-base font-bold text-[#071d43]" />
          </label>
          <details className="mt-3" open={Boolean(group.start_time || group.end_time)}><summary className="cursor-pointer text-sm font-bold text-blue-700"><Clock3 size={14} className="mr-1 inline" />Horario aproximado (opcional)</summary>
            <div className="mt-3 grid grid-cols-2 gap-3"><label className="min-w-0 text-xs font-bold text-slate-500">Desde<input aria-label={`Desde parada ${index + 1}`} type="time" value={group.start_time || ""} disabled={disabled} onChange={(event) => update(index, { start_time: event.target.value || null })} className="mt-1 block w-full min-w-0 rounded-xl border border-slate-300 bg-white p-2 text-base text-slate-900" /></label><label className="min-w-0 text-xs font-bold text-slate-500">Hasta<input aria-label={`Hasta parada ${index + 1}`} type="time" value={group.end_time || ""} disabled={disabled} onChange={(event) => update(index, { end_time: event.target.value || null })} className="mt-1 block w-full min-w-0 rounded-xl border border-slate-300 bg-white p-2 text-base text-slate-900" /></label></div>
          </details></div>
        </div>
        {!readOnly && <div className="mt-3 flex justify-end gap-2"><button type="button" aria-label={`Subir parada ${index + 1}`} disabled={disabled || index === 0} onClick={() => move(index, -1)} className="control"><ArrowUp size={18} /></button><button type="button" aria-label={`Bajar parada ${index + 1}`} disabled={disabled || index === groups.length - 1} onClick={() => move(index, 1)} className="control"><ArrowDown size={18} /></button><button type="button" aria-label={`Quitar parada ${index + 1}`} disabled={disabled} onClick={() => onChange(groups.filter((_, position) => position !== index))} className="control text-red-600"><Trash2 size={18} /></button></div>}
      </li>)}</ol>}
    {!readOnly && <div className="mt-5 border-t border-slate-100 pt-5">
      <div aria-live="polite">{saveError && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{saveError}</p>}{saveSuccess && <p className="mb-3 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{saveSuccess}</p>}</div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">{isPublic ? "Al guardar se actualizará el recorrido que aparece en la landing." : "Los cambios se guardarán sin publicar la ruta."}</p><button type="button" disabled={saving} onClick={onSave} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-6 font-black text-white disabled:opacity-40"><Save size={18} />{saving ? "Guardando…" : "Guardar cambios"}</button></div>
    </div>}
    <style jsx>{`.control{display:flex;align-items:center;justify-content:center;width:44px;height:44px;border:1px solid #cbd5e1;border-radius:.75rem;background:#fff}.control:disabled{opacity:.3}`}</style>
  </section>;
}
