import { supabase } from "@/lib/supabase";
import {
  Package,
  User,
  MapPin,
  DollarSign,
  Phone,
  Mail,
  CalendarDays,
  ShoppingBag,
  Boxes,
  ClipboardList,
} from "lucide-react";

export default async function AdminOrdersPage() {
  const { data: orders, error } = await supabase
    .from("orders")
    .select(`
      id,
      total,
      status,
      address,
      state,
      zip_code,
      country,
      notes,
      created_at,
      customers (
        name,
        email,
        phone,
        city
      ),
      order_items (
        id,
        item_type,
        product_name,
        quantity,
        price,
        subtotal
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 md:p-6">
        <p className="text-red-600">Error cargando órdenes.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 pb-28 text-[#061b3a] md:p-6 lg:pb-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-black">Órdenes</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Panel administrativo de pedidos recibidos.
          </p>
        </div>

        <div className="space-y-5">
          {orders?.length === 0 && (
            <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
              <Package className="mx-auto mb-3 text-slate-400" size={42} />
              <p className="font-semibold text-slate-500">
                Todavía no hay órdenes.
              </p>
            </div>
          )}

          {orders?.map((order) => {
            const customer = Array.isArray(order.customers)
              ? order.customers[0]
              : order.customers;

            return (
              <article
                key={order.id}
                className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100"
              >
                <div className="border-b border-slate-100 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                        Orden
                      </p>

                      <h2 className="mt-1 text-xl font-black">
                        #{order.id.slice(0, 8)}
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-black text-yellow-700">
                        {order.status}
                      </span>

                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                        ${Number(order.total).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 p-5 lg:grid-cols-3">
                  <section className="rounded-2xl bg-slate-50 p-4">
                    <div className="mb-3 flex items-center gap-2 font-black">
                      <User size={18} />
                      Cliente
                    </div>

                    <p className="font-black">
                      {customer?.name || "Cliente sin nombre"}
                    </p>

                    {customer?.email && (
                      <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
                        <Mail size={15} />
                        {customer.email}
                      </p>
                    )}

                    {customer?.phone && (
                      <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
                        <Phone size={15} />
                        {customer.phone}
                      </p>
                    )}

                    {customer?.city && (
                      <p className="mt-2 text-sm font-semibold text-slate-500">
                        Ciudad: {customer.city}
                      </p>
                    )}
                  </section>

                  <section className="rounded-2xl bg-slate-50 p-4">
                    <div className="mb-3 flex items-center gap-2 font-black">
                      <MapPin size={18} />
                      Entrega
                    </div>

                    <p className="font-semibold">{order.address}</p>

                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {order.state} {order.zip_code}
                    </p>

                    <p className="text-sm font-semibold text-slate-500">
                      {order.country}
                    </p>

                    {order.notes && (
                      <p className="mt-3 rounded-xl bg-white p-3 text-sm font-semibold text-slate-500">
                        Nota: {order.notes}
                      </p>
                    )}
                  </section>

                  <section className="rounded-2xl bg-slate-50 p-4">
                    <div className="mb-3 flex items-center gap-2 font-black">
                      <DollarSign size={18} />
                      Resumen
                    </div>

                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                      <CalendarDays size={15} />
                      {new Date(order.created_at).toLocaleDateString("es-US")}
                    </p>

                    <p className="mt-3 text-2xl font-black">
                      ${Number(order.total).toFixed(2)}
                    </p>
                  </section>
                </div>

                <div className="px-5 pb-5">
                  <section className="rounded-2xl bg-slate-50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <ClipboardList size={18} />
                      <h3 className="font-black">Items del pedido</h3>
                    </div>

                    <div className="space-y-3">
                      {order.order_items?.map((item) => {
                        const isCombo = item.item_type === "combo";

                        return (
                          <div
                            key={item.id}
                            className="flex items-start justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm"
                          >
                            <div className="min-w-0">
                              <span
                                className={`mb-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${
                                  isCombo
                                    ? "bg-green-100 text-green-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {isCombo ? (
                                  <Boxes size={12} />
                                ) : (
                                  <ShoppingBag size={12} />
                                )}
                                {isCombo ? "Combo" : "Producto"}
                              </span>

                              <p className="line-clamp-2 font-black">
                                {item.product_name}
                              </p>

                              <p className="mt-1 text-sm font-semibold text-slate-500">
                                Cantidad: {item.quantity} × $
                                {Number(item.price).toFixed(2)}
                              </p>
                            </div>

                            <p className="shrink-0 font-black">
                              ${Number(item.subtotal).toFixed(2)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}