"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import OrdersManager from "@/components/admin/OrdersManager";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";

export default function AdminOrdersPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } =
    useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(() => {
    if (isSuperAdmin) return selectedStore || accessStore;
    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadOrders() {
      if (accessLoading || storeLoading) return;

      if (!activeStore?.id) {
        setOrders([]);
        setErrorMessage("No se pudo resolver la tienda activa.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          total,
          subtotal,
          delivery_fee,
          status,
          payment_status,
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
            subtotal
          )
        `)
        .eq("store_id", activeStore.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error cargando órdenes:", error);
        setErrorMessage("Error cargando órdenes.");
        setOrders([]);
        setLoading(false);
        return;
      }

      setOrders(data || []);
      setLoading(false);
    }

    loadOrders();
  }, [accessLoading, storeLoading, activeStore?.id]);

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
          <OrdersManager initialOrders={orders || []} />
        )}
      </div>
    </main>
  );
}
