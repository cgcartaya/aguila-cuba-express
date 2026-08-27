"use client";

import {useEffect,useMemo,useState} from "react";
import {AlertTriangle,ArrowDownRight,ArrowUpRight,CalendarDays,Loader2,PackageSearch,ReceiptText,TrendingUp} from "lucide-react";
import {getEconomyExpenses} from "@/lib/services/economy";
import {getHistoricalProfitReport,type HistoricalReport} from "@/lib/services/economy-history";

function dateInput(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function initial(){const e=new Date(),s=new Date();s.setDate(s.getDate()-29);return{start:dateInput(s),end:dateInput(e)};}
function pct(v:number){return `${Number(v||0).toFixed(1)}%`;}

export default function HistoricalProfitDashboard({storeId,currency="USD"}:{storeId:string;currency?:string}){
  const defaults=useMemo(()=>initial(),[]);
  const [startDate,setStartDate]=useState(defaults.start);
  const [endDate,setEndDate]=useState(defaults.end);
  const [report,setReport]=useState<HistoricalReport|null>(null);
  const [expenses,setExpenses]=useState(0);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  const money=useMemo(()=>new Intl.NumberFormat(currency==="CUP"?"es-CU":"en-US",{
    style:"currency",currency,maximumFractionDigits:currency==="CUP"?0:2
  }),[currency]);

  useEffect(()=>{let mounted=true;(async()=>{
    setLoading(true);setError("");
    try{
      const [r,e]=await Promise.all([
        getHistoricalProfitReport(storeId,startDate,endDate),
        getEconomyExpenses(storeId,startDate,endDate)
      ]);
      if(!mounted)return;
      setReport(r);setExpenses(e.reduce((s,x)=>s+Number(x.amount||0),0));
    }catch(err){console.error(err);if(mounted)setError("No se pudo cargar la rentabilidad histórica.");}
    finally{if(mounted)setLoading(false);}
  })();return()=>{mounted=false};},[storeId,startDate,endDate]);

  if(loading)return <div className="mt-5 flex min-h-72 items-center justify-center rounded-3xl bg-white shadow-sm"><Loader2 className="animate-spin text-blue-700" size={30}/></div>;
  if(error)return <div className="mt-5 rounded-3xl border border-rose-200 bg-white p-8 text-center font-bold text-rose-600">{error}</div>;

  const s=report?.summary;
  const net=(s?.grossProfit||0)-expenses;
  const best=report?.products?.[0];
  const lowMargins=(report?.products||[]).filter(p=>p.sales>0&&p.margin<15).slice(0,5);

  return <div className="mt-5 space-y-5">
    <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
      <div><p className="text-xs font-black uppercase tracking-[.14em] text-blue-600">Rentabilidad histórica real</p>
        <h2 className="mt-1 text-xl font-black text-[#061b3a]">¿Cuánto dejó realmente el negocio?</h2>
        <p className="mt-1 text-sm font-semibold text-slate-400">Usa el costo que correspondía cuando ocurrió cada venta. El markup de Perla no entra como ingreso del comercio.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="text-xs font-bold text-slate-500">Desde<input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="mt-1 block rounded-xl border px-3 py-2 text-sm"/></label>
        <label className="text-xs font-bold text-slate-500">Hasta<input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="mt-1 block rounded-xl border px-3 py-2 text-sm"/></label>
      </div>
    </section>

    {(s?.missingCostLines||0)>0&&<div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
      <AlertTriangle size={18} className="mr-2 inline"/><strong>{s?.missingCostLines} líneas vendidas no tienen costo histórico.</strong> Configura el costo de esos productos para mejorar el reporte.
    </div>}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {[
        ["Ventas base",money.format(s?.sales||0),`${s?.orders||0} pedidos`,TrendingUp,"bg-blue-50 text-blue-700"],
        ["Costo vendido",money.format(s?.cogs||0),`${s?.units||0} unidades`,ArrowDownRight,"bg-amber-50 text-amber-700"],
        ["Ganancia bruta",money.format(s?.grossProfit||0),`Margen ${pct(s?.margin||0)}`,ArrowUpRight,"bg-emerald-50 text-emerald-700"],
        ["Gastos",money.format(expenses),"Gastos registrados",ReceiptText,"bg-violet-50 text-violet-700"],
        ["Ganancia estimada neta",money.format(net),"Bruta menos gastos",TrendingUp,net>=0?"bg-emerald-50 text-emerald-700":"bg-rose-50 text-rose-700"],
      ].map(([label,value,detail,Icon,tone]:any)=><article key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <span className={`grid h-10 w-10 place-items-center rounded-2xl ${tone}`}><Icon size={19}/></span>
        <p className="mt-4 text-xs font-black uppercase text-slate-400">{label}</p><p className="mt-1 text-2xl font-black tabular-nums text-[#061b3a]">{value}</p><p className="mt-1 text-xs font-semibold text-slate-400">{detail}</p>
      </article>)}
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.55fr_.85fr]">
      <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b px-5 py-4"><h3 className="font-black text-[#061b3a]">Rentabilidad por producto</h3><p className="text-xs font-semibold text-slate-400">Ordenado por dinero ganado.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-400"><tr><th className="px-5 py-3">Producto</th><th>Unidades</th><th>Ventas</th><th>Costo</th><th>Ganancia</th><th>Margen</th></tr></thead>
          <tbody className="divide-y">{(report?.products||[]).map(p=><tr key={p.productId||p.name} className="hover:bg-slate-50/60">
            <td className="px-5 py-4"><strong className="text-slate-800">{p.name}</strong><p className="text-xs text-slate-400">{p.category}</p></td>
            <td>{p.units}</td><td>{money.format(p.sales)}</td><td>{money.format(p.cogs)}</td><td className={p.profit>=0?"font-black text-emerald-700":"font-black text-rose-700"}>{money.format(p.profit)}</td><td><span className={`rounded-full px-2.5 py-1 text-xs font-black ${p.margin<15?"bg-amber-100 text-amber-700":"bg-emerald-100 text-emerald-700"}`}>{pct(p.margin)}</span></td>
          </tr>)}</tbody>
        </table></div>
        {!report?.products.length&&<div className="p-10 text-center text-sm font-semibold text-slate-400"><PackageSearch className="mx-auto mb-2" size={32}/>No hay ventas en este período.</div>}
      </article>

      <div className="space-y-5">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-black text-[#061b3a]">Lectura rápida</h3>
          {best?<div className="mt-4 rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-black uppercase text-emerald-600">Mayor aporte de ganancia</p><p className="mt-1 font-black text-emerald-900">{best.name}</p><p className="mt-1 text-sm text-emerald-700">{money.format(best.profit)} · margen {pct(best.margin)}</p></div>:null}
          {lowMargins.length>0?<div className="mt-3 rounded-2xl bg-amber-50 p-4"><p className="text-xs font-black uppercase text-amber-600">Revisar margen</p>{lowMargins.map(p=><p key={p.productId||p.name} className="mt-2 text-sm font-bold text-amber-900">{p.name} <span className="font-medium text-amber-700">· {pct(p.margin)}</span></p>)}</div>:null}
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2"><CalendarDays size={18} className="text-blue-700"/><h3 className="font-black text-[#061b3a]">Últimos días con ventas</h3></div>
          <div className="mt-3 space-y-2">{(report?.days||[]).slice(-7).reverse().map(d=><div key={d.date} className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><div><p className="text-sm font-black">{d.date}</p><p className="text-xs text-slate-400">{d.orders} pedidos</p></div><div className="text-right"><p className="text-sm font-black">{money.format(d.sales)}</p><p className="text-xs font-bold text-emerald-700">+{money.format(d.profit)}</p></div></div>)}</div>
        </article>
      </div>
    </section>
  </div>;
}
