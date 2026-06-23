import { supabase } from "@/lib/supabase";
import {
  Users,
  Mail,
  Phone,
  MapPin,
  ShoppingBag,
  DollarSign,
  CalendarDays,
} from "lucide-react";

export default async function AdminCustomersPage() {
  /* =========================================================
     OBTENER CLIENTES
  ========================================================= */

  const { data: customers, error } = await supabase
    .from("customers")
    .select(`
      id,
      name,
      email,
      phone,
      city,
      created_at,
      orders (
        id,
        total,
        created_at
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen p-6">
        <p className="text-red-600">
          Error cargando clientes.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 pb-28 md:p-6 lg:pb-6">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-6">
          <h1 className="flex items-center gap-3 text-3xl font-black text-[#061b3a]">
            <Users size={34} />
            Clientes
          </h1>

          <p className="mt-2 text-sm font-semibold text-slate-500">
            Historial y estadísticas de clientes.
          </p>
        </div>

        {/* VACÍO */}
        {customers?.length === 0 && (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <Users
              size={42}
              className="mx-auto mb-4 text-slate-400"
            />

            <h2 className="text-xl font-black text-[#061b3a]">
              No hay clientes registrados
            </h2>
          </div>
        )}

        {/* LISTADO */}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {customers?.map((customer) => {
            const orders = customer.orders || [];

            const totalOrders = orders.length;

            const totalSpent = orders.reduce(
              (sum, order) => sum + Number(order.total),
              0
            );

            const lastOrder =
              orders.length > 0
                ? orders.sort(
                    (a, b) =>
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime()
                  )[0]
                : null;

            return (
              <article
                key={customer.id}
                className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100"
              >
                {/* NOMBRE */}
                <h2 className="text-xl font-black text-[#061b3a]">
                  {customer.name}
                </h2>

                {/* EMAIL */}
                {customer.email && (
                  <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <Mail size={16} />
                    {customer.email}
                  </p>
                )}

                {/* TELÉFONO */}
                {customer.phone && (
                  <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <Phone size={16} />
                    {customer.phone}
                  </p>
                )}

                {/* CIUDAD */}
                {customer.city && (
                  <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <MapPin size={16} />
                    {customer.city}
                  </p>
                )}

                {/* ESTADÍSTICAS */}
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-blue-50 p-3">
                    <div className="flex items-center gap-2 text-blue-700">
                      <ShoppingBag size={16} />
                      <span className="text-xs font-black uppercase">
                        Órdenes
                      </span>
                    </div>

                    <p className="mt-2 text-2xl font-black text-blue-700">
                      {totalOrders}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-green-50 p-3">
                    <div className="flex items-center gap-2 text-green-700">
                      <DollarSign size={16} />
                      <span className="text-xs font-black uppercase">
                        Gastado
                      </span>
                    </div>

                    <p className="mt-2 text-2xl font-black text-green-700">
                      ${totalSpent.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* ÚLTIMA COMPRA */}
                {lastOrder && (
                  <div className="mt-5 rounded-2xl bg-slate-50 p-3">
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                      <CalendarDays size={16} />
                      Última compra
                    </p>

                    <p className="mt-2 font-black text-[#061b3a]">
                      {new Date(
                        lastOrder.created_at
                      ).toLocaleDateString("es-US")}
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}