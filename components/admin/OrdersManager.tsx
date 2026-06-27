"use client";

import { useMemo, useState } from "react";
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
  Trash2,
} from "lucide-react";

const STATUSES = [
  "Todas",
  "Pendiente",
  "Confirmada",
  "Preparando",
  "En tránsito",
  "Lista para entrega",
  "Entregada",
  "Cancelada",
];

export default function OrdersManager({
  initialOrders,
}: {
  initialOrders: any[];
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [filter, setFilter] = useState("Todas");

  const filteredOrders = useMemo(() => {
    if (filter === "Todas") return orders;

    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id);

    if (error) {
      alert("Error actualizando estado");
      return;
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    );
  }

  async function deleteOrder(id: string) {
    const ok = confirm(
      "¿Seguro que deseas eliminar esta orden?"
    );

    if (!ok) return;

    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Error eliminando orden");
      return;
    }

    setOrders((prev) => prev.filter((o) => o.id !== id));
  }

  return (
    <>
      {/* FILTROS */}

      <div className="mb-6 flex flex-wrap gap-2">
        {STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-full px-4 py-2 text-sm font-black transition ${
              filter === status
                ? "bg-[#061b3a] text-white"
                : "bg-white text-slate-600"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="space-y-5">
        {filteredOrders.map((order) => {
          const customer = Array.isArray(order.customers)
            ? order.customers[0]
            : order.customers;

          return (
            <article
              key={order.id}
              className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100"
            >
              <div className="border-b border-slate-100 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-400">
                      Orden
                    </p>

                    <h2 className="mt-1 text-xl font-black">
                      #{order.id.slice(0, 8)}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={order.status}
                      onChange={(e) =>
                        updateStatus(
                          order.id,
                          e.target.value
                        )
                      }
                      className="rounded-xl border p-2 font-semibold"
                    >
                      {STATUSES.filter(
                        (s) => s !== "Todas"
                      ).map((status) => (
                        <option key={status}>
                          {status}
                        </option>
                      ))}
                    </select>

                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                      ${Number(order.total).toFixed(2)}
                    </span>

                    <button
                      onClick={() =>
                        deleteOrder(order.id)
                      }
                      className="rounded-xl bg-red-50 p-3 text-red-600 transition hover:bg-red-100"
                    >
                      <Trash2 size={18} />
                    </button>
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
                    {customer?.name}
                  </p>

                  {customer?.email && (
                    <p className="mt-2 flex items-center gap-2 text-sm">
                      <Mail size={15} />
                      {customer.email}
                    </p>
                  )}

                  {customer?.phone && (
                    <p className="mt-2 flex items-center gap-2 text-sm">
                      <Phone size={15} />
                      {customer.phone}
                    </p>
                  )}
                </section>

                <section className="rounded-2xl bg-slate-50 p-4">
                  <div className="mb-3 flex items-center gap-2 font-black">
                    <MapPin size={18} />
                    Entrega
                  </div>

                  <p>{order.address}</p>

                  <p className="text-sm text-slate-500">
                    {order.state} {order.zip_code}
                  </p>

                  <p className="text-sm text-slate-500">
                    {order.country}
                  </p>
                </section>

                <section className="rounded-2xl bg-slate-50 p-4">
                  <div className="mb-3 flex items-center gap-2 font-black">
                    <DollarSign size={18} />
                    Resumen
                  </div>

                  <p className="flex items-center gap-2 text-sm">
                    <CalendarDays size={15} />
                    {new Date(
                      order.created_at
                    ).toLocaleDateString("es-US")}
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
                    <h3 className="font-black">
                      Items del pedido
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {order.order_items?.map((item: any) => {
                      const isCombo =
                        item.item_type === "combo";

                      return (
                        <div
                          key={item.id}
                          className="flex justify-between rounded-2xl bg-white p-3"
                        >
                          <div>
                            <span className="mb-2 inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-black">
                              {isCombo ? "Combo" : "Producto"}
                            </span>

                            <p className="font-black">
                              {item.product_name}
                            </p>

                            <p className="text-sm text-slate-500">
                              {item.quantity} × $
                              {item.price}
                            </p>
                          </div>

                          <p className="font-black">
                            $
                            {Number(
                              item.subtotal
                            ).toFixed(2)}
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
    </>
  );
}