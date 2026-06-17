import { supabase } from "@/lib/supabase";
import { Package, User, MapPin, DollarSign } from "lucide-react";

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
        <p className="text-red-600">Error cargando órdenes.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900">Órdenes</h1>
        <p className="mt-2 text-gray-500">
          Panel administrativo de pedidos recibidos.
        </p>

        <div className="mt-8 space-y-6">
          {orders?.length === 0 && (
            <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
              <Package className="mx-auto mb-3 text-gray-400" size={42} />
              <p className="text-gray-500">Todavía no hay órdenes.</p>
            </div>
          )}

          {orders?.map((order) => (
            <div
              key={order.id}
              className="rounded-3xl bg-white p-6 shadow-sm"
            >
              <div className="mb-5 flex flex-col gap-3 border-b pb-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-gray-500">Orden</p>
                  <h2 className="font-bold text-gray-900">
                    #{order.id.slice(0, 8)}
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-700">
                    {order.status}
                  </span>

                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                    ${Number(order.total).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <div className="mb-2 flex items-center gap-2 font-bold text-gray-900">
                    <User size={18} />
                    Cliente
                  </div>

                  <p>{order.customers?.name}</p>
                  <p className="text-sm text-gray-500">
                    {order.customers?.email}
                  </p>
                  <p className="text-sm text-gray-500">
                    {order.customers?.phone}
                  </p>
                  <p className="text-sm text-gray-500">
                    {order.customers?.city}
                  </p>
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2 font-bold text-gray-900">
                    <MapPin size={18} />
                    Entrega
                  </div>

                  <p>{order.address}</p>
                  <p className="text-sm text-gray-500">
                    {order.state} {order.zip_code}
                  </p>
                  <p className="text-sm text-gray-500">{order.country}</p>

                  {order.notes && (
                    <p className="mt-2 text-sm text-gray-500">
                      Nota: {order.notes}
                    </p>
                  )}
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2 font-bold text-gray-900">
                    <DollarSign size={18} />
                    Resumen
                  </div>

                  <p className="text-sm text-gray-500">
                    Fecha:{" "}
                    {new Date(order.created_at).toLocaleDateString("es-US")}
                  </p>

                  <p className="font-bold text-gray-900">
                    Total: ${Number(order.total).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-gray-50 p-4">
                <h3 className="mb-3 font-bold text-gray-900">
                  Productos
                </h3>

                <div className="space-y-2">
                  {order.order_items?.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.product_name}
                        </p>
                        <p className="text-gray-500">
                          Cantidad: {item.quantity} × $
                          {Number(item.price).toFixed(2)}
                        </p>
                      </div>

                      <p className="font-bold">
                        ${Number(item.subtotal).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}