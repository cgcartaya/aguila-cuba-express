"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  DollarSign,
  Loader2,
  PackageCheck,
  Save,
  Search,
  ShoppingBag,
  Truck,
} from "lucide-react";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import { getMenuOrdersForAdmin, updateMenuOrderStatus } from "@/lib/services/menu-orders-admin";
import { getStoreSettings, saveStoreSettings } from "@/lib/services/settings";
import { supabase } from "@/lib/supabase";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import {
  MENU_ORDER_STATUS_LABEL,
  MENU_ORDER_TYPE_LABEL,
} from "@/lib/menu/types";
import type { MenuOrder, MenuOrderStatus } from "@/lib/menu/types";

const STATUS_FILTERS: { value: MenuOrderStatus | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "received", label: "Recibidas" },
  { value: "preparing", label: "Preparando" },
  { value: "ready", label: "Listas" },
  { value: "delivered", label: "Entregadas" },
  { value: "cancelled", label: "Canceladas" },
];

const NEXT_STATUS: Partial<Record<MenuOrderStatus, MenuOrderStatus>> = {
  received: "preparing",
  preparing: "ready",
  ready: "delivered",
};

const STATUS_BADGE: Record<MenuOrderStatus, string> = {
  received: "bg-amber-100 text-amber-700",
  preparing: "bg-blue-100 text-blue-700",
  ready: "bg-emerald-100 text-emerald-700",
  delivered: "bg-slate-200 text-slate-600",
  cancelled: "bg-red-100 text-red-600",
};

type StatsPeriod = "today" | "week" | "30d" | "month";
type StatRow = {
  id: string;
  created_at: string;
  total: number;
  status: MenuOrderStatus;
  order_type: MenuOrder["order_type"];
};

const PERIODS: { value: StatsPeriod; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "week", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "month", label: "Mes actual" },
];

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function money(value: number) {
  return `$${Number(value || 0).toLocaleString("es-CU", { maximumFractionDigits: 2 })}`;
}

function startFor(period: StatsPeriod) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === "week") start.setDate(start.getDate() - 6);
  if (period === "30d") start.setDate(start.getDate() - 29);
  if (period === "month") start.setDate(1);
  return start;
}

