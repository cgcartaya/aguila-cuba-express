"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Loader2, MapPin, Search, Truck } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { createPickupRoute, getPickupRequests } from "@/lib/services/pickups";
import type { PickupRequest } from "@/lib/pickups/types";

export default function NewPickupRoutePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { store: selectedStore, loading: storeLoading } = useStore() as any;
  const { store: accessStore, isSuperAdmin, loading: accessLoading } = useAdminAccess();
  const store = isSuperAdmin ? selectedStore || accessStore : accessStore;
  const [requests, setRequests] = useState<PickupRequest[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [routeDate, setRouteDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [name, setName] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [vehicleName, setVehicleName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!store?.id) return;
    getPickupRequests(store.id).then(({ data }) => {
      const available = data.filter((item) => !["picked_up", "cancelled", "assigned", "en_route"].includes(item.status));
      setRequests(available);
      const requestedIds = (searchParams.get("requests") || "").split(",").filter(Boolean);
      if (requestedIds.length > 0) {
        const validIds = requestedIds.filter((id) => available.some((item) => item.id === id));
        setSelected(validIds);
      }
    });
  }, [store?.id, searchParams]);

  const filtered = useMemo(() => requests.filter((item) => `${item.customer_name} ${item.city} ${item.request_code}`.toLowerCase().includes(search.toLowerCase())), [requests, search]);
  const grouped = useMemo(() => filtered.reduce<Record<string, PickupRequest[]>>((acc, item) => { (acc[item.city] ||= []).push(item); return acc; }, {}), [filtered]);

  function toggle(id: string) { setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); }

  async function save() {
    if (!store?.id || !name.trim() || !routeDate || selected.length === 0) return setError("Escribe un nombre, selecciona una fecha y al menos una solicitud.");
    setSaving(true); setError("");
    const result = await createPickupRoute({ storeId: store.id, name: name.trim(), routeDate, driverName, driverPhone, vehicleName, requestIds: selected });
    setSaving(false);
    if (result.error || !result.data) return setError(result.error?.message || "No se pudo crear la ruta.");
    router.push(`/admin/pickups/routes/${result.data.id}`);
  }

  if (accessLoading || storeLoading) return <div className="p-12 text-center"><Loader2 className="mx-auto animate-spin" /></div>;

  return <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
    <section className="h-fit rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-6">
      <p className="text-xs font-black uppercase tracking-[.16em] text-blue-600">Nueva ruta</p><h1 className="mt-2 text-3xl font-black">Preparar recorrido</h1>
      <div className="mt-6 space-y-4"><Field label="Nombre de la ruta"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Ruta Columbia y Lexington" className="input" /></Field><Field label="Fecha"><input type="date" value={routeDate} onChange={(e) => setRouteDate(e.target.value)} className="input" /></Field><Field label="Conductor"><input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Yoyo" className="input" /></Field><Field label="Teléfono del conductor"><input value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} className="input" /></Field><Field label="Vehículo"><input value={vehicleName} onChange={(e) => setVehicleName(e.target.value)} placeholder="Van principal" className="input" /></Field></div>
      <div className="mt-6 rounded-2xl bg-slate-50 p-4"><p className="text-sm font-black text-slate-500">Seleccionadas</p><p className="mt-1 text-3xl font-black">{selected.length}</p></div>
      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
      <button onClick={save} disabled={saving} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#071d43] px-5 py-4 font-black text-white disabled:opacity-60">{saving ? <Loader2 className="animate-spin" size={18} /> : <Truck size={18} />} Crear ruta</button>
    </section>

    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-black">Solicitudes disponibles</h2><p className="text-slate-500">Agrupadas por ciudad para facilitar la planificación.</p></div><label className="relative sm:w-80"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="h-12 w-full rounded-2xl border border-slate-200 pl-11 pr-4 font-bold" /></label></div>
      <div className="mt-6 space-y-6">{Object.entries(grouped).map(([city, items]) => <div key={city}><div className="mb-3 flex items-center gap-2"><MapPin size={18} className="text-red-500" /><h3 className="text-lg font-black">{city}</h3><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black">{items.length}</span></div><div className="grid gap-3 lg:grid-cols-2">{items.map((item) => <label key={item.id} className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition ${selected.includes(item.id) ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} className="mt-1 h-5 w-5" /><div><p className="font-black">{item.customer_name} · {item.request_code}</p><p className="mt-1 text-sm font-bold text-slate-500">{item.address_line_1}, {item.postal_code}</p><p className="mt-2 flex items-center gap-1 text-xs font-black text-blue-700"><CalendarDays size={14} /> {(item.preferred_dates || []).join(" · ") || "Sin preferencia"}</p></div></label>)}</div></div>)}</div>
    </section>
    <style jsx>{`.input{width:100%;border:1px solid #e2e8f0;border-radius:1rem;padding:.8rem 1rem;font-weight:700;outline:none}.input:focus{border-color:#60a5fa}`}</style>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-sm font-black">{label}</span>{children}</label>; }
