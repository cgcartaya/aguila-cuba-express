"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowRight, Box, CheckCircle2, CircleDollarSign,
  Clock3, ExternalLink, Loader2, Package, Plus, ShoppingCart,
  Store, Users, Wallet,
} from "lucide-react";

import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import StoreSwitcher from "@/components/admin/StoreSwitcher";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import { supabase } from "@/lib/supabase";
import { getPendingPlatformFee, type PendingPlatformFee } from "@/lib/services/platform-fee-settlements";

type RecentOrder = {
  id: string;
  order_number: string | number | null;
  total: number | null;
  status: string | null;
  created_at: string;
  recipient_name: string | null;
};
type SalesDay = { key: string; label: string; total: number };
type DashboardData = {
  products: number;
  activeProducts: number;
  lowStock: number;
  orders: number;
  pendingOrders: number;
  customers: number;
  deliveredThisWeek: number;
  recentOrders: RecentOrder[];
  salesDays: SalesDay[];
};

const initialData: DashboardData = { products: 0, activeProducts: 0, lowStock: 0, orders: 0, pendingOrders: 0, customers: 0, deliveredThisWeek: 0, recentOrders: [], salesDays: [] };
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function statusLabel(status?: string | null) {
  const labels: Record<string, string> = { pending: "Pendiente", confirmed: "Confirmada", preparing: "Preparando", ready_for_delivery: "Lista", in_transit: "En tránsito", delivered: "Entregada", cancelled: "Cancelada" };
  return labels[status || ""] || "Pendiente";
}
function statusClass(status?: string | null) {
  if (status === "delivered") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "cancelled") return "bg-rose-50 text-rose-700 ring-rose-200";
  if (["confirmed", "in_transit", "preparing", "ready_for_delivery"].includes(status || "")) return "bg-blue-50 text-blue-700 ring-blue-200";
  return "bg-amber-50 text-amber-700 ring-amber-200";
}

