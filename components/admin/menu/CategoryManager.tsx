"use client";

import { useState } from "react";
import { GripVertical, Loader2, MoreVertical, Pencil, Plus, Trash2, X } from "lucide-react";
import { deleteMenuCategory, saveMenuCategory } from "@/lib/services/menu";

type VenueType = "bar" | "restaurant" | "general";
type Category = { id:string; name:string; venue_type:VenueType; sort_order:number; is_active:boolean; };
type Props = { storeId:string; categories:Category[]; selectedCategoryId:string|null; onSelect:(id:string)=>void; onChange:()=>void; };

const OPTIONS:{value:VenueType;label:string}[]=[{value:"general",label:"General"},{value:"bar",label:"Bar"},{value:"restaurant",label:"Restaurante"}];
const ICON_TONE:Record<VenueType,string>={general:"bg-violet-100 text-violet-600",bar:"bg-blue-100 text-blue-600",restaurant:"bg-orange-100 text-orange-600"};

export default function CategoryManager({storeId,categories,selectedCategoryId,onSelect,onChange}:Props){
 const [adding,setAdding]=useState(false); const [name,setName]=useState(""); const [venueType,setVenueType]=useState<VenueType>("general"); const [saving,setSaving]=useState(false); const [editingId,setEditingId]=useState<string|null>(null); const [editingName,setEditingName]=useState("");

 const save = async (category:Category, patch:Partial<Category>) => {
   const {error}=await saveMenuCategory(storeId,{id:category.id,name:patch.name ?? category.name,venue_type:patch.venue_type ?? category.venue_type,sort_order:category.sort_order,is_active:patch.is_active ?? category.is_active});
   if(error){alert("No se pudo actualizar la categoría.");return;} onChange();
 };
 const create=async()=>{if(!name.trim())return;setSaving(true);const {error}=await saveMenuCategory(storeId,{name:name.trim(),venue_type:venueType,sort_order:categories.length,is_active:true});setSaving(false);if(error){alert("No se pudo crear la categoría.");return;}setName("");setVenueType("general");setAdding(false);onChange();};
 const remove=async(c:Category)=>{if(!confirm(`¿Eliminar "${c.name}"? Esto también elimina todos sus platillos.`))return;const {error}=await deleteMenuCategory(c.id);if(error){alert("No se pudo eliminar la categoría.");return;}onChange();};

 return <aside className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,.04)]">
   <div className="mb-3"><div className="flex items-center justify-between"><h2 className="text-lg font-black text-[#071B35]">Categorías <span className="text-sm text-slate-400">({categories.length})</span></h2><button onClick={()=>setAdding(true)} className="rounded-lg p-2 text-orange-600 hover:bg-orange-50"><Plus size={18}/></button></div><p className="mt-1 text-[11px] font-semibold leading-4 text-slate-400">Selecciona una categoría para administrar sus platillos.</p></div>
   <div className="space-y-2">
    {categories.map(c=> editingId===c.id ? <div key={c.id} className="rounded-xl border border-orange-200 bg-orange-50/50 p-2"><input autoFocus value={editingName} onChange={e=>setEditingName(e.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold outline-none"/><div className="mt-2 flex justify-end gap-1"><button onClick={()=>{save(c,{name:editingName.trim()});setEditingId(null)}} className="rounded-lg bg-[#071B35] px-2 py-1 text-[10px] font-black text-white">Guardar</button><button onClick={()=>setEditingId(null)} className="p-1 text-slate-400"><X size={14}/></button></div></div> :
    <button key={c.id} type="button" onClick={()=>onSelect(c.id)} className={`group flex w-full items-center gap-2 rounded-xl border p-2.5 text-left transition ${selectedCategoryId===c.id?"border-orange-200 bg-orange-50 shadow-sm":"border-slate-100 bg-white hover:bg-slate-50"}`}>
      <GripVertical size={15} className="shrink-0 text-slate-300"/>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${ICON_TONE[c.venue_type]}`}>{c.name.charAt(0).toUpperCase()}</span>
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-slate-700">{c.name}</span><span className={`text-[10px] font-bold ${c.is_active?"text-emerald-600":"text-slate-400"}`}>{c.is_active?"Activa":"Inactiva"} · {OPTIONS.find(o=>o.value===c.venue_type)?.label}</span></span>
      <span onClick={e=>e.stopPropagation()} className="flex items-center gap-0.5">
        <button onClick={()=>save(c,{is_active:!c.is_active})} title={c.is_active?"Desactivar":"Activar"} className={`h-5 w-8 rounded-full p-0.5 ${c.is_active?"bg-emerald-400":"bg-slate-200"}`}><span className={`block h-4 w-4 rounded-full bg-white transition ${c.is_active?"translate-x-3":""}`}/></button>
        <button onClick={()=>{setEditingId(c.id);setEditingName(c.name)}} className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-orange-600"><Pencil size={13}/></button>
        <button onClick={()=>remove(c)} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={13}/></button>
      </span>
    </button>)}
   </div>
   {adding && <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50/40 p-3"><input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre de categoría" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none"/><select value={venueType} onChange={e=>setVenueType(e.target.value as VenueType)} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold">{OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select><div className="mt-2 flex gap-2"><button onClick={create} disabled={saving} className="flex-1 rounded-lg bg-[#FF641F] py-2 text-xs font-black text-white">{saving?<Loader2 size={14} className="mx-auto animate-spin"/>:"Crear categoría"}</button><button onClick={()=>setAdding(false)} className="rounded-lg border border-slate-200 bg-white px-3 text-slate-400"><X size={15}/></button></div></div>}
   {!adding && <button onClick={()=>setAdding(true)} className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-orange-300 py-2.5 text-xs font-black text-orange-600"><Plus size={14}/> Nueva categoría</button>}
 </aside>
}
