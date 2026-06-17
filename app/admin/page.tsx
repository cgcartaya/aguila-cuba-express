import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  ArrowRight,
  Store,
} from "lucide-react";

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
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 rounded-[2rem] bg-black p-8 text-white shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
                <Store size={16} />
                Panel administrativo
              </div>

              <h1 className="text-3xl font-bold md:text-5xl">
                Águila Cuba Express
              </h1>

              <p className="mt-3 max-w-2xl text-white/70">
                Controla productos, órdenes, clientes y el crecimiento de la
                tienda desde un solo lugar.
              </p>
            </div>

            <Link
              href="/tienda"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-bold text-black"
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
                className="rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                  <Icon size={24} />
                </div>

                <p className="text-sm font-medium text-gray-500">
                  {card.title}
                </p>

                <h2 className="mt-2 text-3xl font-bold text-gray-900">
                  {card.value}
                </h2>
              </Link>
            );
          })}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Órdenes recientes
                </h2>
                <p className="text-sm text-gray-500">
                  Últimos pedidos recibidos.
                </p>
              </div>

              <Link
                href="/admin/orders"
                className="text-sm font-bold text-gray-900"
              >
                Ver todas
              </Link>
            </div>

            <div className="space-y-3">
              {orders?.length === 0 && (
                <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">
                  Todavía no hay órdenes.
                </p>
              )}

              {orders?.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-2xl bg-gray-50 p-4"
                >
                  <div>
                    <p className="font-bold text-gray-900">
                      Orden #{order.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString("es-US")}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      ${Number(order.total).toFixed(2)}
                    </p>
                    <p className="text-sm capitalize text-yellow-600">
                      {order.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">
              Acciones rápidas
            </h2>

            <div className="mt-5 space-y-3">
              <QuickLink href="/admin/products/new" label="Agregar producto" />
              <QuickLink href="/admin/products" label="Gestionar productos" />
              <QuickLink href="/admin/orders" label="Ver órdenes" />
              <QuickLink href="/tienda" label="Abrir tienda" />
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
      className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-4 font-semibold text-gray-800 hover:bg-gray-100"
    >
      {label}
      <ArrowRight size={18} />
    </Link>
  );
}