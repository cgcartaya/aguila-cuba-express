"use client";

import { supabase } from "@/lib/supabase";

export type OrderPeriodStat = { orders: number; sales: number };
export type OrderPeriodSummary = {
  today: OrderPeriodStat;
  week: OrderPeriodStat;
  previousWeek: OrderPeriodStat;
  month: OrderPeriodStat;
  previousMonth: OrderPeriodStat;
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeek(date: Date) {
  const d = startOfDay(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d;
}

async function getPeriod(storeId: string, from: Date, to: Date): Promise<OrderPeriodStat> {
  const { data, error } = await supabase
    .from("orders")
    .select("id,total")
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .neq("status", "cancelled")
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString());

  if (error) throw error;

  return {
    orders: (data || []).length,
    sales: (data || []).reduce((sum, row: any) => sum + Number(row.total || 0), 0),
  };
}

export async function getOrderPeriodSummary(storeId: string): Promise<OrderPeriodSummary> {
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const week = startOfWeek(now);
  const previousWeek = addDays(week, -7);
  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [todayData, weekData, previousWeekData, monthData, previousMonthData] = await Promise.all([
    getPeriod(storeId, today, tomorrow),
    getPeriod(storeId, week, tomorrow),
    getPeriod(storeId, previousWeek, week),
    getPeriod(storeId, month, tomorrow),
    getPeriod(storeId, previousMonth, month),
  ]);

  return {
    today: todayData,
    week: weekData,
    previousWeek: previousWeekData,
    month: monthData,
    previousMonth: previousMonthData,
  };
}
