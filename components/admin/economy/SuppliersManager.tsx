"use client";

import { FormEvent, useEffect, useState } from "react";
import { Building2, Loader2, Mail, MapPin, Phone, Plus, Save, X } from "lucide-react";
import {
  createEconomySupplier, getEconomySuppliers, updateEconomySupplier, type EconomySupplier,
} from "@/lib/services/economy-purchases";

type FormState={name:string;contactName:string;phone:string;email:string;address:string;notes:string;isActive:boolean};
const emptyForm:FormState={name:"",contactName:"",phone:"",email:"",address:"",notes:"",isActive:true};

export default function SuppliersManager({storeId}:{storeId:string}){
  const [suppliers,setSuppliers]=useState<EconomySupplier[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [open,setOpen]=useState(false);
  const [editing,setEditing]=useState<EconomySupplier|null>(null);
  const [form,setForm]=useState<FormState>(emptyForm);

  async function load(){
    setLoading(true);
    try{setSuppliers(await getEconomySuppliers(storeId));}
    catch(e){console.error(e);window.alert("No se pudieron cargar los proveedores.");}
    finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[storeId]);

  function startNew(){setEditing(null);setForm(emptyForm);setOpen(true);}
  function startEdit(s:EconomySupplier){
    setEditing(s);setForm({
      name:s.name,contactName:s.contact_name||"",phone:s.phone||"",email:s.email||"",
      address:s.address||"",notes:s.notes||"",isActive:s.is_active
    });setOpen(true);
  }

  async function save(e:FormEvent){
    e.preventDefault(); if(!form.name.trim()) return;
    setSaving(true);
    try{
      if(editing){
        const {error}=await updateEconomySupplier(storeId,editing.id,form); if(error) throw error;
      }else{
        const {error}=await createEconomySupplier(storeId,form); if(error) throw error;
      }
      setOpen(false);await load();
    }catch(err:any){window.alert(err?.message||"No se pudo guardar el proveedor.");}
    finally{setSaving(false);}
  }

  if(loading)return <div className="flex min-h-64 items-center justify-center rounded-3xl bg-white"><Loader2 className="animate-spin text-blue-700" size={30}/></div>;

  return <>
    <div className="flex justify-end"><button onClick={startNew} className="inline-flex items-center gap-2 rounded-2xl bg-[#061b3a] px-5 py-3 text-sm font-black text-white"><Plus size={18}/>Nuevo proveedor</button></div>
    <section className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
      {suppliers.map(s=><button type="button" key={s.id} onClick={()=>startEdit(s)} className="rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Building2 size={20}/></span>
          <span className={`rounded-full px-3 py-1 text-xs font-black ${s.is_active?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-500"}`}>{s.is_active?"Activo":"Inactivo"}</span>
        </div>
        <h3 className="mt-4 text-lg font-black text-[#061b3a]">{s.name}</h3>
        {s.contact_name&&<p className="mt-1 text-sm font-semibold text-slate-500">{s.contact_name}</p>}
        <div className="mt-4 space-y-2 text-sm text-slate-500">
          {s.phone&&<p className="flex items-center gap-2"><Phone size={15}/>{s.phone}</p>}
          {s.email&&<p className="flex items-center gap-2"><Mail size={15}/>{s.email}</p>}
          {s.address&&<p className="flex items-center gap-2"><MapPin size={15}/>{s.address}</p>}
        </div>
      </button>)}
    </section>
    {!suppliers.length&&<div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><Building2 className="mx-auto text-slate-300" size={38}/><h3 className="mt-3 font-black text-slate-700">Todavía no hay proveedores</h3></div>}

    {open&&<div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-3">
      <form onSubmit={save} className="w-full max-w-2xl rounded-3xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div><p className="text-xs font-black uppercase tracking-wide text-blue-600">Economía</p><h2 className="text-xl font-black">{editing?"Editar proveedor":"Nuevo proveedor"}</h2></div>
          <button type="button" onClick={()=>setOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><X size={20}/></button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-bold">Nombre<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="mt-1 w-full rounded-xl border p-3"/></label>
          <label className="text-sm font-bold">Contacto<input value={form.contactName} onChange={e=>setForm({...form,contactName:e.target.value})} className="mt-1 w-full rounded-xl border p-3"/></label>
          <label className="text-sm font-bold">Teléfono<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="mt-1 w-full rounded-xl border p-3"/></label>
          <label className="text-sm font-bold">Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="mt-1 w-full rounded-xl border p-3"/></label>
        </div>
        <label className="mt-4 block text-sm font-bold">Dirección<input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} className="mt-1 w-full rounded-xl border p-3"/></label>
        <label className="mt-4 block text-sm font-bold">Notas<textarea rows={3} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="mt-1 w-full rounded-xl border p-3"/></label>
        {editing&&<label className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold"><input type="checkbox" checked={form.isActive} onChange={e=>setForm({...form,isActive:e.target.checked})}/>Proveedor activo</label>}
        <button disabled={saving} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#061b3a] px-5 py-3.5 font-black text-white disabled:opacity-50">{saving?<Loader2 className="animate-spin" size={18}/>:<Save size={18}/>}Guardar proveedor</button>
      </form>
    </div>}
  </>;
}
