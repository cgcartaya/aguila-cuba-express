"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, Loader2, PackagePlus, Plus, Trash2, Truck, X } from "lucide-react";
import {
  confirmInventoryPurchase, createPurchaseDraft, deletePurchaseDraft,
  getEconomySuppliers, getInventoryPurchases, getPurchaseProducts,
  type EconomySupplier, type InventoryPurchase, type PurchaseProduct,
} from "@/lib/services/economy-purchases";

type DraftItem = { productId: string; quantity: string; unitCost: string };
const today = () => new Date().toISOString().slice(0,10);

export default function PurchasesManager({storeId,currency="USD"}:{storeId:string;currency?:string}) {
  const [purchases,setPurchases]=useState<InventoryPurchase[]>([]);
  const [suppliers,setSuppliers]=useState<EconomySupplier[]>([]);
  const [products,setProducts]=useState<PurchaseProduct[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [confirming,setConfirming]=useState<string|null>(null);
  const [open,setOpen]=useState(false);
  const [supplierId,setSupplierId]=useState("");
  const [purchaseDate,setPurchaseDate]=useState(today());
  const [reference,setReference]=useState("");
  const [shippingCost,setShippingCost]=useState("");
  const [customsCost,setCustomsCost]=useState("");
  const [otherCosts,setOtherCosts]=useState("");
  const [notes,setNotes]=useState("");
  const [items,setItems]=useState<DraftItem[]>([{productId:"",quantity:"1",unitCost:""}]);

  const money=useMemo(()=>new Intl.NumberFormat(currency==="CUP"?"es-CU":"en-US",{
    style:"currency",currency,maximumFractionDigits:currency==="CUP"?0:2
  }),[currency]);

  async function load(){
    setLoading(true);
    try{
      const [a,b,c]=await Promise.all([
        getInventoryPurchases(storeId),getEconomySuppliers(storeId),getPurchaseProducts(storeId)
      ]);
      setPurchases(a);setSuppliers(b);setProducts(c);
    }catch(e){console.error(e);window.alert("No se pudieron cargar las compras.");}
    finally{setLoading(false);}
  }

  useEffect(()=>{void load();},[storeId]);

  const merchandise=items.reduce((s,i)=>s+Math.max(0,Number(i.quantity||0))*Math.max(0,Number(i.unitCost||0)),0);
  const extras=Math.max(0,Number(shippingCost||0))+Math.max(0,Number(customsCost||0))+Math.max(0,Number(otherCosts||0));
  const confirmedInvestment=purchases.filter(p=>p.status==="confirmed").reduce((s,p)=>s+p.total_amount,0);
  const drafts=purchases.filter(p=>p.status==="draft").length;

  function reset(){
    setSupplierId("");setPurchaseDate(today());setReference("");setShippingCost("");
    setCustomsCost("");setOtherCosts("");setNotes("");setItems([{productId:"",quantity:"1",unitCost:""}]);
  }
  function updateItem(index:number,patch:Partial<DraftItem>){
    setItems(cur=>cur.map((i,n)=>n===index?{...i,...patch}:i));
  }

  async function saveDraft(e:FormEvent){
    e.preventDefault();
    const valid=items.filter(i=>i.productId&&Number(i.quantity)>0).map(i=>({
      productId:i.productId,quantity:Math.trunc(Number(i.quantity)),unitCost:Math.max(0,Number(i.unitCost||0))
    }));
    if(!valid.length){window.alert("Agrega al menos un producto válido.");return;}
    setSaving(true);
    try{
      const {error}=await createPurchaseDraft(storeId,{
        supplierId:supplierId||null,purchaseDate,reference,
        shippingCost:Number(shippingCost||0),customsCost:Number(customsCost||0),
        otherCosts:Number(otherCosts||0),notes,items:valid
      });
      if(error) throw error;
      setOpen(false);reset();await load();
    }catch(err:any){window.alert(err?.message||"No se pudo guardar el borrador.");}
    finally{setSaving(false);}
  }

  async function confirm(p:InventoryPurchase){
    if(!window.confirm("Confirmar aumentará el inventario y recalculará el costo promedio. ¿Continuar?")) return;
    setConfirming(p.id);
    try{
      const {error}=await confirmInventoryPurchase(p.id);
      if(error) throw error;
      await load();window.alert("Compra confirmada. Inventario y costos actualizados.");
    }catch(err:any){window.alert(err?.message||"No se pudo confirmar la compra.");}
    finally{setConfirming(null);}
  }

  async function remove(id:string){
    if(!window.confirm("¿Eliminar este borrador?")) return;
    const {error}=await deletePurchaseDraft(storeId,id);
    if(error){window.alert(error.message);return;}
    await load();
  }

  if(loading) return <div className="flex min-h-64 items-center justify-center rounded-3xl bg-white"><Loader2 className="animate-spin text-blue-700" size={30}/></div>;

  return <>
    <section className="grid gap-4 md:grid-cols-3">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">Compras registradas</p>
        <p className="mt-2 text-3xl font-black text-slate-900">{purchases.length}</p>
      </div>
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-xs font-black uppercase tracking-wide text-amber-600">Borradores</p>
        <p className="mt-2 text-3xl font-black text-amber-900">{drafts}</p>
        <p className="mt-1 text-sm text-amber-700">No afectan inventario</p>
      </div>
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="text-xs font-black uppercase tracking-wide text-emerald-600">Inversión confirmada</p>
        <p className="mt-2 text-3xl font-black text-emerald-900">{money.format(confirmedInvestment)}</p>
      </div>
    </section>

    <div className="mt-5 flex justify-end">
      <button onClick={()=>setOpen(true)} className="inline-flex items-center gap-2 rounded-2xl bg-[#061b3a] px-5 py-3 text-sm font-black text-white">
        <Plus size={18}/> Nueva compra
      </button>
    </div>

    <section className="mt-5 space-y-4">
      {purchases.map(p=>{
        const rows=p.inventory_purchase_items||[];
        return <article key={p.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black text-[#061b3a]">{p.economy_suppliers?.name||"Sin proveedor"}</h3>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${p.status==="confirmed"?"bg-emerald-100 text-emerald-700":"bg-amber-100 text-amber-700"}`}>
                  {p.status==="confirmed"?"Confirmada":"Borrador"}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-500">{p.purchase_date}{p.reference?` · Ref. ${p.reference}`:""}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {rows.map(i=><span key={i.id} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">{i.quantity}× {i.products?.name||"Producto"}</span>)}
              </div>
            </div>
            <div className="min-w-[220px] rounded-2xl bg-slate-50 p-4">
              <div className="flex justify-between text-sm"><span>Mercancía</span><strong>{money.format(p.merchandise_total)}</strong></div>
              <div className="mt-2 flex justify-between text-sm"><span>Gastos</span><strong>{money.format(p.shipping_cost+p.customs_cost+p.other_costs)}</strong></div>
              <div className="mt-3 flex justify-between border-t border-slate-200 pt-3"><span className="font-black">Total</span><strong className="text-lg">{money.format(p.total_amount)}</strong></div>
            </div>
          </div>

          {p.status==="confirmed"&&rows.some(i=>i.new_average_cost>0)&&
            <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {rows.map(i=>{
                const ch=i.previous_average_cost>0?((i.new_average_cost-i.previous_average_cost)/i.previous_average_cost)*100:0;
                return <div key={`${i.id}-cost`} className="rounded-2xl border border-slate-100 p-3">
                  <p className="truncate text-xs font-black text-slate-600">{i.products?.name}</p>
                  <p className="mt-1 text-sm text-slate-500">Costo puesto: <strong>{money.format(i.landed_unit_cost)}</strong></p>
                  <p className="text-sm text-slate-500">Promedio nuevo: <strong>{money.format(i.new_average_cost)}</strong>
                    {i.previous_average_cost>0&&<span className={ch>0?"ml-2 text-rose-600":"ml-2 text-emerald-600"}>{ch>0?"+":""}{ch.toFixed(1)}%</span>}
                  </p>
                </div>
              })}
            </div>
          }

          {p.status==="draft"&&<div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button onClick={()=>remove(p.id)} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-black text-rose-700"><Trash2 size={16}/>Eliminar</button>
            <button disabled={confirming===p.id} onClick={()=>confirm(p)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
              {confirming===p.id?<Loader2 className="animate-spin" size={16}/>:<CheckCircle2 size={16}/>}Confirmar compra
            </button>
          </div>}
        </article>
      })}
      {!purchases.length&&<div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <ClipboardList className="mx-auto text-slate-300" size={38}/><h3 className="mt-3 font-black text-slate-700">Todavía no hay compras</h3>
      </div>}
    </section>

    {open&&<div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-3">
      <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
          <div><p className="text-xs font-black uppercase tracking-wide text-blue-600">Entrada de mercancía</p><h2 className="text-xl font-black">Nueva compra</h2></div>
          <button onClick={()=>setOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><X size={20}/></button>
        </div>
        <form onSubmit={saveDraft} className="p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm font-bold">Proveedor<select value={supplierId} onChange={e=>setSupplierId(e.target.value)} className="mt-1 w-full rounded-xl border p-3">
              <option value="">Sin proveedor</option>{suppliers.filter(s=>s.is_active).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select></label>
            <label className="text-sm font-bold">Fecha<input type="date" required value={purchaseDate} onChange={e=>setPurchaseDate(e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label>
            <label className="text-sm font-bold">Referencia<input value={reference} onChange={e=>setReference(e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label>
          </div>

          <div className="mt-6 flex items-center justify-between"><h3 className="font-black">Productos</h3>
            <button type="button" onClick={()=>setItems(cur=>[...cur,{productId:"",quantity:"1",unitCost:""}])} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700"><Plus size={14} className="inline"/> Agregar línea</button>
          </div>
          <div className="mt-3 space-y-3">
            {items.map((i,n)=><div key={n} className="grid gap-3 rounded-2xl border p-3 md:grid-cols-[1fr_120px_160px_42px]">
              <select required value={i.productId} onChange={e=>updateItem(n,{productId:e.target.value})} className="rounded-xl border p-3">
                <option value="">Selecciona producto</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} · stock {p.stock}</option>)}
              </select>
              <input type="number" min="1" step="1" required value={i.quantity} onChange={e=>updateItem(n,{quantity:e.target.value})} className="rounded-xl border p-3"/>
              <input type="number" min="0" step="0.01" required value={i.unitCost} onChange={e=>updateItem(n,{unitCost:e.target.value})} placeholder="Costo/unidad" className="rounded-xl border p-3"/>
              <button type="button" disabled={items.length===1} onClick={()=>setItems(cur=>cur.filter((_,x)=>x!==n))} className="grid h-11 w-11 place-items-center rounded-xl bg-rose-50 text-rose-600 disabled:opacity-30"><Trash2 size={17}/></button>
            </div>)}
          </div>

          <div className="mt-6 rounded-3xl bg-slate-50 p-4">
            <div className="flex items-center gap-2"><Truck size={18}/><h3 className="font-black">Gastos asociados</h3></div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <input type="number" min="0" step="0.01" value={shippingCost} onChange={e=>setShippingCost(e.target.value)} placeholder="Transporte" className="rounded-xl border p-3"/>
              <input type="number" min="0" step="0.01" value={customsCost} onChange={e=>setCustomsCost(e.target.value)} placeholder="Aduana" className="rounded-xl border p-3"/>
              <input type="number" min="0" step="0.01" value={otherCosts} onChange={e=>setOtherCosts(e.target.value)} placeholder="Otros" className="rounded-xl border p-3"/>
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-500">Al confirmar se reparten proporcionalmente por el valor de cada línea.</p>
          </div>

          <label className="mt-5 block text-sm font-bold">Notas<textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label>

          <div className="mt-6 grid gap-3 rounded-2xl border p-4 sm:grid-cols-3">
            <div><p className="text-xs font-black uppercase text-slate-400">Mercancía</p><p className="text-xl font-black">{money.format(merchandise)}</p></div>
            <div><p className="text-xs font-black uppercase text-slate-400">Gastos</p><p className="text-xl font-black">{money.format(extras)}</p></div>
            <div><p className="text-xs font-black uppercase text-slate-400">Total inversión</p><p className="text-xl font-black text-emerald-700">{money.format(merchandise+extras)}</p></div>
          </div>
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><AlertTriangle size={18} className="mr-2 inline"/><strong>Guardar no cambia inventario.</strong> Solo confirmar lo hace.</div>
          <button disabled={saving} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#061b3a] px-5 py-3.5 font-black text-white disabled:opacity-50">
            {saving?<Loader2 className="animate-spin" size={18}/>:<PackagePlus size={18}/>}Guardar borrador
          </button>
        </form>
      </div>
    </div>}
  </>;
}
