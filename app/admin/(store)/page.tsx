import { supabase } from "@/lib/supabase";
import Link from "next/link";
import MobileAdminDashboard from "@/components/admin/MobileAdminDashboard";
import {
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  ArrowRight,
  Store,
} from "lucide-react";

type MobileOrderStatus = "Pendiente" | "Preparando" | "En camino" | "Entregado";

export default async function AdminDashboardPage() {
  const { count: productsCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });

  const { count: activeProductsCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  const { count: ordersCount } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true });

  const { count: customersCount } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true });

  const { data: orders } = await supabase
    .from("orders")
    .select("id, total, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  const totalSales =
    orders?.reduce((sum, order) => sum + Number(order.total || 0), 0) || 0;

  const mobileOrders =
    orders?.map((order) => {
      let status: MobileOrderStatus = "Pendiente";

      if (order.status === "preparando") status = "Preparando";
      if (order.status === "en_camino") status = "En camino";
      if (order.status === "entregado") status = "Entregado";

      return {
        id: order.id.slice(0, 8),
        customer: "Cliente",
        total: Number(order.total || 0),
        status,
      };
    }) || [];

  const cards = [
    {
      title: "Órdenes",
      value: ordersCount || 0,
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
      value: activeProductsCount || 0,
      icon: Package,
      href: "/admin/products",
    },
    {
      title: "Clientes",
      value: customersCount || 0,
      icon: Users,
      href: "/admin/orders",
    },
  ];

  return (
    <>
      <div className="lg:hidden pb-24">
        <MobileAdminDashboard
          ordersCount={ordersCount || 0}
          sales={totalSales}
          productsCount={activeProductsCount || 0}
          customersCount={customersCount || 0}
          recentOrders={mobileOrders}
        />
      </div>

      <div className="hidden lg:block">
        <main className="min-h-screen bg-[#F8FAFC] p-6">
          <div className="mx-auto max-w-7xl">
            {/* HERO PRINCIPAL ADMIN */}
            <section className="mb-8 overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#0B1F4D] via-[#123D8D] to-[#2563EB] p-8 text-white shadow-xl">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-blue-100 ring-1 ring-white/15">
                    <Store size={16} />
                    Panel administrativo
                  </div>

                  <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                    Águila Cuba Express
                  </h1>

                  <p className="mt-3 max-w-2xl text-blue-100">
                    Controla productos, órdenes, clientes y el crecimiento de la
                    tienda desde un solo lugar.
                  </p>
                </div>

                <Link
                  href="/tienda"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 font-bold text-white shadow-lg shadow-red-900/20 transition hover:bg-red-700"
                >
                  Ver tienda
                  <ArrowRight size={18} />
                </Link>
              </div>
            </section>

            {/* CARDS DE ESTADÍSTICAS */}
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
              {/* ÓRDENES RECIENTES */}
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
                  {orders?.length === 0 && (
                    <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                      Todavía no hay órdenes.
                    </p>
                  )}

                  {orders?.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-blue-100 hover:bg-blue-50/40"
                    >
                      <div>
                        <p className="font-bold text-[#0B1F4D]">
                          Orden #{order.id.slice(0, 8)}
                        </p>
                        <p className="text-sm text-slate-500">
                          {new Date(order.created_at).toLocaleDateString(
                            "es-US"
                          )}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-[#0B1F4D]">
                          ${Number(order.total).toFixed(2)}
                        </p>
                        <p className="text-sm capitalize text-amber-600">
                          {order.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ACCIONES RÁPIDAS */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-[#0B1F4D]">
                  Acciones rápidas
                </h2>

                <div className="mt-5 space-y-3">
                  <QuickLink
                    href="/admin/products/new"
                    label="Agregar producto"
                  />
                  <QuickLink
                    href="/admin/products"
                    label="Gestionar productos"
                  />
                  <QuickLink href="/admin/orders" label="Ver órdenes" />
                  <QuickLink href="/tienda" label="Abrir tienda" />
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
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