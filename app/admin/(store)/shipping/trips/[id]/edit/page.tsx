"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Route, Save } from "lucide-react";

import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { getShippingTripById, updateShippingTrip } from "@/lib/services/shipping-trips";
import type { ShippingTripInput } from "@/lib/shipping/types";

const empty: ShippingTripInput = { name: "", origin: "", destination: "", departure_date: "", estimated_arrival_date: "", driver_name: "", vehicle: "", transport_mode: "ground", manifest_notes: "", is_default: false };

// El input <input type="datetime-local"> necesita "YYYY-MM-DDTHH:mm", no un
// timestamptz completo con zona horaria; esto convierte lo que viene de la
// base de datos al formato que el input espera.
function toLocalInputValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function EditShippingTripPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const tripId = params.id;
  const { isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore } = useStore();
  const activeStore = useMemo(() => (isSuperAdmin ? selectedStore || accessStore : accessStore), [accessStore, isSuperAdmin, selectedStore]);

  const [form, setForm] = useState<ShippingTripInput>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!activeStore?.id || !tripId) return;
      setLoading(true);
      setError("");
      const result = await getShippingTripById(activeStore.id, tripId);
      if (result.error || !result.data) {
        setError(result.error?.message || "No se pudo cargar el viaje.");
        setLoading(false);
        return;
      }
      const trip = result.data;
      setForm({
        name: trip.name || "",
        origin: trip.origin || "",
        destination: trip.destination || "",
        departure_date: toLocalInputValue(trip.departure_date),
        estimated_arrival_date: toLocalInputValue(trip.estimated_arrival_date),
        driver_name: trip.driver_name || "",
        vehicle: trip.vehicle || "",
        transport_mode: (trip.transport_mode as ShippingTripInput["transport_mode"]) || "ground",
        manifest_notes: trip.manifest_notes || "",
        is_default: Boolean(trip.is_default),
      });
      setLoading(false);
    }
    void load();
  }, [activeStore?.id, tripId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!activeStore?.id) return setError("No se encontró la empresa activa.");
    if (!form.name.trim()) return setError("Escribe un nombre para el viaje.");
    setSaving(true); setError("");
    const result = await updateShippingTrip(activeStore.id, tripId, form);
    setSaving(false);
    if (result.error) return setError(result.error.message || "No se pudo guardar el viaje.");
    router.push(`/admin/shipping/trips/${tripId}`);
  }

  function field<K extends keyof ShippingTripInput>(key: K, value: ShippingTripInput[K]) { setForm((current) => ({ ...current, [key]: value })); }

  if (loading) {
    return <main className="flex min-h-[60vh] items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-700" size={34} /></main>;
  }

  return <main className="min-h-screen bg-[#f5f7fb] p-4 pb-28 md:p-7"><div className="mx-auto max-w-4xl">
    <Link href={`/admin/shipping/trips/${tripId}`} className="mb-5 inline-flex items-center gap-2 font-black text-slate-600"><ArrowLeft size={18}/> Volver al viaje</Link>
    <form onSubmit={submit} className="overflow-hidden rounded-[2rem] bg-white shadow-xl">
      <header className="bg-gradient-to-br from-[#061b3a] to-[#1554a6] p-6 text-white md:p-8"><div className="flex items-center gap-3"><Route size={30}/><div><h1 className="text-3xl font-black">Editar viaje</h1><p className="mt-1 text-blue-100/80">Actualiza el nombre, origen, destino y demás datos generales del viaje.</p></div></div></header>
      <div className="grid gap-5 p-6 md:grid-cols-2 md:p-8">
        <Input label="Nombre del viaje" value={form.name} onChange={(v)=>field("name",v)} placeholder="Ej. Viaje agosto 2026" required />
        <Select label="Tipo de transporte" value={form.transport_mode} onChange={(v)=>field("transport_mode",v as ShippingTripInput["transport_mode"])} options={[['ground','Terrestre'],['air','Aéreo'],['sea','Marítimo'],['mixed','Mixto'],['other','Otro']]} />
        <Input label="Origen" value={form.origin} onChange={(v)=>field("origin",v)} />
        <Input label="Destino" value={form.destination} onChange={(v)=>field("destination",v)} />
        <Input label="Fecha de salida" type="datetime-local" value={form.departure_date} onChange={(v)=>field("departure_date",v)} />
        <Input label="Llegada estimada" type="datetime-local" value={form.estimated_arrival_date} onChange={(v)=>field("estimated_arrival_date",v)} />
        <Input label="Chofer o responsable" value={form.driver_name} onChange={(v)=>field("driver_name",v)} />
        <Input label="Vehículo / contenedor" value={form.vehicle} onChange={(v)=>field("vehicle",v)} />
        <label className="md:col-span-2"><span className="mb-2 block text-sm font-black text-slate-700">Notas del manifiesto</span><textarea value={form.manifest_notes} onChange={(e)=>field("manifest_notes",e.target.value)} rows={4} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" /></label>
        {error && <div className="md:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 font-bold text-rose-700">{error}</div>}
        <div className="md:col-span-2 flex justify-end"><button disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-[#0a2d63] px-6 py-3 font-black text-white disabled:opacity-60">{saving?<Loader2 className="animate-spin" size={19}/>:<Save size={19}/>} Guardar cambios</button></div>
      </div>
    </form>
  </div></main>;
}

function Input({label,value,onChange,type="text",placeholder,required=false}:{label:string;value:string;onChange:(v:string)=>void;type?:string;placeholder?:string;required?:boolean}) { return <label><span className="mb-2 block text-sm font-black text-slate-700">{label}</span><input required={required} type={type} value={value} placeholder={placeholder} onChange={(e)=>onChange(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" /></label>; }
function Select({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:[string,string][]}) { return <label><span className="mb-2 block text-sm font-black text-slate-700">{label}</span><select value={value} onChange={(e)=>onChange(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500">{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>; }
