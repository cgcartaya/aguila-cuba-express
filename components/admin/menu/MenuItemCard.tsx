"use client";

import Link from "next/link";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import type { MenuItem } from "@/lib/menu/types";

type Props={item:MenuItem;onDelete:(id:string)=>void};

export default function MenuItemCard({item,onDelete}:Props){
 return <div className="grid items-center gap-3 py-3 md:grid-cols-[minmax(0,1fr)_90px_110px_110px]">
   <div className="flex min-w-0 items-center gap-3">
    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-100">{item.image_url?<img src={item.image_url} alt={item.name} className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center text-[9px] font-bold text-slate-300">SIN FOTO</div>}</div>
    <div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><p className="truncate text-sm font-black text-slate-800">{item.name}</p>{item.is_featured&&<span className="rounded-full bg-orange-50 px-2 py-0.5 text-[9px] font-black text-orange-600">Destacado</span>}</div><p className="mt-0.5 line-clamp-1 text-xs font-semibold text-slate-400">{item.description||"Sin descripción"}</p>{item.menu_item_option_groups.length>0&&<p className="mt-1 text-[10px] font-bold text-violet-500">{item.menu_item_option_groups.map(g=>g.name).join(" · ")}</p>}</div>
   </div>
   <p className="text-sm font-black text-slate-800">${item.price.toFixed(2)}</p>
   <div><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${item.is_active?"bg-emerald-50 text-emerald-600":"bg-slate-100 text-slate-400"}`}>{item.is_active?"Activo":"Oculto"}</span><p className="mt-1 text-[10px] font-semibold text-slate-400">{item.is_active?"Disponible":"No visible"}</p></div>
   <div className="flex justify-end gap-1">
    <Link href={`/admin/menu/items/${item.id}`} className="rounded-lg border border-slate-200 p-2 text-orange-500 hover:bg-orange-50"><Pencil size={15}/></Link>
    <button onClick={()=>onDelete(item.id)} className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:border-red-100 hover:bg-red-50 hover:text-red-600"><Trash2 size={15}/></button>
    <span className="rounded-lg border border-slate-200 p-2 text-slate-300">{item.is_active?<Eye size={15}/>:<EyeOff size={15}/>}</span>
   </div>
 </div>
}
