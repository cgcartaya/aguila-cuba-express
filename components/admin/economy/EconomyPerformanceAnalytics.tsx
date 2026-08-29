"use client";
import {useEffect,useMemo,useState} from "react";
import {AlertTriangle,BarChart3,Loader2,ReceiptText,TrendingDown,TrendingUp} from "lucide-react";
import {getEconomyExpenses,getEconomyProducts} from "@/lib/services/economy";
import {getHistoricalProfitReport,type HistoricalReport} from "@/lib/services/economy-history";

type MonthRow={label:string;start:string;end:string;report:HistoricalReport;expenses:number};
function di(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function range(monthOffset:number){const n=new Date();const s=new Date(n.getFullYear(),n.getMonth()+monthOffset,1);const e=monthOffset===0?n:new Date(n.getFullYear(),n.getMonth()+monthOffset+1,0);return{start:di(s),end:di(e),label:s.toLocaleDateString("es",{month:"long",year:"numeric"})};}
function delta(a:number,b:number){if(b===0)return a>0?100:0;return(a-b)/b*100;}

export default function EconomyPerformanceAnalytics({storeId,currency="USD"}:{storeId:string;currency?:string}){
  const [rows,setRows]=useState<MonthRow[]>([]);const [coverage,setCoverage]=useState({configured:0,total:0});const [loading,setLoading]=useState(true);
  const money=useMemo(()=>new Intl.NumberFormat(currency==="CUP"?"es-CU":"en-US",{style:"currency",currency,maximumFractionDigits:currency==="CUP"?0:2}),[currency]);
  useEffect(()=>{let ok=true;(async()=>{try{
    const ranges=[0,-1,-2,-3,-4,-5].map(range);
    const [products,...months]=await Promise.all([
      getEconomyProducts(storeId),
      ...ranges.map(async r=>{const [report,expenses]=await Promise.all([getHistoricalProfitReport(storeId,r.start,r.end),getEconomyExpenses(storeId,r.start,r.end)]);return{...r,report,expenses:expenses.reduce((s,x)=>s+Number(x.amount||0),0)}})
    ]);
    if(!ok)return;setCoverage({configured:products.filter(p=>Number(p.financial?.current_unit_cost||0)+Number(p.financial?.extra_unit_cost||0)>0).length,total:products.length});setRows(months as MonthRow[]);
  }catch(e){console.error("Error analítica economía:",e)}finally{if(ok)setLoading(false)}})();return()=>{ok=false}},[storeId]);

  if(loading)return <div className="mt-5 flex h-40 items-center justify-center rounded-3xl bg-white"><Loader2 className="animate-spin text-blue-700"/></div>;
  if(!rows.length)return null;
  const current=rows[0],previous=rows[1];const cov=coverage.total?coverage.configured/coverage.total*100:0;
  const salesDelta=delta(current.report.summary.sales,previous?.report.summary.sales||0);
  const profitNow=current.report.summary.grossProfit-current.expenses,profitPrev=(previous?.report.summary.grossProfit||0)-(previous?.expenses||0);
  const profitDelta=delta(profitNow,profitPrev);
  const max=Math.max(...rows.map(r=>r.report.summary.sales),1);

  return <section className="mt-5 space-y-5">
    <div className={`rounded-3xl border p-5 ${cov<80?"border-amber-200 bg-amber-50":"border-emerald-200 bg-emerald-50"}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div className="flex gap-3"><AlertTriangle className={cov<80?"text-amber-600":"text-emerald-600"} size={22}/><div><h3 className="font-black text-slate-900">Cobertura de costos: {cov.toFixed(1)}%</h3><p className="text-sm font-semibold text-slate-600">{coverage.configured} de {coverage.total} productos tienen costo configurado. {cov<80?"La ganancia mostrada todavía debe considerarse estimada.":"La confiabilidad del cálculo es alta."}</p></div></div><div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-slate-900" style={{width:`${Math.min(100,cov)}%`}}/></div></div>
    </div>

    <div className="grid gap-4 md:grid-cols-3">
      <Compare title="Ventas este mes" value={money.format(current.report.summary.sales)} delta={salesDelta}/>
      <Compare title="Ganancia estimada" value={money.format(profitNow)} delta={profitDelta}/>
      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><ReceiptText className="text-violet-600" size={20}/><p className="mt-3 text-xs font-black uppercase text-slate-400">Ticket promedio</p><p className="mt-1 text-2xl font-black text-[#061b3a]">{money.format(current.report.summary.orders?current.report.summary.sales/current.report.summary.orders:0)}</p><p className="mt-1 text-xs font-semibold text-slate-400">{current.report.summary.orders} órdenes este mes</p></article>
    </div>

    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2"><BarChart3 className="text-blue-700" size={20}/><div><h3 className="font-black text-[#061b3a]">Evolución de los últimos 6 meses</h3><p className="text-xs font-semibold text-slate-400">Ventas base del comercio; el markup de Perla no se suma como ingreso del dueño.</p></div></div>
      <div className="mt-6 grid h-56 grid-cols-6 items-end gap-3">{[...rows].reverse().map(r=><div key={r.start} className="flex h-full flex-col justify-end"><p className="mb-2 text-center text-[10px] font-black text-slate-500">{money.format(r.report.summary.sales)}</p><div className="mx-auto w-full max-w-16 rounded-t-xl bg-blue-600" style={{height:`${Math.max(4,r.report.summary.sales/max*150)}px`}}/><p className="mt-2 truncate text-center text-[10px] font-black capitalize text-slate-500">{r.label.split(" ")[0]}</p></div>)}</div>
    </article>

    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b p-5"><h3 className="font-black text-[#061b3a]">Comparativa mensual</h3></div><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-400"><tr><th className="px-5 py-3">Mes</th><th>Órdenes</th><th>Ventas</th><th>Costos</th><th>Gastos</th><th>Ganancia est.</th><th>Margen</th></tr></thead><tbody className="divide-y">{rows.map(r=>{const net=r.report.summary.grossProfit-r.expenses;return <tr key={r.start}><td className="px-5 py-4 font-black capitalize">{r.label}</td><td>{r.report.summary.orders}</td><td>{money.format(r.report.summary.sales)}</td><td>{money.format(r.report.summary.cogs)}</td><td>{money.format(r.expenses)}</td><td className="font-black text-emerald-700">{money.format(net)}</td><td>{r.report.summary.margin.toFixed(1)}%</td></tr>})}</tbody></table></div></article>
  </section>
}
function Compare({title,value,delta}:{title:string;value:string;delta:number}){const up=delta>=0;return <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase text-slate-400">{title}</p><p className="mt-1 text-2xl font-black text-[#061b3a]">{value}</p><p className={`mt-2 flex items-center gap-1 text-xs font-black ${up?"text-emerald-600":"text-rose-600"}`}>{up?<TrendingUp size={14}/>:<TrendingDown size={14}/>} {delta>0?"+":""}{delta.toFixed(1)}% vs mes anterior</p></article>}
