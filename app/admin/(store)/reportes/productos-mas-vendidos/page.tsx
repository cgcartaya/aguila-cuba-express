"use client";
/* eslint-disable @next/next/no-img-element -- Las imágenes proceden del catálogo y pueden usar hosts configurados por cada tienda. */

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Box,
  CalendarDays,
  Download,
  Loader2,
  Medal,
  PackageOpen,
  ShoppingBag,
  Trophy,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { supabase } from "@/lib/supabase";
import { downloadCsv } from "@/lib/utils/csv";

type SortMode = "quantity" | "revenue";
type Period = "30" | "90" | "all";
type TopProduct = {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
  imageUrl: string | null;
};

const colors = ["#1769e8", "#4f8df4", "#7aa8f6", "#f3a712", "#22a06b", "#8b5cf6", "#94a3b8"];
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const number = new Intl.NumberFormat("es-US", { maximumFractionDigits: 2 });

function KpiCard({ icon: Icon, label, value, detail, tone }: {
  icon: typeof WalletCards;
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "green" | "amber" | "violet";
}) {
  const styles = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
  };
  return (
    <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/60">
      <div className="flex items-center gap-4">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ring-1 ${styles[tone]}`}><Icon size={23} /></span>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.13em] text-slate-500">{label}</p>
          <p className="mt-1 truncate text-2xl font-black text-[#061b3a]">{value}</p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-400">{detail}</p>
        </div>
      </div>
    </article>
  );
}

export default function TopSellingProductsPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();
  const activeStore = useMemo(() => isSuperAdmin ? selectedStore || accessStore : accessStore, [accessStore, isSuperAdmin, selectedStore]);
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("quantity");
  const [period, setPeriod] = useState<Period>("30");

  useEffect(() => {
    let mounted = true;
    async function loadTopProducts() {
      if (accessLoading || storeLoading) return;
      if (!activeStore?.id) {
        setProducts([]); setLoading(false); setErrorMessage("No se pudo resolver la tienda activa."); return;
      }
      setLoading(true); setErrorMessage(null);

      let itemsQuery = supabase
        .from("order_items")
        .select("product_id,product_name,quantity,subtotal,item_type,orders!inner(store_id,deleted_at,created_at)")
        .eq("item_type", "product")
        .eq("orders.store_id", activeStore.id)
        .is("orders.deleted_at", null);
      if (period !== "all") {
        const since = new Date();
        since.setDate(since.getDate() - Number(period));
        itemsQuery = itemsQuery.gte("orders.created_at", since.toISOString());
      }

      const [itemsResult, imagesResult] = await Promise.all([
        itemsQuery,
        supabase.from("products").select("id,image_url,product_images(image_url,is_main,position)").eq("store_id", activeStore.id),
      ]);
      if (!mounted) return;
      if (itemsResult.error) {
        console.error("Error cargando productos más vendidos:", itemsResult.error);
        setErrorMessage("No se pudo cargar el reporte."); setLoading(false); return;
      }

      const imageMap = new Map<string, string | null>();
      for (const product of imagesResult.data || []) {
        const gallery = [...(product.product_images || [])].sort((a, b) => Number(b.is_main) - Number(a.is_main) || Number(a.position || 0) - Number(b.position || 0));
        imageMap.set(product.id, gallery[0]?.image_url || product.image_url || null);
      }
      const grouped = new Map<string, TopProduct>();
      for (const row of itemsResult.data || []) {
        const key = row.product_id || row.product_name;
        if (!key) continue;
        const current = grouped.get(key) || { productId: key, name: row.product_name || "Producto eliminado", quantity: 0, revenue: 0, imageUrl: row.product_id ? imageMap.get(row.product_id) || null : null };
        current.quantity += Number(row.quantity || 0);
        current.revenue += Number(row.subtotal || 0);
        grouped.set(key, current);
      }
      setProducts(Array.from(grouped.values()).map((item) => ({ ...item, revenue: Number(item.revenue.toFixed(2)) })));
      setLoading(false);
    }
    void loadTopProducts();
    return () => { mounted = false; };
  }, [accessLoading, storeLoading, activeStore?.id, period]);

  const sortedProducts = useMemo(() => [...products].sort((a, b) => sortMode === "quantity" ? b.quantity - a.quantity : b.revenue - a.revenue), [products, sortMode]);
  const totalRevenue = products.reduce((sum, product) => sum + product.revenue, 0);
  const totalUnits = products.reduce((sum, product) => sum + product.quantity, 0);
  const leader = sortedProducts[0];
  const averageTicket = totalUnits ? totalRevenue / totalUnits : 0;
  const chartProducts = sortedProducts.slice(0, 8);
  const maxRevenue = Math.max(...chartProducts.map((item) => item.revenue), 1);
  const donutProducts = [...products].sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  const representedRevenue = donutProducts.reduce((sum, item) => sum + item.revenue, 0);
  const donutSegments = [...donutProducts.map((item, index) => ({ label: item.name, value: item.revenue, color: colors[index] })), ...(totalRevenue - representedRevenue > 0 ? [{ label: "Otros productos", value: totalRevenue - representedRevenue, color: colors[6] }] : [])];
  let accumulated = 0;
  const donutGradient = donutSegments.length && totalRevenue ? `conic-gradient(${donutSegments.map((segment) => { const start = accumulated; accumulated += segment.value / totalRevenue * 100; return `${segment.color} ${start}% ${accumulated}%`; }).join(",")})` : "#e2e8f0";

  function handleExportCsv() {
    downloadCsv(`productos-mas-vendidos-${new Date().toISOString().slice(0, 10)}`, ["Posición", "Producto", "Unidades vendidas", "Ventas generadas", "Participación"], sortedProducts.map((product, index) => [index + 1, product.name, product.quantity, product.revenue.toFixed(2), totalRevenue ? `${(product.revenue / totalRevenue * 100).toFixed(1)}%` : "0%"]));
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] p-4 pb-24 md:p-7">
      <div className="mx-auto max-w-[1500px]">
        <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#061b3a] via-[#083d82] to-[#1769e8] px-6 py-7 text-white shadow-xl shadow-blue-950/15 md:px-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-blue-100"><BarChart3 size={15} />Reporte comercial</div><h1 className="text-3xl font-black tracking-tight md:text-4xl">Productos más vendidos</h1><p className="mt-2 max-w-2xl text-sm font-semibold text-blue-100">Rendimiento de {activeStore?.name || "la tienda activa"}. Solo incluye productos de órdenes activas.</p></div>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold backdrop-blur"><CalendarDays size={18} /><select value={period} onChange={(event) => setPeriod(event.target.value as Period)} className="bg-transparent outline-none [&>option]:text-slate-900"><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option><option value="all">Todo el historial</option></select></label>
              <button type="button" onClick={handleExportCsv} disabled={!products.length} className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#083d82] shadow-lg transition hover:-translate-y-0.5 disabled:opacity-50"><Download size={18} />Exportar CSV</button>
            </div>
          </div>
        </section>

        {loading || accessLoading || storeLoading ? <div className="mt-6 flex min-h-72 items-center justify-center rounded-3xl bg-white"><Loader2 className="animate-spin text-blue-700" size={34} /></div> : errorMessage ? <div className="mt-6 rounded-3xl bg-white p-10 text-center font-bold text-rose-600">{errorMessage}</div> : !products.length ? <div className="mt-6 rounded-3xl bg-white p-12 text-center shadow-sm"><PackageOpen className="mx-auto text-slate-300" size={48} /><h2 className="mt-3 text-xl font-black text-slate-800">Todavía no hay ventas en este período</h2><p className="mt-1 text-sm font-semibold text-slate-500">Cambia el período o espera a que se registren nuevas órdenes.</p></div> : <>
          <section className="relative z-10 -mt-1 grid gap-4 pt-5 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard icon={WalletCards} label="Ventas totales" value={currency.format(totalRevenue)} detail={`${products.length} productos con ventas`} tone="blue" />
            <KpiCard icon={Box} label="Unidades vendidas" value={number.format(totalUnits)} detail="Unidades en órdenes activas" tone="green" />
            <KpiCard icon={Trophy} label="Producto líder" value={`${number.format(leader?.quantity || 0)} uds`} detail={leader?.name || "Sin producto"} tone="amber" />
            <KpiCard icon={ShoppingBag} label="Ingreso por unidad" value={currency.format(averageTicket)} detail="Promedio del catálogo vendido" tone="violet" />
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
            <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm md:p-6"><div className="mb-6 flex items-center justify-between"><div><h2 className="text-lg font-black text-[#061b3a]">Ventas por producto</h2><p className="text-xs font-semibold text-slate-400">Ingresos de los 8 productos principales</p></div><TrendingUp className="text-blue-600" /></div><div className="flex h-64 items-end gap-2 border-b border-slate-200 pl-2 md:gap-4">{chartProducts.map((product) => <div key={product.productId} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end"><span className="mb-2 text-[10px] font-black text-slate-500 opacity-0 transition group-hover:opacity-100">{currency.format(product.revenue)}</span><div className="w-full max-w-14 rounded-t-xl bg-gradient-to-t from-[#0950b5] to-[#2d83f7] shadow-sm transition group-hover:brightness-110" style={{ height: `${Math.max(8, product.revenue / maxRevenue * 78)}%` }} /><p title={product.name} className="mt-2 line-clamp-2 h-9 text-center text-[9px] font-bold leading-tight text-slate-500">{product.name}</p></div>)}</div></article>
            <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm md:p-6"><h2 className="text-lg font-black text-[#061b3a]">Participación de ventas</h2><p className="text-xs font-semibold text-slate-400">Distribución del ingreso total</p><div className="mt-5 flex flex-col items-center gap-6 sm:flex-row xl:flex-col 2xl:flex-row"><div className="relative h-44 w-44 shrink-0 rounded-full" style={{ background: donutGradient }}><div className="absolute inset-7 grid place-items-center rounded-full bg-white text-center"><div><p className="text-[10px] font-black uppercase text-slate-400">Total</p><p className="text-lg font-black text-[#061b3a]">{currency.format(totalRevenue)}</p></div></div></div><div className="w-full space-y-2.5">{donutSegments.map((segment) => <div key={segment.label} className="flex items-center gap-2 text-xs"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} /><span className="min-w-0 flex-1 truncate font-bold text-slate-600">{segment.label}</span><span className="font-black text-slate-500">{(segment.value / totalRevenue * 100).toFixed(1)}%</span></div>)}</div></div></article>
          </section>

          <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm"><div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between md:px-6"><div><h2 className="text-xl font-black text-[#061b3a]">Ranking de productos</h2><p className="text-xs font-semibold text-slate-400">Fotografías e indicadores del catálogo más vendido</p></div><div className="inline-flex w-fit rounded-2xl bg-slate-100 p-1"><button onClick={() => setSortMode("quantity")} className={`rounded-xl px-4 py-2 text-xs font-black transition ${sortMode === "quantity" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>Por unidades</button><button onClick={() => setSortMode("revenue")} className={`rounded-xl px-4 py-2 text-xs font-black transition ${sortMode === "revenue" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>Por ventas ($)</button></div></div>
            <div className="overflow-x-auto"><div className="min-w-[850px]"><div className="grid grid-cols-[64px_1.5fr_150px_150px_1fr] gap-4 bg-slate-50 px-6 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400"><span>#</span><span>Producto</span><span>Unidades</span><span>Ventas</span><span>Participación</span></div>{sortedProducts.map((product, index) => { const share = totalRevenue ? product.revenue / totalRevenue * 100 : 0; return <div key={product.productId} className="grid grid-cols-[64px_1.5fr_150px_150px_1fr] items-center gap-4 border-t border-slate-100 px-6 py-3.5 transition hover:bg-blue-50/40"><div>{index < 3 ? <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-black ${index === 0 ? "bg-amber-100 text-amber-700" : index === 1 ? "bg-slate-200 text-slate-600" : "bg-orange-100 text-orange-700"}`}><Medal size={16} /></span> : <span className="pl-2 text-sm font-black text-slate-400">{index + 1}</span>}</div><div className="flex min-w-0 items-center gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white">{product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-contain p-1" /> : <Box size={20} className="text-slate-300" />}</div><p className="truncate text-sm font-black text-slate-800">{product.name}</p></div><p className="text-sm font-black text-slate-700">{number.format(product.quantity)} uds</p><p className="text-sm font-black text-[#0950b5]">{currency.format(product.revenue)}</p><div className="flex items-center gap-3"><span className="w-12 text-right text-xs font-black text-slate-500">{share.toFixed(1)}%</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-[#0950b5] to-[#2d83f7]" style={{ width: `${Math.max(2, share)}%` }} /></div></div></div>; })}</div></div>
          </section>
        </>}
      </div>
    </main>
  );
}
