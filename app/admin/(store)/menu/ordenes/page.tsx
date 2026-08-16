"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Loader2, Save } from "lucide-react";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import { getMenuOrdersForAdmin, updateMenuOrderStatus } from "@/lib/services/menu-orders-admin";
import { getStoreSettings, saveStoreSettings } from "@/lib/services/settings";
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

function formatDateTime(value: string) {
  const date = new Date(value);
  return date.toLocaleString("es", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export default function AdminMenuOrdersPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(() => {
    if (isSuperAdmin) return selectedStore || accessStore;
    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

  const [statusFilter, setStatusFilter] = useState<MenuOrderStatus | "all">("all");
  const [orders, setOrders] = useState<MenuOrder[]>([]);
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

  useEffect(() => {
    void loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStore?.id, accessLoading, storeLoading, statusFilter]);

  useEffect(() => {
    if (!activeStore?.id) return;
    getStoreSettings(activeStore.id).then(({ data }) => {
      if (data) setDeliveryFee(String(data.menu_delivery_fee ?? 0));
    });
  }, [activeStore?.id]);

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
    if (error) {
      alert("No se pudo actualizar el pedido.");
      return;
    }
    void loadOrders();
  };

  const handleCancel = async (order: MenuOrder) => {
    const confirmCancel = confirm("¿Cancelar este pedido? El inventario que descontó se devuelve.");
    if (!confirmCancel) return;
    setUpdatingId(order.id);
    const { error } = await updateMenuOrderStatus(order.id, "cancelled");
    setUpdatingId(null);
    if (error) {
      alert("No se pudo cancelar el pedido.");
      return;
    }
    void loadOrders();
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <AdminPageHeader
        eyebrow="Menú"
        title="Órdenes"
        description="Pedidos entrando en tiempo real — en el restaurante, para llevar o a domicilio."
        storeName={activeStore?.name}
        icon={ClipboardList}
      />

      <div className="mt-5 flex flex-wrap items-end gap-2 rounded-2xl bg-white p-4 shadow-sm">
        <label className="text-xs font-bold text-slate-600">
          Costo de domicilio
          <div className="mt-1 flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2">
            <span className="text-sm font-bold text-slate-400">$</span>
            <input
              type="number"
              min={0}
              step={0.5}
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
              className="w-20 text-sm font-bold outline-none"
            />
          </div>
        </label>
        <button
          onClick={handleSaveFee}
          disabled={savingFee}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {savingFee ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Guardar
        </button>
        <p className="text-[11px] font-semibold text-slate-400">
          Se suma automáticamente a los pedidos marcados como &quot;Domicilio&quot;.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              statusFilter === f.value ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        {loading ? (
          <p className="text-sm font-bold text-slate-400">Cargando órdenes...</p>
        ) : orders.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-400">
            No hay órdenes para mostrar.
          </p>
        ) : (
          orders.map((order) => {
            const next = NEXT_STATUS[order.status];
            const isFinal = order.status === "delivered" || order.status === "cancelled";

            return (
              <div key={order.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-slate-900">{order.customer_name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_BADGE[order.status]}`}>
                        {MENU_ORDER_STATUS_LABEL[order.status]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">
                      {formatDateTime(order.created_at)} · {MENU_ORDER_TYPE_LABEL[order.order_type]}
                      {order.order_type === "dine_in" && order.table_number ? ` · Mesa ${order.table_number}` : ""}
                      {order.order_type === "delivery" && order.delivery_address ? ` · ${order.delivery_address}` : ""}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">{order.customer_phone}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {!isFinal && (
                      <button
                        onClick={() => handleCancel(order)}
                        disabled={updatingId === order.id}
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                      >
                        Cancelar
                      </button>
                    )}
                    {next && (
                      <button
                        onClick={() => handleAdvance(order)}
                        disabled={updatingId === order.id}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-60"
                      >
                        Marcar {MENU_ORDER_STATUS_LABEL[next]}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 space-y-1 rounded-xl bg-slate-50 p-3">
                  {(order.menu_order_items || []).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span>
                        {item.quantity}x {item.item_name}
                        {item.selected_options.length > 0 && (
                          <span className="text-slate-400">
                            {" "}
                            ({item.selected_options.map((o) => o.option_label).join(", ")})
                          </span>
                        )}
                      </span>
                      <span>${item.line_total.toFixed(2)}</span>
                    </div>
                  ))}
                  {order.delivery_fee > 0 && (
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                      <span>Domicilio</span>
                      <span>${order.delivery_fee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-1.5 text-sm font-black text-slate-900">
                    <span>Total</span>
                    <span>${order.total.toFixed(2)}</span>
                  </div>
                </div>

                {order.notes && (
                  <p className="mt-2 text-xs italic text-slate-400">&quot;{order.notes}&quot;</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
