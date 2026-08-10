"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock3, Loader2, MapPin, Phone, Search, Star, UserRound, UsersRound } from "lucide-react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { supabase } from "@/lib/supabase";

type Customer = { id:string; name:string; phone:string; email:string|null; city:string|null; region:string|null; postal_code:string|null; pickups_count:number; last_pickup_at:string|null; created_at:string; };
const date = (value:string|null) => value ? new Intl.DateTimeFormat("es", { day:"2-digit", month:"short", year:"numeric" }).format(new Date(value)) : "Sin recogidas";

export default function PickupCustomersPage() {
  const { store:selectedStore, loading:storeLoading } = useStore() as any;
  const { store:accessStore, isSuperAdmin, loading:accessLoading } = useAdminAccess();
  const store = isSuperAdmin ? selectedStore || accessStore : accessStore;
  const [customers,setCustomers] = useState<Customer[]>([]); const [search,setSearch]=useState(""); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  useEffect(() => { if (!store?.id) return; (async()=>{ setLoading(true); const {data}=await supabase.auth.getSession(); const r=await fetch(`/api/admin/pickups/customers?store_id=${encodeURIComponent(store.id)}`,{headers:{Authorization:`Bearer ${data.session?.access_token||""}`},cache:"no-store"}); const p=await r.json().catch(()=>({})); if(!r.ok)setError(p.error||"No se pudieron cargar los clientes."); else setCustomers(p.customers||[]); setLoading(false); })(); },[store?.id]);
  const filtered=useMemo(()=>{const q=search.toLowerCase().trim(); const d=search.replace(/\D/g,""); return customers.filter(c=>!q||`${c.name} ${c.phone} ${c.city||""}`.toLowerCase().includes(q)||(d&&c.phone.replace(/\D/g,"").includes(d)));},[customers,search]);
  const frequent=customers.filter(c=>c.pickups_count>=10).length; const recent=customers.filter(c=>c.last_pickup_at&&Date.now()-new Date(c.last_pickup_at).getTime()<30*86400000).length;
  if(accessLoading||storeLoading||loading)return <main className="min-h-screen bg-slate-50 p-8"><div className="mx-auto max-w-6xl rounded-3xl bg-white p-14 text-center font-black text-slate-500"><Loader2 className="mx-auto mb-3 animate-spin"/>Cargando clientes...</div></main>;
  return <main className="min-h-screen bg-[#f4f7fb] p-4 pb-28 lg:p-8"><div className="mx-auto max-w-7xl space-y-5">
    <header className="rounded-[2rem] bg-[#08234d] p-7 text-white shadow-xl"><p className="text-xs font-black uppercase tracking-[.18em] text-blue-200">CRM de recogidas</p><h1 className="mt-2 text-3xl font-black">Clientes de YOYO</h1><p className="mt-2 max-w-2xl text-blue-100">Los clientes se crean automáticamente desde solicitudes y paradas manuales. Reutiliza sus datos sin escribirlos otra vez.</p><div className="mt-6 grid gap-3 sm:grid-cols-3"><Metric icon={<UsersRound/>} label="Clientes" value={customers.length}/><Metric icon={<Clock3/>} label="Activos 30 días" value={recent}/><Metric icon={<Star/>} label="Frecuentes" value={frequent}/></div></header>
    <div className="rounded-3xl border bg-white p-4 shadow-sm"><label className="relative block"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19}/><input value={search} onChange={e=>setSearch(e.target.value)} className="h-12 w-full rounded-2xl border bg-slate-50 pl-12 pr-4 font-bold outline-none focus:border-blue-400" placeholder="Buscar por nombre, teléfono o ciudad..."/></label></div>
    {error&&<div className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</div>}
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map(c=><Link href={`/admin/pickups/customers/${c.id}`} key={c.id} className="rounded-[1.7rem] border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="flex items-start gap-4"><div className="rounded-2xl bg-blue-50 p-4 text-blue-700"><UserRound/></div><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><h2 className="truncate text-lg font-black">{c.name}</h2>{c.pickups_count>=10&&<span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-black text-amber-700">Frecuente</span>}</div><p className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-500"><Phone size={15}/>{c.phone}</p><p className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-500"><MapPin size={15}/>{c.city||"Sin ciudad"}{c.region?`, ${c.region}`:""}</p><div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span className="text-sm font-black text-blue-800">{c.pickups_count||0} recogidas</span><span className="text-xs font-bold text-slate-500">{date(c.last_pickup_at)}</span></div></div></div></Link>)}</section>
    {!filtered.length&&<div className="rounded-3xl border border-dashed bg-white p-12 text-center font-bold text-slate-500">No encontramos clientes.</div>}
  </div></main>;
}
function Metric({icon,label,value}:{icon:React.ReactNode;label:string;value:number}){return <div className="rounded-2xl bg-white/10 p-4"><div className="flex items-center gap-2 text-blue-200">{icon}<span className="text-xs font-black uppercase">{label}</span></div><p className="mt-2 text-3xl font-black">{value}</p></div>}
