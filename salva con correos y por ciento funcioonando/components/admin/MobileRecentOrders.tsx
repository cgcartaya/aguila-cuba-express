import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Order = {
  id: string;
  customer: string;
  total: number;
  status: "Pendiente" | "Preparando" | "En camino" | "Entregado";
};

type Props = {
  orders: Order[];
};

function getStatusColor(status: Order["status"]) {
  switch (status) {
    case "Pendiente":
      return "bg-yellow-100 text-yellow-700";

    case "Preparando":
      return "bg-blue-100 text-blue-700";

    case "En camino":
      return "bg-purple-100 text-purple-700";

    case "Entregado":
      return "bg-green-100 text-green-700";
  }
}

export default function MobileRecentOrders({ orders }: Props) {
  return (
    <section className="mt-6">
      {/* Título */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#061b3a]">
            Órdenes recientes
          </h2>

          <p className="text-sm text-gray-500">
            Últimos pedidos recibidos
          </p>
        </div>

        <Link
          href="/admin/orders"
          className="font-bold text-[#061b3a]"
        >
          Ver todas
        </Link>
      </div>


      <div className="rounded-3xl bg-white p-4 shadow-sm border">
        {orders.length === 0 ? (
          <p className="rounded-2xl bg-gray-50 p-4 text-gray-500">
            Todavía no hay órdenes.
          </p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center gap-3 rounded-2xl border p-3"
              >
                <div className="flex-1">
                  <p className="font-black text-[#061b3a]">
                    #{order.id}
                  </p>

                  <p className="text-sm text-gray-500">
                    {order.customer}
                  </p>
                </div>


                <div className="text-right">
                  <p className="font-black">
                    ${order.total.toFixed(2)}
                  </p>

                  <span
                    className={`rounded-full px-2 py-1 text-xs font-bold ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                </div>


                <ArrowRight
                  size={18}
                  className="text-gray-400"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}