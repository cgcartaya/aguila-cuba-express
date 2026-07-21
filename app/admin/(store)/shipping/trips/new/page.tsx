"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Route, Save } from "lucide-react";

import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { createShippingTrip } from "@/lib/services/shipping-trips";
import type { ShippingTripInput } from "@/lib/shipping/types";

const initial: ShippingTripInput = { name: "", origin: "Miami", destination: "Cienfuegos", departure_date: "", estimated_arrival_date: "", driver_name: "", vehicle: "", transport_mode: "ground", manifest_notes: "" };

export default function NewShippingTripPage() {
  const router = useRouter();
  const { isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore } = useStore();
  const activeStore = useMemo(() => (isSuperAdmin ? selectedStore || accessStore : accessStore), [accessStore, isSuperAdmin, selectedStore]);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!activeStore?.id) return setError("No se encontró la empresa activa.");
    if (!form.name.trim()) return setError("Escribe un nombre para el viaje.");
    setSaving(true); setError("");
    const result = await createShippingTrip(activeStore.id, form);
    if (result.error) { setError(result.error.message || "No se pudo crear el viaje."); setSaving(false); return; }
    const trip = result.data as { id?: string } | null;
    router.push(trip?.id ? `/admin/shipping/trips/${trip.id}` : "/admin/shipping/trips");
  }

  function field<K extends keyof ShippingTripInput>(key: K, value: ShippingTripInput[K]) { setForm((current) => ({ ...current, [key]: value })); }

  return <main className="min-h-screen bg-[#f5f7fb] p-4 pb-28 md:p-7"><div className="mx-auto max-w-4xl">
    <Link href="/admin/shipping/trips" className="mb-5 inline-flex items-center gap-2 font-black text-slate-600"><ArrowLeft size={18}/> Volver a viajes</Link>
    <form onSubmit={submit} className="overflow-hidden rounded-[2rem] bg-white shadow-xl">
      <header className="bg-gradient-to-br from-[#061b3a] to-[#1554a6] p-6 text-white md:p-8"><div className="flex items-center gap-3"><Route size={30}/><div><h1 className="text-3xl font-black">Crear nuevo viaje</h1><p className="mt-1 text-blue-100/80">Los envíos nuevos se asignarán automáticamente a este viaje.</p></div></div></header>
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
        <div className="md:col-span-2 flex justify-end"><button disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-[#0a2d63] px-6 py-3 font-black text-white disabled:opacity-60">{saving?<Loader2 className="animate-spin" size={19}/>:<Save size={19}/>} Crear viaje</button></div>
      </div>
    </form>
  </div></main>;
}

function Input({label,value,onChange,type="text",placeholder,required=false}:{label:string;value:string;onChange:(v:string)=>void;type?:string;placeholder?:string;required?:boolean}) { return <label><span className="mb-2 block text-sm font-black text-slate-700">{label}</span><input required={required} type={type} value={value} placeholder={placeholder} onChange={(e)=>onChange(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" /></label>; }
function Select({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:[string,string][]}) { return <label><span className="mb-2 block text-sm font-black text-slate-700">{label}</span><select value={value} onChange={(e)=>onChange(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500">{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>; }