export default function AdminMenuOrdersPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(() => {
    if (isSuperAdmin) return selectedStore || accessStore;
    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

  const [statusFilter, setStatusFilter] = useState<MenuOrderStatus | "all">("all");
  const [period, setPeriod] = useState<StatsPeriod>("week");
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<MenuOrder[]>([]);
  const [statsRows, setStatsRows] = useState<StatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [savingFee, setSavingFee] = useState(false);

  const loadOrders = async () => {
    if (accessLoading || storeLoading || !activeStore?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await getMenuOrdersForAdmin(activeStore.id, {
      status: statusFilter === "all" ? undefined : statusFilter,
    });

    if (error) console.error("Error cargando órdenes:", error);
    setOrders(data || []);
    setLoading(false);
  };

  const loadStats = async () => {
    if (!activeStore?.id) return;
    const since = new Date();
    since.setDate(since.getDate() - 89);
    since.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("menu_orders")
      .select("id, created_at, total, status, order_type")
      .eq("store_id", activeStore.id)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error cargando resumen de órdenes:", error);
      return;
    }
    setStatsRows((data || []) as StatRow[]);
  };

  useEffect(() => {
    void loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStore?.id, accessLoading, storeLoading, statusFilter]);

  useEffect(() => {
    void loadStats();
    if (!activeStore?.id) return;
    getStoreSettings(activeStore.id).then(({ data }) => {
      if (data) setDeliveryFee(String(data.menu_delivery_fee ?? 0));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStore?.id]);

  const periodRows = useMemo(() => {
    const start = startFor(period).getTime();
    return statsRows.filter((row) => new Date(row.created_at).getTime() >= start);
  }, [period, statsRows]);

  const validRows = periodRows.filter((row) => row.status !== "cancelled");
  const totalSales = validRows.reduce((sum, row) => sum + Number(row.total || 0), 0);
  const averageTicket = validRows.length ? totalSales / validRows.length : 0;
  const deliveryOrders = validRows.filter((row) => row.order_type === "delivery").length;
  const deliveryShare = validRows.length ? Math.round((deliveryOrders / validRows.length) * 100) : 0;
  const cancelled = periodRows.filter((row) => row.status === "cancelled").length;

  const last7 = useMemo(() => {
    const result = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      return { key, label: date.toLocaleDateString("es", { weekday: "short" }), total: 0 };
    });
    const byKey = new Map(result.map((day) => [day.key, day]));
    statsRows.forEach((row) => {
      if (row.status === "cancelled") return;
      const key = new Date(row.created_at).toISOString().slice(0, 10);
      const day = byKey.get(key);
      if (day) day.total += Number(row.total || 0);
    });
    return result;
  }, [statsRows]);

  const maxDay = Math.max(...last7.map((day) => day.total), 1);

  const visibleOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((order) =>
      `${order.customer_name || ""} ${order.customer_phone || ""} ${order.delivery_address || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [orders, search]);

  const handleSaveFee = async () => {
    setSavingFee(true);
    await saveStoreSettings({ menu_delivery_fee: Number(deliveryFee) || 0 }, activeStore?.id);
    setSavingFee(false);
  };

  const handleAdvance = async (order: MenuOrder) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setUpdatingId(order.id);
    const { error } = await updateMenuOrderStatus(order.id, next);
    setUpdatingId(null);
    if (error) return alert("No se pudo actualizar el pedido.");
    await Promise.all([loadOrders(), loadStats()]);
  };

  const handleCancel = async (order: MenuOrder) => {
    if (!confirm("¿Cancelar este pedido? El inventario que descontó se devuelve.")) return;
    setUpdatingId(order.id);
    const { error } = await updateMenuOrderStatus(order.id, "cancelled");
    setUpdatingId(null);
    if (error) return alert("No se pudo cancelar el pedido.");
    await Promise.all([loadOrders(), loadStats()]);
  };

  return (
    <main className="min-h-screen bg-[#F6F8FC] px-4 pb-28 pt-6 text-[#071B35] md:px-6">
      <div className="mx-auto max-w-7xl">
        <AdminPageHeader
          eyebrow="Menú"
          title="Órdenes"
          description="Operación en tiempo real y resumen de ventas del restaurante."
          storeName={activeStore?.name}
          icon={ClipboardList}
        />

        <section className="mt-5 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                Costo de domicilio
                <div className="mt-1.5 flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <span className="text-sm font-black text-slate-400">$</span>
                  <input type="number" min={0} step={0.5} value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} className="w-24 bg-transparent text-sm font-black outline-none" />
                </div>
              </label>
              <button onClick={handleSaveFee} disabled={savingFee} className="inline-flex items-center gap-2 rounded-xl bg-[#071B35] px-4 py-2.5 text-xs font-black text-white disabled:opacity-60">
                {savingFee ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar
              </button>
              <p className="max-w-md text-[11px] font-semibold text-slate-400">Se añade automáticamente a los pedidos marcados como domicilio.</p>
            </div>

            <div className="flex flex-wrap gap-1.5 rounded-2xl bg-slate-100 p-1.5">
              {PERIODS.map((item) => (
                <button key={item.value} onClick={() => setPeriod(item.value)} className={`rounded-xl px-3 py-2 text-xs font-black ${period === item.value ? "bg-white text-[#071B35] shadow-sm" : "text-slate-500"}`}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: DollarSign, label: "Ventas", value: money(totalSales), note: `${validRows.length} órdenes válidas`, tone: "bg-emerald-100 text-emerald-700" },
            { icon: ShoppingBag, label: "Órdenes", value: String(periodRows.length), note: `${cancelled} canceladas`, tone: "bg-violet-100 text-violet-700" },
            { icon: BarChart3, label: "Ticket promedio", value: money(averageTicket), note: "Promedio por orden válida", tone: "bg-blue-100 text-blue-700" },
            { icon: Truck, label: "Domicilio", value: `${deliveryShare}%`, note: `${deliveryOrders} órdenes a domicilio`, tone: "bg-orange-100 text-orange-700" },
          ].map(({ icon: Icon, label, value, note, tone }) => (
            <div key={label} className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_26px_rgba(15,23,42,.04)]">
              <div className="flex items-center gap-3"><div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}><Icon size={20} /></div><div><p className="text-xs font-bold text-slate-500">{label}</p><p className="text-2xl font-black">{value}</p></div></div>
              <p className="mt-2 text-[11px] font-semibold text-slate-400">{note}</p>
            </div>
          ))}
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><div><p className="text-sm font-black">Ventas últimos 7 días</p><p className="text-xs font-semibold text-slate-400">Resumen visual diario</p></div><CalendarDays size={20} className="text-slate-400" /></div>
            <div className="mt-5 flex h-40 items-end gap-3">
              {last7.map((day) => (
                <div key={day.key} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-28 w-full items-end rounded-xl bg-slate-50 p-1"><div className="w-full rounded-lg bg-[#FF641F]" style={{ height: `${Math.max(6, (day.total / maxDay) * 100)}%` }} /></div>
                  <span className="text-[10px] font-black uppercase text-slate-400">{day.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-[#071B35] p-5 text-white shadow-sm">
            <p className="text-xs font-black uppercase tracking-[.18em] text-white/45">Operación actual</p>
            <div className="mt-4 space-y-3">
              {[
                ["Recibidas", statsRows.filter((r) => r.status === "received").length],
                ["Preparando", statsRows.filter((r) => r.status === "preparing").length],
                ["Listas", statsRows.filter((r) => r.status === "ready").length],
              ].map(([label, value]) => <div key={String(label)} className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3"><span className="text-sm font-bold">{label}</span><strong className="text-xl">{value}</strong></div>)}
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-lg font-black">Órdenes recientes</h2><p className="text-xs font-semibold text-slate-400">Gestiona estados sin perder de vista lo importante.</p></div>
            <label className="relative w-full sm:w-72"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente, teléfono..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm font-semibold outline-none focus:border-orange-300" /></label>
          </div>

          <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-4 py-3">
            {STATUS_FILTERS.map((f) => <button key={f.value} onClick={() => setStatusFilter(f.value)} className={`shrink-0 rounded-full px-3 py-2 text-xs font-black ${statusFilter === f.value ? "bg-[#071B35] text-white" : "bg-slate-100 text-slate-500"}`}>{f.label}</button>)}
          </div>

          <div className="p-3 sm:p-4">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-10 text-sm font-bold text-slate-400"><Loader2 size={18} className="animate-spin" /> Cargando órdenes...</div>
            ) : visibleOrders.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm font-semibold text-slate-400">No hay órdenes para mostrar.</div>
            ) : (
              <div className="space-y-3">
                {visibleOrders.map((order) => {
                  const next = NEXT_STATUS[order.status];
                  const isFinal = order.status === "delivered" || order.status === "cancelled";
                  return (
                    <article key={order.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 transition hover:shadow-md">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-black text-slate-900">{order.customer_name}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${STATUS_BADGE[order.status]}`}>{MENU_ORDER_STATUS_LABEL[order.status]}</span></div>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{formatDateTime(order.created_at)} · {MENU_ORDER_TYPE_LABEL[order.order_type]}{order.order_type === "dine_in" && order.table_number ? ` · Mesa ${order.table_number}` : ""}</p>
                          {order.order_type === "delivery" && order.delivery_address && <p className="mt-1 truncate text-xs font-semibold text-slate-500">{order.delivery_address}</p>}
                          <p className="mt-1 text-xs font-semibold text-slate-400">{order.customer_phone}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">{!isFinal && <button onClick={() => handleCancel(order)} disabled={updatingId === order.id} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-60">Cancelar</button>}{next && <button onClick={() => handleAdvance(order)} disabled={updatingId === order.id} className="rounded-xl bg-[#071B35] px-4 py-2 text-xs font-black text-white disabled:opacity-60">Marcar {MENU_ORDER_STATUS_LABEL[next]}</button>}</div>
                      </div>

                      <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                        {(order.menu_order_items || []).map((item) => <div key={item.id} className="flex items-start justify-between gap-3 py-1 text-xs font-semibold text-slate-600"><span>{item.quantity}x {item.item_name}{item.selected_options.length > 0 && <span className="text-slate-400"> ({item.selected_options.map((o) => o.option_label).join(", ")})</span>}</span><span className="shrink-0 font-black">{money(item.line_total)}</span></div>)}
                        {order.delivery_fee > 0 && <div className="flex items-center justify-between py-1 text-xs font-semibold text-slate-500"><span>Domicilio</span><span>{money(order.delivery_fee)}</span></div>}
                        <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-black"><span>Total</span><span>{money(order.total)}</span></div>
                      </div>
                      {order.notes && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold italic text-amber-800">“{order.notes}”</p>}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
