"use client";
import {supabase} from "@/lib/supabase";

export type OrderPeriodStat={orders:number;sales:number};
export type OrderPeriodSummary={
  today:OrderPeriodStat;week:OrderPeriodStat;previousWeek:OrderPeriodStat;
  month:OrderPeriodStat;previousMonth:OrderPeriodStat;
};

function iso(d:Date){return d.toISOString();}
function startDay(d:Date){const x=new Date(d);x.setHours(0,0,0,0);return x;}
function startWeek(d:Date){const x=startDay(d);const day=x.getDay();x.setDate(x.getDate()-(day===0?6:day-1));return x;}
function startMonth(d:Date){return new Date(d.getFullYear(),d.getMonth(),1);}
function addDays(d:Date,n:number){const x=new Date(d);x.setDate(x.getDate()+n);return x;}

async function period(storeId:string,from:Date,to:Date):Promise<OrderPeriodStat>{
  const {data,error}=await supabase.from("orders").select("id,total")
    .eq("store_id",storeId).is("deleted_at",null).neq("status","cancelled")
    .gte("created_at",iso(from)).lt("created_at",iso(to));
  if(error)throw error;
  return {orders:(data||[]).length,sales:(data||[]).reduce((s:any,x:any)=>s+Number(x.total||0),0)};
}

export async function getOrderPeriodSummary(storeId:string):Promise<OrderPeriodSummary>{
  const now=new Date(),tomorrow=addDays(startDay(now),1);
  const week=startWeek(now),previousWeek=addDays(week,-7);
  const month=startMonth(now),previousMonth=new Date(now.getFullYear(),now.getMonth()-1,1);
  return {
    today:await period(storeId,startDay(now),tomorrow),
    week:await period(storeId,week,tomorrow),
    previousWeek:await period(storeId,previousWeek,week),
    month:await period(storeId,month,tomorrow),
    previousMonth:await period(storeId,previousMonth,month),
  };
}
