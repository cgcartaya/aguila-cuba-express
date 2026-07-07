"use client";

/* =========================================================
   FASE 3.8 - DASHBOARD ADMIN MULTITIENDA

   - Métricas filtradas por store_id.
   - No cuenta órdenes enviadas a papelera.
   - No muestra ventas de órdenes eliminadas.
========================================================= */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  ArrowRight,
  Store,
  Loader2,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";

type MobileOrderStatus = "Pendiente" | "Preparando" | "En camino" | "Entregado";

type RecentOrder = {
  id: string;
  total: number | null;
  status: string | null;
  created_at: string;
};

type DashboardData = {
  productsCount: number;
  activeProductsCount: number;
  ordersCount: number;
  customersCount: number;
  recentOrders: RecentOrder[];
};

function mapMobileStatus(status?: string | null): MobileOrderStatus {
  if (status === "preparing" || status === "preparando") return "Preparando";
  if (status === "in_transit" || status === "en_camino") return "En camino";
  if (status === "delivered" || status === "entregado") return "Entregado";

  return "Pendiente";
}

export default function AdminDashboardPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } =
    useAdminAccess();

  const { store: selectedStore, loading: storeLoading } = useStore();

  const [data, setData] = useState<DashboardData>({
    productsCount: 0,
    activeProductsCount: 0,
    ordersCount: 0,
    customersCount: 0,
    recentOrders: [],
  });

  const [loadingData, setLoadingData] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeStore = useMemo(() => {
    if (isSuperAdmin) {
      return selectedStore || accessStore;
    }

    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

  useEffect(() => {
    let mounted = true;

    async function loadDashboardData() {
      if (accessLoading || storeLoading) return;

      if (!activeStore?.id) {
        setData({
          productsCount: 0,
          activeProductsCount: 0,
          ordersCount: 0,
          customersCount: 0,
          recentOrders: [],
        });
        setErrorMessage("No se pudo resolver la tienda activa.");
        setLoadingData(false);
        return;
      }

      setLoadingData(true);
      setErrorMessage(null);

      const [
        productsResult,
        activeProductsResult,
        ordersCountResult,
        customersCountResult,
        recentOrdersResult,
      ] = await Promise.all([
        supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("store_id", activeStore.id)
          .is("deleted_at", null),

        supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("store_id", activeStore.id)
          .eq("is_active", true)
          .is("deleted_at", null),

        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("store_id", activeStore.id)
          .is("deleted_at", null),

        Promise.resolve({ count: 0, error: null }),

        supabase
          .from("orders")
          .select("id, total, status, created_at")
          .eq("store_id", activeStore.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (!mounted) return;

      const firstError =
        productsResult.error ||
        activeProductsResult.error ||
        ordersCountResult.error ||
        customersCountResult.error ||
        recentOrdersResult.error;

      if (firstError) {
        console.error("Error cargando dashboard:", firstError);
        setErrorMessage("Error cargando el dashboard de la tienda.");
        setLoadingData(false);
        return;
      }

      setData({
        productsCount: productsResult.count || 0,
        activeProductsCount: activeProductsResult.count || 0,
        ordersCount: ordersCountResult.count || 0,
        customersCount: customersCountResult.count || 0,
        recentOrders: (recentOrdersResult.data as RecentOrder[]) || [],
      });

      setLoadingData(false);
    }

    loadDashboardData();

    return () => {
      mounted = false;
    };
  }, [accessLoading, storeLoading, activeStore?.id]);

  const totalSales =
    data.recentOrders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    ) || 0;

  const cards = [
    {
      title: "Órdenes",
      value: data.ordersCount,
      icon: ShoppingCart,
      href: "/admin/orders",
    },
    {
      title: "Ventas recientes",
      value: `$${totalSales.toFixed(2)}`,
      icon: DollarSign,
      href: "/admin/orders",
    },
    {
      title: "Productos activos",
      value: data.activeProductsCount,
      icon: Package,
      href: "/admin/products",
    },
    {
      title: "Clientes",
      value: data.customersCount,
      icon: Users,
      href: "/admin/customers",
    },
  ];

  if (accessLoading || storeLoading || loadingData) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] p-6">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
          <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-[#0B1F4D]" />
          Cargando dashboard...
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] p-6">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-[#061b3a]">
            Dashboard no disponible
          </h1>

          <p className="mt-2 text-sm font-semibold text-red-600">
            {errorMessage}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-4 pb-24 md:p-6">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#0B1F4D] via-[#123D8D] to-[#2563EB] p-6 text-white shadow-xl md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-blue-100 ring-1 ring-white/15">
                <Store size={16} />
                Panel administrativo
              </div>

              <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                {activeStore?.name || "Tienda activa"}
              </h1>

              <p className="mt-3 max-w-2xl text-blue-100">
                Controla productos, órdenes, clientes y el crecimiento de la
                tienda desde un solo lugar.
              </p>
            </div>

            <Link
              href={
                activeStore?.slug && activeStore.slug !== "aguila"
                  ? `/tienda/${activeStore.slug}`
                  : "/tienda"
              }
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 font-bold text-white shadow-lg shadow-red-900/20 transition hover:bg-red-700"
            >
              Ver tienda
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <Link
                key={card.title}
                href={card.href}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#0B1F4D]">
                  <Icon size={24} />
                </div>

                <p className="text-sm font-medium text-slate-500">
                  {card.title}
                </p>

                <h2 className="mt-2 text-3xl font-bold text-[#0B1F4D]">
                  {card.value}
                </h2>
              </Link>
            );
          })}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#0B1F4D]">
                  Órdenes recientes
                </h2>
                <p className="text-sm text-slate-500">
                  Últimos pedidos recibidos.
                </p>
              </div>

              <Link
                href="/admin/orders"
                className="text-sm font-bold text-red-600 transition hover:text-red-700"
              >
                Ver todas
              </Link>
            </div>

            <div className="space-y-3">
              {data.recentOrders.length === 0 && (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                  Todavía no hay órdenes.
                </p>
              )}

              {data.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-blue-100 hover:bg-blue-50/40"
                >
                  <div>
                    <p className="font-bold text-[#0B1F4D]">
                      Orden #{order.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {new Date(order.created_at).toLocaleDateString("es-US")}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-[#0B1F4D]">
                      ${Number(order.total || 0).toFixed(2)}
                    </p>
                    <p className="text-sm capitalize text-amber-600">
                      {mapMobileStatus(order.status)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#0B1F4D]">
              Acciones rápidas
            </h2>

            <div className="mt-5 space-y-3">
              <QuickLink href="/admin/products/new" label="Agregar producto" />
              <QuickLink href="/admin/products" label="Gestionar productos" />
              <QuickLink href="/admin/orders" label="Ver órdenes" />
              <QuickLink
                href={
                  activeStore?.slug && activeStore.slug !== "aguila"
                    ? `/tienda/${activeStore.slug}`
                    : "/tienda"
                }
                label="Abrir tienda"
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4 font-semibold text-[#0B1F4D] transition hover:bg-blue-50 hover:text-blue-700"
    >
      {label}
      <ArrowRight size={18} />
    </Link>
  );
}