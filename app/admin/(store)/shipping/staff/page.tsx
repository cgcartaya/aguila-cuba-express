"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit3, Loader2, MapPinned, Plus, Search, ShieldCheck, Truck, UserRound, Users } from "lucide-react";
import StaffFormModal from "@/components/admin/shipping/staff/StaffFormModal";
import StaffRouteModal from "@/components/admin/shipping/staff/StaffRouteModal";
import StaffStatusBadge from "@/components/admin/shipping/staff/StaffStatusBadge";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { createShippingStaff, getShippingStaff, setShippingStaffStatus, updateShippingStaff } from "@/lib/services/shipping-staff";
import type { StaffStatus, StaffUser, StaffUserInput } from "@/lib/shipping/staff-types";
import { STAFF_ROLE_LABELS } from "@/lib/shipping/staff-types";

export default function ShippingStaffPage() {
  const { isSuperAdmin, store: accessStore, loading: accessLoading } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();
  const activeStore = useMemo(() => isSuperAdmin ? selectedStore || accessStore : accessStore, [isSuperAdmin, selectedStore, accessStore]);

  const [users, setUsers] = useState<StaffUser[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | StaffStatus>("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [routeUser, setRouteUser] = useState<StaffUser | null>(null);

  async function load() {
    if (!activeStore?.id) { setUsers([]); setLoading(false); return; }
    setLoading(true); setError("");
    const result = await getShippingStaff(activeStore.id);
    if (result.error) setError(result.error.message || "No se pudo cargar el personal.");
    setUsers(result.data);
    setLoading(false);
  }

  useEffect(() => { if (!accessLoading && !storeLoading) void load(); }, [activeStore?.id, accessLoading, storeLoading]);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesStatus = status === "ALL" || user.status === status;
      const haystack = `${user.first_name} ${user.last_name} ${user.username} ${user.phone || ""}`.toLowerCase();
      return matchesStatus && (!text || haystack.includes(text));
    });
  }, [users, query, status]);

  async function save(input: StaffUserInput) {
    setSaving(true); setError("");
    const result = editing ? await updateShippingStaff(editing.id, input) : await createShippingStaff(input);
    setSaving(false);
    if (result.error) { setError(result.error.message || "No se pudo guardar el usuario."); return; }
    setModalOpen(false); setEditing(null); await load();
  }

  async function changeStatus(user: StaffUser) {
    const next: StaffStatus = user.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    const result = await setShippingStaffStatus(user.id, next);
    if (result.error) { setError(result.error.message); return; }
    setUsers((current) => current.map((item) => item.id === user.id ? { ...item, status: next } : item));
  }

  const activeCount = users.filter((u)=>u.status === "ACTIVE").length;
  const drivers = users.filter((u)=>u.role === "DELIVERY").length;

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-4 pb-28 md:p-6 xl:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#061b3a] via-[#0a2d63] to-[#1554a6] p-6 text-white shadow-xl md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black"><Users size={15}/> Módulo de personal</div><h1 className="text-3xl font-black md:text-4xl">Personal de envíos</h1><p className="mt-2 max-w-2xl text-sm font-medium text-blue-100/80 md:text-base">Gestiona repartidores, operadores y accesos de {activeStore?.name || "la empresa"}.</p></div>
            <button onClick={()=>{setEditing(null);setModalOpen(true)}} disabled={!activeStore?.id} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-[#061b3a] shadow-lg disabled:opacity-50"><Plus size={19}/> Nuevo usuario</button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <Metric icon={<Users/>} label="Total" value={users.length}/><Metric icon={<ShieldCheck/>} label="Activos" value={activeCount}/><Metric icon={<Truck/>} label="Repartidores" value={drivers}/>
        </section>

        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 font-bold text-rose-700">{error}</div>}

        <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-5 flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar por nombre, usuario o teléfono..." className="w-full rounded-2xl border border-slate-200 py-3 pl-12 pr-4 font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"/></div>
            <select value={status} onChange={(e)=>setStatus(e.target.value as "ALL"|StaffStatus)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none"><option value="ALL">Todos los estados</option><option value="ACTIVE">Activos</option><option value="VACATION">Vacaciones</option><option value="SUSPENDED">Suspendidos</option></select>
          </div>

          {loading ? <div className="flex min-h-56 items-center justify-center text-slate-500"><Loader2 className="mr-2 animate-spin"/> Cargando personal...</div> : filtered.length === 0 ? <div className="flex min-h-56 flex-col items-center justify-center text-center text-slate-500"><UserRound size={42} className="mb-3 text-slate-300"/><p className="font-black text-slate-700">No hay usuarios para mostrar</p><p className="text-sm">Crea el primer usuario del equipo.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-left"><thead><tr className="border-b text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-3">Personal</th><th className="px-3 py-3">Usuario</th><th className="px-3 py-3">Rol</th><th className="px-3 py-3">Vehículo</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3 text-right">Acciones</th></tr></thead><tbody>{filtered.map((user)=><tr key={user.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50"><td className="px-3 py-4"><div className="flex items-center gap-3">{user.photo_url ? <img src={user.photo_url} alt="" className="h-11 w-11 rounded-2xl object-cover"/> : <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 font-black text-blue-700">{user.first_name.slice(0,1)}{user.last_name.slice(0,1)}</div>}<div><p className="font-black text-slate-900">{user.first_name} {user.last_name}</p><p className="text-xs font-semibold text-slate-500">{user.phone || "Sin teléfono"}</p></div></div></td><td className="px-3 py-4 font-bold text-slate-700">@{user.username}</td><td className="px-3 py-4 font-bold text-slate-700">{STAFF_ROLE_LABELS[user.role]}</td><td className="px-3 py-4 text-sm font-semibold text-slate-600">{user.vehicle_type || "—"}{user.vehicle_plate ? ` · ${user.vehicle_plate}` : ""}</td><td className="px-3 py-4"><StaffStatusBadge status={user.status}/></td><td className="px-3 py-4"><div className="flex justify-end gap-2"><button onClick={()=>setRouteUser(user)} className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100"><MapPinned size={15}/> Ruta</button><button onClick={()=>{setEditing(user);setModalOpen(true)}} className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-100"><Edit3 size={15}/> Editar</button><button onClick={()=>void changeStatus(user)} className={`rounded-xl px-3 py-2 text-xs font-black ${user.status === "SUSPENDED" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{user.status === "SUSPENDED" ? "Activar" : "Suspender"}</button></div></td></tr>)}</tbody></table></div>}
        </section>
      </div>

      {activeStore?.id && <StaffFormModal open={modalOpen} storeId={activeStore.id} user={editing} saving={saving} onClose={()=>{if(!saving){setModalOpen(false);setEditing(null)}}} onSave={save}/>} 
      {activeStore?.id && <StaffRouteModal open={Boolean(routeUser)} storeId={activeStore.id} user={routeUser} onClose={()=>setRouteUser(null)} />}
    </main>
  );
}

function Metric({icon,label,value}:{icon:React.ReactNode;label:string;value:number}) { return <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><div className="rounded-2xl bg-blue-50 p-3 text-blue-700">{icon}</div><div><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><p className="text-2xl font-black text-slate-900">{value}</p></div></div></div> }
