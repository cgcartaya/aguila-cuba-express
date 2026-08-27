"use client";

import { supabase } from "@/lib/supabase";

export type HistoricalSummary = {
  sales: number;
  cogs: number;
  grossProfit: number;
  margin: number;
  orders: number;
  units: number;
  missingCostLines: number;
};

export type HistoricalProduct = {
  productId: string | null;
  name: string;
  category: string;
  sales: number;
  cogs: number;
  profit: number;
  margin: number;
  units: number;
};

export type HistoricalDay = {
  date: string;
  sales: number;
  cogs: number;
  profit: number;
  orders: number;
};

export type HistoricalReport = {
  summary: HistoricalSummary;
  products: HistoricalProduct[];
  days: HistoricalDay[];
};

export type CostHistoryRow = {
  id: string;
  effective_from: string;
  unit_cost: number;
  extra_unit_cost: number;
  total_unit_cost: number;
  source: string;
  notes: string | null;
};

const num=(v:any)=>Number(v||0);

export async function getHistoricalProfitReport(
  storeId:string,startDate:string,endDate:string
):Promise<HistoricalReport>{
  const from=`${startDate}T00:00:00.000Z`;
  const to=`${endDate}T23:59:59.999Z`;
  const {data,error}=await supabase.rpc("get_economy_historical_report",{
    p_store_id:storeId,p_from:from,p_to:to
  });
  if(error) throw error;
  const raw:any=data||{};
  const s=raw.summary||{};
  return {
    summary:{
      sales:num(s.sales),cogs:num(s.cogs),grossProfit:num(s.grossProfit),
      margin:num(s.margin),orders:num(s.orders),units:num(s.units),
      missingCostLines:num(s.missingCostLines)
    },
    products:(raw.products||[]).map((p:any)=>({
      productId:p.productId||null,name:String(p.name||"Producto"),
      category:String(p.category||"Sin categoría"),sales:num(p.sales),cogs:num(p.cogs),
      profit:num(p.profit),margin:num(p.margin),units:num(p.units)
    })),
    days:(raw.days||[]).map((d:any)=>({
      date:String(d.date),sales:num(d.sales),cogs:num(d.cogs),
      profit:num(d.profit),orders:num(d.orders)
    }))
  };
}

export async function getManualCostHistory(storeId:string,productId:string):Promise<CostHistoryRow[]>{
  const {data,error}=await supabase.from("product_cost_history")
    .select("id,effective_from,unit_cost,extra_unit_cost,total_unit_cost,source,notes")
    .eq("store_id",storeId).eq("product_id",productId)
    .order("effective_from",{ascending:false});
  if(error) throw error;
  return (data||[]).map((r:any)=>({...r,unit_cost:num(r.unit_cost),
    extra_unit_cost:num(r.extra_unit_cost),total_unit_cost:num(r.total_unit_cost)}));
}
