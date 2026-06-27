"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  User,
  MapPin,
  DollarSign,
  Phone,
  Mail,
  CalendarDays,
  ClipboardList,
  Trash2,
  ChevronDown,
  ChevronUp,
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

  // ============================================================
  // ACORDEÓN DE ITEMS
  // ============================================================

  const [expandedOrders, setExpandedOrders] = useState<
    Record<string, boolean>
  >({});

  function toggleItems(orderId: string) {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  }

  const filteredOrders = useMemo(() => {
    if (filter === "Todas") return orders;

    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  // ============================================================
  // ACTUALIZAR ESTADO
  // ============================================================

  async function updateStatus(id: string, status: string) {
    const { data, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id)
      .select();

    console.log("UPDATE DATA:", data);
    console.log("UPDATE ERROR:", error);

    if (error) {
      alert(`Error actualizando estado: ${error.message}`);
      return;
    }

    alert("Estado actualizado correctamente");

    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    );
  }

  // ============================================================
  // ELIMINAR ORDEN
  // ============================================================

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
      alert(`Error eliminando: ${error.message}`);
      return;
    }

    alert("Orden eliminada correctamente");

    setOrders((prev) =>
      prev.filter((o) => o.id !== id)
    );
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
                : "bg-white text-slate-600 shadow"
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
              {/* CABECERA */}

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
                      className="rounded-xl border border-slate-300 p-2 font-semibold"
                    >
                      {STATUSES.filter(
                        (s) => s !== "Todas"
                      ).map((status) => (
                        <option
                          key={status}
                          value={status}
                        >
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

              {/* INFORMACIÓN */}

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

              {/* ITEMS ACORDEÓN */}

              <div className="px-5 pb-5">
                <section className="overflow-hidden rounded-2xl bg-slate-50">
                  <button
                    onClick={() => toggleItems(order.id)}
                    className="flex w-full items-center justify-between p-4 text-left transition hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <ClipboardList size={20} />

                      <div>
                        <h3 className="font-black">
                          Items del pedido (
                          {order.order_items?.length || 0})
                        </h3>

                        <p className="text-sm text-slate-500">
                          Toca para ver los productos
                        </p>
                      </div>
                    </div>

                    {expandedOrders[order.id] ? (
                      <ChevronUp size={22} />
                    ) : (
                      <ChevronDown size={22} />
                    )}
                  </button>

                  {expandedOrders[order.id] && (
                    <div className="space-y-3 border-t border-slate-200 p-4">
                      {order.order_items?.map((item: any) => (
                        <div
                          key={item.id}
                          className="rounded-2xl bg-white p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <span className="mb-2 inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">
                                Producto
                              </span>

                              <p className="font-black">
                                {item.product_name}
                              </p>

                              <p className="mt-1 text-sm text-slate-500">
                                {item.quantity} × $
                                {Number(item.price).toFixed(2)}
                              </p>
                            </div>

                            <p className="font-black text-green-600">
                              $
                              {Number(item.subtotal).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}

                      <div className="border-t pt-4 text-right">
                        <p className="text-lg font-black">
                          Total de la orden:{" "}
                          <span className="text-green-600">
                            ${Number(order.total).toFixed(2)}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}