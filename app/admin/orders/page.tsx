import { supabase } from "@/lib/supabase";
import OrdersManager from "@/components/admin/OrdersManager";

export default async function AdminOrdersPage() {
  const { data: orders, error } = await supabase
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
      recipient_name,
      recipient_phone,
      recipient_phone_alt,
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
      <main className="min-h-screen bg-gray-50 p-6">
        <p className="font-bold text-red-600">
          Error cargando órdenes: {error.message}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 pb-28 text-[#061b3a] md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-black">Órdenes</h1>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            Busca, filtra, actualiza estados y gestiona pedidos.
          </p>
        </div>

        <OrdersManager initialOrders={orders || []} />
      </div>
    </main>
  );
}