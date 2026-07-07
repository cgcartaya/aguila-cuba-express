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
  RotateCcw,
  Archive,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

import {
  processOrderInventory,
  restoreOrderInventory,
  validateOrderStock,
} from "@/lib/services/inventory";

const STATUSES = [
  { value: "Todas", label: "Todas" },
  { value: "pending", label: "Pendiente" },
  { value: "confirmed", label: "Confirmada" },
  { value: "in_transit", label: "En tránsito" },
  { value: "delivered", label: "Entregada" },
  { value: "cancelled", label: "Cancelada" },
];

const ORDER_STATUS_OPTIONS = STATUSES.filter(
  (status) => status.value !== "Todas"
);

const LEGACY_STATUS_LABELS: Record<string, string> = {
  preparing: "Preparando",
  ready_for_delivery: "Lista para entrega",
};

function getStatusLabel(value: string) {
  return (
    STATUSES.find((status) => status.value === value)?.label ||
    LEGACY_STATUS_LABELS[value] ||
    value
  );
}

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
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    in_transit: "bg-purple-100 text-purple-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",

    // Compatibilidad con estados viejos que puedan existir en la BD.
    preparing: "bg-indigo-100 text-indigo-700",
    ready_for_delivery: "bg-cyan-100 text-cyan-700",
  };

  return styles[status] || "bg-slate-100 text-slate-600";
}

function normalizeOrderItems(order: any) {
  return (order.order_items || []).map((item: any) => ({
    ...item,
    quantity: Number(item.quantity || 0),
    item_type: item.item_type,
    product_id: item.product_id,
    combo_id: item.combo_id,
    product_name: item.product_name,
  }));
}

function cleanWhatsAppPhone(phone?: string | null) {
  if (!phone) return "";

  let cleaned = phone.replace(/\D/g, "");

  // Si el cliente escribió 10 dígitos de USA, agregamos código 1.
  if (cleaned.length === 10) {
    cleaned = `1${cleaned}`;
  }

  return cleaned;
}

function getOrderCustomerPhone(order: any) {
  const customer = getCustomer(order);

  return (
    customer?.phone ||
    order.customer_phone ||
    order.phone ||
    order.recipient_phone ||
    order.recipient_phone_alt ||
    ""
  );
}

function buildWhatsAppStatusMessage(order: any, newStatus: string) {
  const customer = getCustomer(order);
  const customerName = customer?.name || order.recipient_name || "cliente";
  const orderNumber = getOrderNumber(order);
  const total = Number(order.total || 0).toFixed(2);

  const statusMessages: Record<string, string> = {
    pending: `Hola ${customerName}, tu pedido ${orderNumber} está pendiente. Total: $${total}. Te avisaremos cuando sea confirmado.`,
    confirmed: `Hola ${customerName}, tu pedido ${orderNumber} fue confirmado. Total: $${total}. Ya estamos trabajando en él.`,
    in_transit: `Hola ${customerName}, tu pedido ${orderNumber} ya está en tránsito. Te avisaremos cuando sea entregado.`,
    delivered: `Hola ${customerName}, tu pedido ${orderNumber} fue marcado como entregado. Gracias por tu compra.`,
    cancelled: `Hola ${customerName}, tu pedido ${orderNumber} fue cancelado. Si tienes alguna duda, escríbenos por aquí.`,
  };

  return (
    statusMessages[newStatus] ||
    `Hola ${customerName}, el estado de tu pedido ${orderNumber} cambió a: ${getStatusLabel(
      newStatus
    )}.`
  );
}

function openWhatsAppStatusMessage(order: any, newStatus: string) {
  if (typeof window === "undefined") return;

  const phone = cleanWhatsAppPhone(getOrderCustomerPhone(order));

  if (!phone) {
    alert(
      "El estado fue actualizado, pero esta orden no tiene teléfono del cliente para generar el WhatsApp."
    );
    return;
  }

  const message = encodeURIComponent(buildWhatsAppStatusMessage(order, newStatus));
  window.open(`https://wa.me/${phone}?text=${message}`, "_blank", "noopener,noreferrer");
}

