import { supabase } from "@/lib/supabase";
import OrdersManager from "@/components/admin/OrdersManager";

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
      <main className="min-h-screen p-6">
        Error cargando órdenes
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 pb-28 text-[#061b3a] md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-black">
            Órdenes
          </h1>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            Panel administrativo de pedidos.
          </p>
        </div>

        <OrdersManager initialOrders={orders || []} />
      </div>
    </main>
  );
}