function MetricCard({ title, value, detail, icon: Icon, tone, href }: { title: string; value: string; detail: string; icon: typeof ShoppingCart; tone: string; href: string }) {
  return <Link href={href} className="group rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"><div className="flex items-center gap-4"><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tone}`}><Icon size={22} /></span><div className="min-w-0"><p className="text-sm font-bold text-slate-500">{title}</p><p className="mt-0.5 text-2xl font-black text-[#061b3a]">{value}</p><p className="mt-1 truncate text-xs font-semibold text-slate-400">{detail}</p></div></div></Link>;
}

export default function AdminDashboardPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();
  const activeStore = useMemo(() => isSuperAdmin ? selectedStore || accessStore : accessStore, [accessStore, isSuperAdmin, selectedStore]);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingFee, setPendingFee] = useState<PendingPlatformFee | null>(null);
  const platformFeeEnabled = Boolean((activeStore as { platform_fee_enabled?: boolean } | null)?.platform_fee_enabled);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (accessLoading || storeLoading) return;
      if (!activeStore?.id) { setData(initialData); setLoading(false); setError(isSuperAdmin ? "" : "No se pudo resolver la tienda activa."); return; }
      setLoading(true); setError("");
      const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 6);
      const [productsResult, ordersCountResult, pendingResult, customersResult, recentResult, weeklyResult] = await Promise.all([
        supabase.from("products").select("id,is_active,stock").eq("store_id", activeStore.id).is("deleted_at", null),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("store_id", activeStore.id).is("deleted_at", null),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("store_id", activeStore.id).eq("status", "pending").is("deleted_at", null),
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("store_id", activeStore.id),
        supabase.from("orders").select("id,order_number,total,status,created_at,recipient_name").eq("store_id", activeStore.id).is("deleted_at", null).order("created_at", { ascending: false }).limit(5),
        supabase.from("orders").select("total,status,created_at").eq("store_id", activeStore.id).is("deleted_at", null).gte("created_at", start.toISOString()),
      ]);
      if (!mounted) return;
      const firstError = productsResult.error || ordersCountResult.error || pendingResult.error || customersResult.error || recentResult.error || weeklyResult.error;
      if (firstError) { console.error("Error cargando dashboard:", firstError); setError("No se pudo cargar el dashboard de la tienda."); setLoading(false); return; }
      const products = productsResult.data || [];
      const weekly = weeklyResult.data || [];
      const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); const key = date.toISOString().slice(0, 10); return { key, label: new Intl.DateTimeFormat("es-US", { weekday: "short" }).format(date).replace(".", ""), total: Number(weekly.filter((order) => order.created_at.slice(0, 10) === key).reduce((sum, order) => sum + Number(order.total || 0), 0).toFixed(2)) }; });
      setData({ products: products.length, activeProducts: products.filter((p) => p.is_active).length, lowStock: products.filter((p) => Number(p.stock || 0) <= 5).length, orders: ordersCountResult.count || 0, pendingOrders: pendingResult.count || 0, customers: customersResult.count || 0, deliveredThisWeek: weekly.filter((o) => o.status === "delivered").length, recentOrders: (recentResult.data || []) as RecentOrder[], salesDays: days });
      setLoading(false);
    }
    void load(); return () => { mounted = false; };
  }, [accessLoading, storeLoading, activeStore?.id, isSuperAdmin]);

  useEffect(() => {
    let mounted = true;
    async function loadFee() {
      if (!activeStore?.id || !platformFeeEnabled) {
        await Promise.resolve();
        if (mounted) setPendingFee(null);
        return;
      }
      const result = await getPendingPlatformFee(activeStore.id);
      if (mounted) setPendingFee(result);
    }
    void loadFee();
    return () => { mounted = false; };
  }, [activeStore?.id, platformFeeEnabled]);

  if (accessLoading || storeLoading || loading) return <main className="min-h-screen bg-[#f4f7fb] p-6"><div className="mx-auto flex min-h-64 max-w-7xl items-center justify-center rounded-3xl bg-white"><Loader2 className="animate-spin text-blue-700" size={32} /></div></main>;
  if (error) return <main className="min-h-screen bg-[#f4f7fb] p-6"><div className="mx-auto max-w-7xl rounded-3xl bg-white p-10 text-center font-bold text-rose-600">{error}</div></main>;
  if (isSuperAdmin && !activeStore) return <main className="min-h-screen bg-[#f4f7fb] p-6"><section className="mx-auto max-w-3xl rounded-3xl bg-white p-8 text-center shadow-sm"><Store className="mx-auto text-blue-700" size={38} /><h1 className="mt-3 text-2xl font-black text-[#061b3a]">Selecciona una tienda</h1><p className="mt-2 text-slate-500">Elige la tienda cuyo dashboard quieres consultar.</p><div className="mx-auto mt-6 max-w-md text-left"><StoreSwitcher /></div></section></main>;

  const storeHref = activeStore?.slug && activeStore.slug !== "aguila" ? `/tienda/${activeStore.slug}` : "/tienda";
  const weeklySales = data.salesDays.reduce((sum, day) => sum + day.total, 0);
  const maxSale = Math.max(...data.salesDays.map((day) => day.total), 1);

  return <main className="min-h-screen bg-[#f4f7fb] p-4 pb-24 md:p-7"><div className="mx-auto max-w-[1500px]">
    <AdminPageHeader
      eyebrow="Panel operativo"
      icon={Store}
      title={`Buenos días — ${activeStore?.name || ""}`}
      description="Productos, órdenes, clientes e inventario en una sola vista rápida."
      actions={<>
        <span className="inline-flex items-center gap-2 self-center text-xs font-bold text-slate-400"><span className="h-2 w-2 rounded-full bg-emerald-500" />Actualizado ahora</span>
        <Link href={storeHref} className="inline-flex items-center gap-2 rounded-xl bg-[#061b3a] px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">Ver tienda <ExternalLink size={16} /></Link>
      </>}
    />

    {pendingFee && pendingFee.feeAmount > 0 && <Link href="/admin/comision" className="mt-5 flex flex-col gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-600 text-white"><Wallet size={20} /></span><div><p className="font-black text-emerald-900">Comisión de plataforma pendiente</p><p className="text-xs font-semibold text-emerald-700">{pendingFee.ordersCount} órdenes · {money.format(pendingFee.salesAmount)} en ventas</p></div></div><p className="text-xl font-black text-emerald-800">{money.format(pendingFee.feeAmount)}</p></Link>}

    <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard title="Órdenes" value={String(data.orders)} detail={`${data.pendingOrders} pendientes de procesar`} icon={ShoppingCart} tone="bg-blue-50 text-blue-700" href="/admin/orders" /><MetricCard title="Ventas últimos 7 días" value={money.format(weeklySales)} detail={`${data.deliveredThisWeek} órdenes entregadas`} icon={CircleDollarSign} tone="bg-emerald-50 text-emerald-700" href="/admin/orders" /><MetricCard title="Productos activos" value={String(data.activeProducts)} detail={`${data.lowStock} con inventario bajo`} icon={Package} tone="bg-violet-50 text-violet-700" href="/admin/products" /><MetricCard title="Clientes" value={String(data.customers)} detail="Clientes registrados" icon={Users} tone="bg-amber-50 text-amber-700" href="/admin/customers" /></section>

    {(data.pendingOrders > 0 || data.lowStock > 0) && <section className="mt-5 grid gap-4 md:grid-cols-2">{data.pendingOrders > 0 && <Link href="/admin/orders" className="flex items-center justify-between rounded-3xl border border-amber-200 bg-amber-50 p-5"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-100 text-amber-700"><Clock3 size={21} /></span><div><p className="font-black text-amber-950">Órdenes sin procesar</p><p className="text-sm font-semibold text-amber-700">{data.pendingOrders} requieren revisión</p></div></div><ArrowRight className="text-amber-700" size={19} /></Link>}{data.lowStock > 0 && <Link href="/admin/products/low-stock" className="flex items-center justify-between rounded-3xl border border-rose-200 bg-rose-50 p-5"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-100 text-rose-700"><AlertTriangle size={21} /></span><div><p className="font-black text-rose-950">Inventario bajo</p><p className="text-sm font-semibold text-rose-700">{data.lowStock} productos con 5 unidades o menos</p></div></div><ArrowRight className="text-rose-700" size={19} /></Link>}</section>}

    <section className="mt-5 grid gap-5 xl:grid-cols-[1.7fr_1fr]"><article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm md:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-black text-[#061b3a]">Resumen de ventas</h2><p className="mt-1 text-xs font-semibold text-slate-400">Facturación diaria de los últimos 7 días</p></div><div className="shrink-0 text-right"><p className="text-xl font-black text-[#061b3a]">{money.format(weeklySales)}</p><p className="text-[10px] font-black uppercase text-slate-400">Total semanal</p></div></div><div className="mt-6 overflow-x-auto pb-1"><div className="relative grid h-56 min-w-[540px] grid-cols-7 gap-3 border-b border-slate-200 px-1" role="img" aria-label="Gráfico de barras con las ventas de los últimos siete días"><div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/4 border-t border-dashed border-slate-200" /><div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200" /><div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-3/4 border-t border-dashed border-slate-200" />{data.salesDays.map((day) => { const barHeight = day.total > 0 ? Math.max((day.total / maxSale) * 100, 8) : 3; return <div key={day.key} className="relative z-10 flex min-w-0 flex-col items-center justify-end" aria-label={`${day.label}: ${money.format(day.total)}`}><span className="mb-2 whitespace-nowrap text-[11px] font-black tabular-nums text-[#061b3a]">{money.format(day.total)}</span><div className="group relative w-full max-w-14 rounded-t-xl bg-gradient-to-t from-[#0b57c9] to-[#2f86ff] shadow-[0_8px_20px_rgba(23,105,232,0.18)] transition hover:brightness-110" style={{ height: `${barHeight}%` }} title={`${day.label}: ${money.format(day.total)}`} /></div>; })}</div><div className="grid min-w-[540px] grid-cols-7 gap-3 px-1 pt-3 text-center text-[10px] font-black uppercase text-slate-500">{data.salesDays.map((day) => <span key={day.key}>{day.label}</span>)}</div></div></article>
      <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm md:p-6"><h2 className="text-lg font-black text-[#061b3a]">Estado del negocio</h2><p className="mt-1 text-xs font-semibold text-slate-400">Indicadores que requieren seguimiento</p><div className="mt-6 space-y-5"><HealthRow icon={Clock3} label="Pendientes de procesar" value={data.pendingOrders} href="/admin/orders" tone="amber" /><HealthRow icon={AlertTriangle} label="Inventario bajo" value={data.lowStock} href="/admin/products/low-stock" tone="rose" /><HealthRow icon={CheckCircle2} label="Entregadas esta semana" value={data.deliveredThisWeek} href="/admin/orders" tone="emerald" /><HealthRow icon={Box} label="Productos totales" value={data.products} href="/admin/products" tone="blue" /></div></article></section>

    <section className="mt-5 grid gap-5 xl:grid-cols-[1.7fr_1fr]"><article className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 md:px-6"><div><h2 className="text-lg font-black text-[#061b3a]">Órdenes recientes</h2><p className="text-xs font-semibold text-slate-400">Últimos pedidos recibidos</p></div><Link href="/admin/orders" className="text-xs font-black text-blue-700">Ver todas</Link></div>{data.recentOrders.length === 0 ? <p className="p-8 text-sm font-semibold text-slate-500">Todavía no hay órdenes.</p> : <div className="divide-y divide-slate-100">{data.recentOrders.map((order) => <Link href="/admin/orders" key={order.id} className="grid grid-cols-[1.2fr_.8fr_110px] items-center gap-4 px-5 py-4 transition hover:bg-blue-50/40 md:px-6"><div className="min-w-0"><p className="truncate text-sm font-black text-slate-800">Orden #{order.order_number || order.id.slice(0, 8)}</p><p className="truncate text-xs font-semibold text-slate-400">{order.recipient_name || "Cliente"} · {new Date(order.created_at).toLocaleDateString("es-US")}</p></div><span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ${statusClass(order.status)}`}>{statusLabel(order.status)}</span><p className="text-right text-sm font-black text-[#061b3a]">{money.format(Number(order.total || 0))}</p></Link>)}</div>}</article>
      <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm md:p-6"><h2 className="text-lg font-black text-[#061b3a]">Acciones rápidas</h2><div className="mt-4 space-y-2"><QuickLink href="/admin/products/new" label="Agregar producto" icon={Plus} /><QuickLink href="/admin/products" label="Gestionar productos" icon={Package} /><QuickLink href="/admin/orders" label="Ver órdenes" icon={ShoppingCart} /><QuickLink href={storeHref} label="Abrir tienda" icon={ExternalLink} /></div></article></section>
  </div></main>;
}

function HealthRow({ icon: Icon, label, value, href, tone }: { icon: typeof Clock3; label: string; value: number; href: string; tone: "amber" | "rose" | "emerald" | "blue" }) {
  const tones = { amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700", emerald: "bg-emerald-50 text-emerald-700", blue: "bg-blue-50 text-blue-700" };
  return <Link href={href} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 transition hover:bg-slate-50"><span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}><Icon size={18} /></span><span className="flex-1 text-sm font-bold text-slate-600">{label}</span><span className="text-xl font-black text-[#061b3a]">{value}</span></Link>;
}
function QuickLink({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Plus }) {
  return <Link href={href} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-black text-[#061b3a] transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"><span className="flex items-center gap-3"><Icon size={18} className="text-blue-600" />{label}</span><ArrowRight size={17} /></Link>;
}
