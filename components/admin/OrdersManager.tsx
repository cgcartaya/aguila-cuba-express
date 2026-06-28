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
  Search,
  PackageCheck,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
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

function normalizeText(text = "") {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getOrderNumber(order: any) {
  return order.order_number || `#${order.id.slice(0, 8)}`;
}

function getCustomer(order: any) {
  return Array.isArray(order.customers)
    ? order.customers[0]
    : order.customers;
}

function statusClass(status: string) {
  const styles: Record<string, string> = {
    Pendiente: "bg-yellow-100 text-yellow-700",
    Confirmada: "bg-blue-100 text-blue-700",
    Preparando: "bg-indigo-100 text-indigo-700",
    "En tránsito": "bg-purple-100 text-purple-700",
    "Lista para entrega": "bg-cyan-100 text-cyan-700",
    Entregada: "bg-green-100 text-green-700",
    Cancelada: "bg-red-100 text-red-700",
  };

  return styles[status] || "bg-slate-100 text-slate-600";
}

export default function OrdersManager({
  initialOrders,
}: {
  initialOrders: any[];
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [filter, setFilter] = useState("Todas");
  const [search, setSearch] = useState("");
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>(
    {}
  );

  function toggleItems(orderId: string) {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  }

  const stats = useMemo(() => {
    const totalSales = orders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );

    return {
      total: orders.length,
      pendientes: orders.filter((o) => o.status === "Pendiente").length,
      preparando: orders.filter((o) => o.status === "Preparando").length,
      transito: orders.filter((o) => o.status === "En tránsito").length,
      entregadas: orders.filter((o) => o.status === "Entregada").length,
      ventas: totalSales,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const query = normalizeText(search);

    return orders.filter((order) => {
      const customer = getCustomer(order);

      const matchesStatus =
        filter === "Todas" ? true : order.status === filter;

      const searchableText = normalizeText(`
        ${order.order_number || ""}
        ${order.id || ""}
        ${customer?.name || ""}
        ${customer?.email || ""}
        ${customer?.phone || ""}
        ${order.recipient_name || ""}
        ${order.recipient_phone || ""}
        ${order.address || ""}
        ${order.exact_address || ""}
        ${order.municipality || ""}
        ${order.zone_name || ""}
      `);

      const matchesSearch = !query
        ? true
        : query
            .split(" ")
            .filter(Boolean)
            .every((word) => searchableText.includes(word));

      return matchesStatus && matchesSearch;
    });
  }, [orders, filter, search]);

  async function updateStatus(id: string, status: string) {
    const { data, error } = await supabase
      .from("orders")
.update({
  deleted_at: new Date().toISOString(),
})

    if (error) {
      alert(`Error actualizando estado: ${error.message}`);
      return;
    }

    if (!data || data.length === 0) {
      alert("No se pudo actualizar. Revisa RLS o permisos de Supabase.");
      return;
    }

    setOrders((prev) =>
      prev.map((order) => (order.id === id ? { ...order, status } : order))
    );
  }

  async function deleteOrder(id: string) {
    const ok = confirm("¿Seguro que deseas eliminar esta orden?");

    if (!ok) return;

    const { data, error } = await supabase
      .from("orders")
      .delete()
      .eq("id", id)
      .select();

    if (error) {
      alert(`Error eliminando orden: ${error.message}`);
      return;
    }

    if (!data || data.length === 0) {
      alert("No se pudo eliminar. Revisa RLS o permisos de Supabase.");
      return;
    }

    setOrders((prev) => prev.filter((order) => order.id !== id));
  }

  return (
    <>
      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Órdenes"
          value={stats.total}
          icon={PackageCheck}
          color="bg-slate-900 text-white"
        />

        <StatCard
          label="Pendientes"
          value={stats.pendientes}
          icon={Clock}
          color="bg-yellow-100 text-yellow-700"
        />

        <StatCard
          label="Preparando"
          value={stats.preparando}
          icon={PackageCheck}
          color="bg-indigo-100 text-indigo-700"
        />

        <StatCard
          label="En tránsito"
          value={stats.transito}
          icon={Truck}
          color="bg-purple-100 text-purple-700"
        />

        <StatCard
          label="Ventas"
          value={`$${stats.ventas.toFixed(2)}`}
          icon={DollarSign}
          color="bg-green-100 text-green-700"
        />
      </section>

      <section className="mb-5 rounded-3xl bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <Search size={20} className="text-slate-400" />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por orden, cliente, teléfono, email o dirección..."
            className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>
      </section>

      <div className="mb-6 flex flex-wrap gap-2">
        {STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-full px-4 py-2 text-sm font-black transition ${
              filter === status
                ? "bg-[#061b3a] text-white"
                : "bg-white text-slate-600 shadow-sm"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
          <ClipboardList className="mx-auto mb-3 text-slate-400" size={42} />
          <h2 className="text-xl font-black text-[#061b3a]">
            No hay órdenes para mostrar
          </h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Cambia el filtro o prueba otra búsqueda.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredOrders.map((order) => {
            const customer = getCustomer(order);
            const orderNumber = getOrderNumber(order);

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

                      <h2 className="mt-1 text-xl font-black text-[#061b3a]">
                        {orderNumber}
                      </h2>

                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        ID interno: {order.id.slice(0, 8)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>

                      <select
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                        className="rounded-xl border border-slate-300 bg-white p-2 text-sm font-bold text-slate-700"
                      >
                        {STATUSES.filter((status) => status !== "Todas").map(
                          (status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          )
                        )}
                      </select>

                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                        ${Number(order.total || 0).toFixed(2)}
                      </span>

                      <button
                        type="button"
                        onClick={() => deleteOrder(order.id)}
                        className="rounded-xl bg-red-50 p-3 text-red-600 transition hover:bg-red-100"
                        aria-label="Eliminar orden"
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
                  </section>

                  <section className="rounded-2xl bg-slate-50 p-4">
                    <div className="mb-3 flex items-center gap-2 font-black">
                      <MapPin size={18} />
                      Entrega
                    </div>

                    <p className="font-semibold">
                      {order.exact_address || order.address || "Sin dirección"}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {order.municipality || order.state || ""}{" "}
                      {order.zone_name || order.zip_code || ""}
                    </p>

                    <p className="text-sm font-semibold text-slate-500">
                      {order.country || "Cuba"}
                    </p>

                    {(order.recipient_name || order.recipient_phone) && (
                      <div className="mt-3 rounded-xl bg-white p-3 text-sm font-semibold text-slate-500">
                        {order.recipient_name && (
                          <p>Recibe: {order.recipient_name}</p>
                        )}

                        {order.recipient_phone && (
                          <p>Tel: {order.recipient_phone}</p>
                        )}
                      </div>
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
                      ${Number(order.total || 0).toFixed(2)}
                    </p>

                    <p className="mt-1 text-xs font-bold text-slate-500">
                      Pago: {order.payment_status || "Pendiente"}
                    </p>
                  </section>
                </div>

                <div className="px-5 pb-5">
                  <section className="overflow-hidden rounded-2xl bg-slate-50">
                    <button
                      type="button"
                      onClick={() => toggleItems(order.id)}
                      className="flex w-full items-center justify-between p-4 text-left transition hover:bg-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        <ClipboardList size={20} />

                        <div>
                          <h3 className="font-black">
                            Items del pedido ({order.order_items?.length || 0})
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
                                  {item.item_type === "combo"
                                    ? "Combo"
                                    : "Producto"}
                                </span>

                                <p className="font-black">
                                  {item.product_name}
                                </p>

                                <p className="mt-1 text-sm text-slate-500">
                                  {item.quantity} × $
                                  {Number(item.price || 0).toFixed(2)}
                                </p>
                              </div>

                              <p className="font-black text-green-600">
                                ${Number(item.subtotal || 0).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}

                        <div className="border-t pt-4 text-right">
                          <p className="text-lg font-black">
                            Total:{" "}
                            <span className="text-green-600">
                              ${Number(order.total || 0).toFixed(2)}
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
      )}
    </>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${color}`}
      >
        <Icon size={24} />
      </div>

      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-[#061b3a]">{value}</p>
    </div>
  );
}