export default function OrdersManager({
  initialOrders,
  initialDeletedOrders = [],
}: {
  initialOrders: any[];
  initialDeletedOrders?: any[];
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [deletedOrders, setDeletedOrders] = useState(initialDeletedOrders);
  const [view, setView] = useState<"active" | "trash">("active");
  const [filter, setFilter] = useState("Todas");
  const [search, setSearch] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>(
    {}
  );

  const currentOrders = view === "active" ? orders : deletedOrders;

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
      trash: deletedOrders.length,
      pendientes: orders.filter((o) => o.status === "pending").length,
      confirmadas: orders.filter((o) => o.status === "confirmed").length,
      transito: orders.filter((o) => o.status === "in_transit").length,
      ventas: totalSales,
    };
  }, [orders, deletedOrders]);

  const filteredOrders = useMemo(() => {
    const query = normalizeText(search);

    return currentOrders.filter((order) => {
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
  }, [currentOrders, filter, search]);

  async function updateStatus(order: any, status: string) {
    const previousStatus = order.status;

    if (previousStatus === status) return;

    try {
      setActionLoadingId(order.id);

      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", order.id);

      if (error) throw error;

      setOrders((prev) =>
        prev.map((item) =>
          item.id === order.id ? { ...item, status } : item
        )
      );

      openWhatsAppStatusMessage({ ...order, status }, status);
    } catch (error: any) {
      console.error("ERROR ACTUALIZANDO ESTADO:", error);
      alert(error?.message || "Error actualizando estado.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function sendOrderToTrash(order: any) {
    const ok = confirm(
      "¿Seguro que deseas enviar esta orden a la papelera?\n\nEl inventario de los productos de esta orden será restaurado automáticamente."
    );

    if (!ok) return;

    try {
      setActionLoadingId(order.id);

      const orderItems = normalizeOrderItems(order);
      await restoreOrderInventory(orderItems);

      const deletedAt = new Date().toISOString();

      const { error } = await supabase
        .from("orders")
        .update({ deleted_at: deletedAt })
        .eq("id", order.id);

      if (error) throw error;

      const deletedOrder = {
        ...order,
        deleted_at: deletedAt,
      };

      setOrders((prev) => prev.filter((item) => item.id !== order.id));
      setDeletedOrders((prev) => [deletedOrder, ...prev]);
    } catch (error: any) {
      console.error("ERROR ENVIANDO ORDEN A PAPELERA:", error);
      alert(error?.message || "No se pudo enviar la orden a la papelera.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function restoreOrderFromTrash(order: any) {
    const ok = confirm(
      "¿Quieres restaurar esta orden?\n\nEl inventario volverá a descontarse. Si no hay stock suficiente, la restauración se cancelará."
    );

    if (!ok) return;

    try {
      setActionLoadingId(order.id);

      const orderItems = normalizeOrderItems(order);
      await validateOrderStock(orderItems);
      await processOrderInventory(orderItems);

      const { error } = await supabase
        .from("orders")
        .update({ deleted_at: null })
        .eq("id", order.id);

      if (error) throw error;

      const restoredOrder = {
        ...order,
        deleted_at: null,
      };

      setDeletedOrders((prev) => prev.filter((item) => item.id !== order.id));
      setOrders((prev) => [restoredOrder, ...prev]);
      setView("active");
    } catch (error: any) {
      console.error("ERROR RESTAURANDO ORDEN:", error);
      alert(error?.message || "No se pudo restaurar la orden.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function deleteOrderPermanently(order: any) {
    const ok = confirm(
      "Esta acción eliminará la orden definitivamente de la base de datos.\n\nNo se tocará inventario porque ya fue restaurado al enviarla a papelera.\n\n¿Deseas continuar?"
    );

    if (!ok) return;

    try {
      setActionLoadingId(order.id);

      const { error: itemsError } = await supabase
        .from("order_items")
        .delete()
        .eq("order_id", order.id);

      if (itemsError) throw itemsError;

      const { error: orderError } = await supabase
        .from("orders")
        .delete()
        .eq("id", order.id);

      if (orderError) throw orderError;

      setDeletedOrders((prev) => prev.filter((item) => item.id !== order.id));
    } catch (error: any) {
      console.error("ERROR ELIMINANDO ORDEN DEFINITIVAMENTE:", error);
      alert(error?.message || "No se pudo eliminar definitivamente la orden.");
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <>
      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard
          label="Órdenes activas"
          value={stats.total}
          icon={PackageCheck}
          color="bg-slate-900 text-white"
        />

        <StatCard
          label="Papelera"
          value={stats.trash}
          icon={Archive}
          color="bg-red-100 text-red-700"
        />

        <StatCard
          label="Pendientes"
          value={stats.pendientes}
          icon={Clock}
          color="bg-yellow-100 text-yellow-700"
        />

        <StatCard
          label="Confirmadas"
          value={stats.confirmadas}
          icon={CheckCircle2}
          color="bg-blue-100 text-blue-700"
        />

        <StatCard
          label="En tránsito"
          value={stats.transito}
          icon={Truck}
          color="bg-purple-100 text-purple-700"
        />

        <StatCard
          label="Ventas activas"
          value={`$${stats.ventas.toFixed(2)}`}
          icon={DollarSign}
          color="bg-green-100 text-green-700"
        />
      </section>

      <section className="mb-5 flex flex-wrap gap-2 rounded-3xl bg-white p-3 shadow-sm">
        <button
          type="button"
          onClick={() => setView("active")}
          className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
            view === "active"
              ? "bg-[#061b3a] text-white"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          Órdenes activas ({orders.length})
        </button>

        <button
          type="button"
          onClick={() => setView("trash")}
          className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
            view === "trash"
              ? "bg-red-600 text-white"
              : "bg-red-50 text-red-600 hover:bg-red-100"
          }`}
        >
          Papelera ({deletedOrders.length})
        </button>
      </section>

      {view === "trash" && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-700">
          <AlertTriangle className="mt-0.5 shrink-0" size={20} />
          <p>
            Las órdenes en papelera no cuentan en ventas ni estadísticas. Al
            restaurarlas, el inventario se volverá a descontar automáticamente.
          </p>
        </div>
      )}

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
            key={status.value}
            onClick={() => setFilter(status.value)}
            className={`rounded-full px-4 py-2 text-sm font-black transition ${
              filter === status.value
                ? "bg-[#061b3a] text-white"
                : "bg-white text-slate-600 shadow-sm"
            }`}
          >
            {status.label}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
          <ClipboardList className="mx-auto mb-3 text-slate-400" size={42} />

          <h2 className="text-xl font-black text-[#061b3a]">
            {view === "trash"
              ? "No hay órdenes en papelera"
              : "No hay órdenes para mostrar"}
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
            const isActionLoading = actionLoadingId === order.id;

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

                      {view === "trash" && order.deleted_at && (
                        <p className="mt-2 text-xs font-bold text-red-500">
                          En papelera desde:{" "}
                          {new Date(order.deleted_at).toLocaleString("es-US")}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(
                          order.status
                        )}`}
                      >
                        {getStatusLabel(order.status)}
                      </span>

                      {view === "active" && (
                        <select
                          value={order.status}
                          onChange={(e) => updateStatus(order, e.target.value)}
                          disabled={isActionLoading}
                          className="rounded-xl border border-slate-300 bg-white p-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {!ORDER_STATUS_OPTIONS.some(
                            (status) => status.value === order.status
                          ) && (
                            <option value={order.status}>
                              {getStatusLabel(order.status)}
                            </option>
                          )}

                          {ORDER_STATUS_OPTIONS.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      )}

                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                        ${Number(order.total || 0).toFixed(2)}
                      </span>

                      {view === "active" ? (
                        <button
                          type="button"
                          onClick={() => sendOrderToTrash(order)}
                          disabled={isActionLoading}
                          className="rounded-xl bg-red-50 p-3 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Enviar orden a la papelera"
                          title="Enviar a papelera y restaurar stock"
                        >
                          <Trash2 size={18} />
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => restoreOrderFromTrash(order)}
                            disabled={isActionLoading}
                            className="inline-flex items-center gap-2 rounded-xl bg-green-50 px-3 py-3 text-xs font-black text-green-700 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Restaurar orden y descontar stock"
                          >
                            <RotateCcw size={16} />
                            Restaurar
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteOrderPermanently(order)}
                            disabled={isActionLoading}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-3 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Eliminar definitivamente"
                          >
                            <Trash2 size={16} />
                            Eliminar definitivo
                          </button>
                        </>
                      )}
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

                                <p className="font-black">{item.product_name}</p>

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
