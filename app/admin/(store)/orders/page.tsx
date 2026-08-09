"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import OrdersManager from "@/components/admin/OrdersManager";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";

const ORDERS_SELECT = `
  id,
  order_number,
  total,
  subtotal,
  delivery_fee,
  platform_fee_amount,
  status,
  payment_status,
  payment_method,
  address,
  exact_address,
  municipality,
  zone_name,
  state,
  zip_code,
  country,
  notes,
  created_at,
  deleted_at,
  recipient_name,
  recipient_phone,
  recipient_phone_alt,
  store_id,
  customers (
    name,
    email,
    phone,
    city
  ),
  order_items (
    id,
    item_type,
    product_id,
    combo_id,
    product_name,
    quantity,
    price,
    base_price,
    platform_fee_amount,
    subtotal
  )
`;

// Cargamos por páginas en vez de traer TODAS las órdenes de la
// tienda de una sola vez. Con pocas órdenes no se nota, pero una
// tienda con miles de pedidos históricos podía volver esta pantalla
// lenta o incluso hacerla fallar. El botón "Cargar más" en
// OrdersManager pide la siguiente página bajo demanda.
const PAGE_SIZE = 30;

export default function AdminOrdersPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } =
    useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(() => {
    if (isSuperAdmin) return selectedStore || accessStore;
    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [deletedOrders, setDeletedOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [totalActiveCount, setTotalActiveCount] = useState(0);
  const [totalTrashCount, setTotalTrashCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [transitoCount, setTransitoCount] = useState(0);
  const [ventasTotal, setVentasTotal] = useState(0);

  useEffect(() => {
    async function loadOrders() {
      if (accessLoading || storeLoading) return;

      if (!activeStore?.id) {
        setActiveOrders([]);
        setDeletedOrders([]);
        setErrorMessage("No se pudo resolver la tienda activa.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage("");

      const storeId = activeStore.id;

      const [
        activeResult,
        deletedResult,
        activeCountResult,
        trashCountResult,
        pendingCountResult,
        confirmedCountResult,
        transitoCountResult,
        totalsResult,
      ] = await Promise.all([
        supabase
          .from("orders")
          .select(ORDERS_SELECT)
          .eq("store_id", storeId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .range(0, PAGE_SIZE - 1),

        supabase
          .from("orders")
          .select(ORDERS_SELECT)
          .eq("store_id", storeId)
          .not("deleted_at", "is", null)
          .order("deleted_at", { ascending: false })
          .range(0, PAGE_SIZE - 1),

        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("store_id", storeId)
          .is("deleted_at", null),

        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("store_id", storeId)
          .not("deleted_at", "is", null),

        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("store_id", storeId)
          .eq("status", "pending")
          .is("deleted_at", null),

        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("store_id", storeId)
          .eq("status", "confirmed")
          .is("deleted_at", null),

        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("store_id", storeId)
          .eq("status", "in_transit")
          .is("deleted_at", null),

        // Consulta liviana (solo la columna `total`) para poder sumar
        // las ventas activas sin tener que traer cada orden completa
        // con sus items y datos de cliente.
        supabase
          .from("orders")
          .select("total")
          .eq("store_id", storeId)
          .is("deleted_at", null),
      ]);

      const firstError =
        activeResult.error ||
        deletedResult.error ||
        activeCountResult.error ||
        trashCountResult.error ||
        pendingCountResult.error ||
        confirmedCountResult.error ||
        transitoCountResult.error ||
        totalsResult.error;

      if (firstError) {
        console.error("Error cargando órdenes:", firstError);
        setErrorMessage("Error cargando órdenes.");
        setActiveOrders([]);
        setDeletedOrders([]);
        setLoading(false);
        return;
      }

      setActiveOrders(activeResult.data || []);
      setDeletedOrders(deletedResult.data || []);
      setTotalActiveCount(activeCountResult.count || 0);
      setTotalTrashCount(trashCountResult.count || 0);
      setPendingCount(pendingCountResult.count || 0);
      setConfirmedCount(confirmedCountResult.count || 0);
      setTransitoCount(transitoCountResult.count || 0);
      setVentasTotal(
        (totalsResult.data || []).reduce(
          (sum, row: any) => sum + Number(row.total || 0),
          0
        )
      );
      setLoading(false);
    }

    loadOrders();
  }, [accessLoading, storeLoading, activeStore?.id]);

  const loadMoreActive = useCallback(async () => {
    if (!activeStore?.id) return;

    setLoadingMore(true);

    const { data, error } = await supabase
      .from("orders")
      .select(ORDERS_SELECT)
      .eq("store_id", activeStore.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(activeOrders.length, activeOrders.length + PAGE_SIZE - 1);

    if (error) {
      console.error("Error cargando más órdenes:", error);
      setLoadingMore(false);
      return;
    }

    setActiveOrders((prev) => [...prev, ...(data || [])]);
    setLoadingMore(false);
  }, [activeStore?.id, activeOrders.length]);

  const loadMoreTrash = useCallback(async () => {
    if (!activeStore?.id) return;

    setLoadingMore(true);

    const { data, error } = await supabase
      .from("orders")
      .select(ORDERS_SELECT)
      .eq("store_id", activeStore.id)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })
      .range(deletedOrders.length, deletedOrders.length + PAGE_SIZE - 1);

    if (error) {
      console.error("Error cargando más órdenes de la papelera:", error);
      setLoadingMore(false);
      return;
    }

    setDeletedOrders((prev) => [...prev, ...(data || [])]);
    setLoadingMore(false);
  }, [activeStore?.id, deletedOrders.length]);

  return (
    <main className="min-h-screen bg-gray-50 p-4 pb-28 text-[#061b3a] md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-black">Órdenes</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Pedidos de {activeStore?.name || "la tienda activa"}.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
            {errorMessage}
          </div>
        )}

        {loading || accessLoading || storeLoading ? (
          <div className="rounded-3xl bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
            Cargando órdenes...
          </div>
        ) : (
          <OrdersManager
            initialOrders={activeOrders || []}
            initialDeletedOrders={deletedOrders || []}
            storeId={activeStore!.id}
            storeName={activeStore?.name || ""}
            storeSlug={activeStore?.slug || ""}
            totalActiveCount={totalActiveCount}
            totalTrashCount={totalTrashCount}
            pendingCount={pendingCount}
            confirmedCount={confirmedCount}
            transitoCount={transitoCount}
            ventasTotal={ventasTotal}
            hasMoreActive={activeOrders.length < totalActiveCount}
            hasMoreTrash={deletedOrders.length < totalTrashCount}
            loadingMore={loadingMore}
            onLoadMoreActive={loadMoreActive}
            onLoadMoreTrash={loadMoreTrash}
          />
        )}
      </div>
    </main>
  );
}
