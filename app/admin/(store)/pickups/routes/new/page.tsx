"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CalendarDays, CheckCircle2, Loader2, MapPin, Search, Truck } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { createPickupRoute, getPickupRequests, getPickupZones } from "@/lib/services/pickups";
import type { PickupRequest, PickupZone } from "@/lib/pickups/types";

function compatibility(item: PickupRequest, routeDate: string) {
  const dates = item.preferred_dates || [];
  if (!dates.length) return "flexible" as const;
  return dates.includes(routeDate) ? "compatible" as const : "incompatible" as const;
}

export default function NewPickupRoutePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { store: selectedStore, loading: storeLoading } = useStore() as any;
  const { store: accessStore, isSuperAdmin, loading: accessLoading } = useAdminAccess();
  const store = isSuperAdmin ? selectedStore || accessStore : accessStore;
  const [requests, setRequests] = useState<PickupRequest[]>([]);
  const [zones, setZones] = useState<PickupZone[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [approvedOverrides, setApprovedOverrides] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [zoneId, setZoneId] = useState(searchParams.get("zone") || "");
  const [routeDate, setRouteDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [name, setName] = useState("");
  const [driverName, setDriverName] = useState("");
  const [vehicleName, setVehicleName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!store?.id) return;
    Promise.all([getPickupRequests(store.id), getPickupZones(store.id)]).then(([requestResult, zoneResult]) => {
      const available = requestResult.data.filter((item) => !["picked_up", "cancelled", "assigned", "en_route"].includes(item.status));
      setRequests(available);
      setZones(zoneResult.data as PickupZone[]);
      const requestedIds = (searchParams.get("requests") || "").split(",").filter(Boolean);
      setSelected(requestedIds.filter((id) => available.some((item) => item.id === id)));
    });
  }, [store?.id, searchParams]);

  const zoneFiltered = useMemo(() => requests.filter((item) => !zoneId || item.assigned_zone_id === zoneId || item.suggested_zone_id === zoneId), [requests, zoneId]);
  const filtered = useMemo(() => zoneFiltered.filter((item) => `${item.customer_name} ${item.city} ${item.request_code}`.toLowerCase().includes(search.toLowerCase())), [zoneFiltered, search]);
  const grouped = useMemo(() => filtered.reduce<Record<string, PickupRequest[]>>((acc, item) => { (acc[item.city] ||= []).push(item); return acc; }, {}), [filtered]);
  const counts = useMemo(() => ({
    compatible: filtered.filter((item) => compatibility(item, routeDate) === "compatible").length,
    flexible: filtered.filter((item) => compatibility(item, routeDate) === "flexible").length,
    incompatible: filtered.filter((item) => compatibility(item, routeDate) === "incompatible").length,
  }), [filtered, routeDate]);

  function toggle(item: PickupRequest) {
    const mode = compatibility(item, routeDate);
    if (selected.includes(item.id)) {
      setSelected((current) => current.filter((id) => id !== item.id));
      setApprovedOverrides((current) => current.filter((id) => id !== item.id));
      return;
    }
    if (mode === "incompatible") {
      const ok = confirm("Esta fecha no coincide con las preferencias del cliente. Puedes añadirla, pero tendrás que confirmar el cambio por WhatsApp. ¿Continuar?");
      if (!ok) return;
      setApprovedOverrides((current) => [...current, item.id]);
    }
    setSelected((current) => [...current, item.id]);
  }

  async function save() {
    if (!store?.id || !name.trim() || !routeDate || selected.length === 0) return setError("Escribe un nombre, selecciona una fecha y al menos una solicitud.");
    const missingApproval = selected.some((id) => {
      const item = requests.find((row) => row.id === id);
      return item && compatibility(item, routeDate) === "incompatible" && !approvedOverrides.includes(id);
    });
    if (missingApproval) return setError("Debes autorizar las solicitudes cuya fecha no coincide.");
    setSaving(true); setError("");
    const result = await createPickupRoute({ storeId: store.id, name: name.trim(), routeDate, driverName, vehicleName, zoneId: zoneId || null, requestIds: selected, overrideRequestIds: approvedOverrides });
    setSaving(false);
    if (result.error || !result.data) return setError(result.error?.message || "No se pudo crear la ruta.");
    router.push(`/admin/pickups/routes/${result.data.id}`);
  }

  if (accessLoading || storeLoading) return <div className="p-12 text-center"><Loader2 className="mx-auto animate-spin" /></div>;

  return <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
    <section className="h-fit rounded-[2rem] border bg-white p-6 shadow-sm xl:sticky xl:top-6">
      <p className="text-xs font-black uppercase tracking-[.16em] text-blue-600">Nueva ruta</p><h1 className="mt-2 text-3xl font-black">Preparar recorrido</h1>
      <div className="mt-6 space-y-4">
        <Field label="Zona"><select value={zoneId} onChange={(e) => setZoneId(e.target.value)} className="input"><option value="">Todas las zonas</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></Field>
        <Field label="Nombre"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Ruta Centro" className="input" /></Field>
        <Field label="Fecha"><input type="date" value={routeDate} onChange={(e) => { setRouteDate(e.target.value); setApprovedOverrides([]); }} className="input" /></Field>
        <Field label="Conductor"><input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Yoyo" className="input" /></Field>
        <Field label="Vehículo"><input value={vehicleName} onChange={(e) => setVehicleName(e.target.value)} placeholder="Van principal" className="input" /></Field>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center"><Badge tone="green" value={counts.compatible} label="Coinciden" /><Badge tone="blue" value={counts.flexible} label="Flexibles" /><Badge tone="amber" value={counts.incompatible} label="No coinciden" /></div>
      <div className="mt-4 rounded-2xl bg-slate-50 p-4"><p className="text-sm font-black text-slate-500">Seleccionadas</p><p className="mt-1 text-3xl font-black">{selected.length}</p>{approvedOverrides.length > 0 && <p className="mt-2 text-xs font-bold text-amber-700">{approvedOverrides.length} requieren confirmación con el cliente.</p>}</div>
      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
      <button onClick={save} disabled={saving} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#071d43] px-5 py-4 font-black text-white disabled:opacity-60">{saving ? <Loader2 className="animate-spin" size={18} /> : <Truck size={18} />} Crear ruta</button>
    </section>

    <section className="rounded-[2rem] border bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-black">Solicitudes disponibles</h2><p className="text-slate-500">Clasificadas según la fecha elegida para la ruta.</p></div><label className="relative sm:w-80"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="h-12 w-full rounded-2xl border pl-11 pr-4 font-bold" /></label></div>
      <div className="mt-6 space-y-6">{Object.entries(grouped).map(([city, items]) => <div key={city}><div className="mb-3 flex items-center gap-2"><MapPin size={18} className="text-red-500" /><h3 className="text-lg font-black">{city}</h3><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black">{items.length}</span></div><div className="grid gap-3 lg:grid-cols-2">{items.map((item) => {
        const mode = compatibility(item, routeDate);
        const selectedNow = selected.includes(item.id);
        return <label key={item.id} className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition ${selectedNow ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}><input type="checkbox" checked={selectedNow} onChange={() => toggle(item)} className="mt-1 h-5 w-5" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-black">{item.customer_name} · {item.request_code}</p><Status mode={mode} /></div><p className="mt-1 text-sm font-bold text-slate-500">{item.address_line_1}, {item.postal_code}</p><p className="mt-2 flex items-center gap-1 text-xs font-black text-blue-700"><CalendarDays size={14} /> {(item.preferred_dates || []).join(" · ") || "Cualquier día"}</p>{mode === "incompatible" && selectedNow && <p className="mt-2 flex items-center gap-1 text-xs font-black text-amber-700"><AlertTriangle size={14} /> Pendiente de confirmar por WhatsApp</p>}</div></label>;
      })}</div></div>)}</div>
    </section>
    <style jsx>{`.input{width:100%;border:1px solid #e2e8f0;border-radius:1rem;padding:.8rem 1rem;font-weight:700;outline:none}.input:focus{border-color:#60a5fa}`}</style>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-sm font-black">{label}</span>{children}</label>; }
function Badge({ tone, value, label }: { tone: "green"|"blue"|"amber"; value: number; label: string }) { const c={green:"bg-emerald-50 text-emerald-700",blue:"bg-blue-50 text-blue-700",amber:"bg-amber-50 text-amber-700"}[tone]; return <div className={`rounded-2xl p-3 ${c}`}><p className="text-xl font-black">{value}</p><p className="text-[10px] font-black uppercase">{label}</p></div>; }
function Status({ mode }: { mode: "compatible"|"flexible"|"incompatible" }) { if(mode==="compatible") return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700"><CheckCircle2 size={12}/> Compatible</span>; if(mode==="flexible") return <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">Flexible</span>; return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700"><AlertTriangle size={12}/> No coincide</span>; }
