"use client";
import {useEffect,useState} from "react";
import {CalendarDays,CalendarRange,Loader2,ShoppingBag,TrendingDown,TrendingUp} from "lucide-react";
import {getOrderPeriodSummary,type OrderPeriodSummary,type OrderPeriodStat} from "@/lib/services/business-analytics";

function change(current:number,previous:number){if(previous<=0)return current>0?100:0;return ((current-previous)/previous)*100;}
function Card({title,data,compare}:{title:string;data:OrderPeriodStat;compare?:OrderPeriodStat}){
  const delta=compare?change(data.orders,compare.orders):null;const up=(delta||0)>=0;
  return <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between"><div><p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{title}</p><p className="mt-1 text-3xl font-black tabular-nums text-[#061b3a]">{data.orders}</p><p className="text-xs font-bold text-slate-400">órdenes</p></div><span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-700"><ShoppingBag size={18}/></span></div>
    <p className="mt-3 text-sm font-black text-slate-700">${data.sales.toFixed(2)} <span className="font-semibold text-slate-400">facturado</span></p>
    {delta!==null&&<p className={`mt-2 flex items-center gap-1 text-xs font-black ${up?"text-emerald-600":"text-rose-600"}`}>{up?<TrendingUp size={14}/>:<TrendingDown size={14}/>} {delta>0?"+":""}{delta.toFixed(1)}% vs período anterior</p>}
  </article>
}
export default function OrderPeriodStats({storeId}:{storeId:string}){
  const [data,setData]=useState<OrderPeriodSummary|null>(null);const [loading,setLoading]=useState(true);
  useEffect(()=>{let ok=true;(async()=>{try{const x=await getOrderPeriodSummary(storeId);if(ok)setData(x)}catch(e){console.error(e)}finally{if(ok)setLoading(false)}})();return()=>{ok=false}},[storeId]);
  if(loading)return <div className="mb-5 flex h-24 items-center justify-center rounded-3xl bg-white"><Loader2 className="animate-spin text-blue-700"/></div>;
  if(!data)return null;
  return <section className="mb-6">
    <div className="mb-3 flex items-center gap-2"><CalendarRange size={18} className="text-blue-700"/><div><h2 className="font-black text-[#061b3a]">Ritmo de ventas</h2><p className="text-xs font-semibold text-slate-400">Totales reales de la tienda, independientes de las 30 órdenes cargadas en la lista.</p></div></div>
    <div className="grid gap-3 sm:grid-cols-3">
      <Card title="Hoy" data={data.today}/>
      <Card title="Esta semana" data={data.week} compare={data.previousWeek}/>
      <Card title="Este mes" data={data.month} compare={data.previousMonth}/>
    </div>
  </section>
}
