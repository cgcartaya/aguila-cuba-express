export const dynamic = "force-dynamic"
export const revalidate = 0

import Link from "next/link"
import {
  Building2,
  DollarSign,
  Globe,
  Plus,
  UserCog,
  Store,
} from "lucide-react"
import { getStores } from "@/lib/services/stores"

function getPaymentBadge(status?: string | null) {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-700"

    case "overdue":
      return "bg-red-100 text-red-700"

    case "cancelled":
      return "bg-slate-200 text-slate-700"

    default:
      return "bg-amber-100 text-amber-700"
  }
}

function getPaymentText(status?: string | null) {
  switch (status) {
    case "paid":
      return "Pagado"

    case "overdue":
      return "Atrasado"

    case "cancelled":
      return "Cancelado"

    default:
      return "Pendiente"
  }
}

export default async function AdminStoresPage() {
  const stores = await getStores()

  const totalMonthlyRevenue = stores.reduce(
    (acc, store) => acc + Number(store.monthly_price || 0),
    0
  )

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              SaaS Multiempresa
            </p>

            <h1 className="text-2xl font-bold text-slate-900">
              Tiendas
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Administra las tiendas conectadas a la plataforma.
            </p>
          </div>

          <Link
            href="/admin/stores/new"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Nueva tienda
          </Link>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-3">
                <Store className="h-5 w-5 text-slate-700" />
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Total tiendas
                </p>

                <p className="text-2xl font-bold text-slate-900">
                  {stores.length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-100 p-3">
                <Building2 className="h-5 w-5 text-emerald-700" />
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Activas
                </p>

                <p className="text-2xl font-bold text-slate-900">
                  {stores.filter((store) => store.is_active).length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-blue-100 p-3">
                <DollarSign className="h-5 w-5 text-blue-700" />
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Mensualidad total
                </p>

                <p className="text-2xl font-bold text-slate-900">
                  ${totalMonthlyRevenue}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            Listado de tiendas
          </h2>

          <div className="grid gap-4">
            {stores.map((store) => (
              <article
                key={store.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-100 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-white"
                    style={{
                      backgroundColor: store.primary_color || "#0f172a",
                    }}
                  >
                    {store.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={store.logo_url}
                        alt={store.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Store className="h-6 w-6" />
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900">
                      {store.name}
                    </h3>

                    <p className="text-sm text-slate-500">
                      /{store.slug}
                    </p>

                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                      <Globe className="h-3 w-3" />
                      {store.domain || "Sin dominio personalizado"}
                    </div>

                    <div className="mt-2 space-y-1 text-xs text-slate-500">
                      <p>
                        Último pago:{" "}
                        <span className="font-semibold text-slate-700">
                          {store.last_payment_date || "Sin registrar"}
                        </span>
                      </p>

                      <p>
                        Próximo pago:{" "}
                        <span className="font-semibold text-slate-700">
                          {store.next_payment_date || "Sin registrar"}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {store.plan}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      store.is_active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {store.is_active ? "Activa" : "Inactiva"}
                  </span>

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    ${store.monthly_price || 0}/mes
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getPaymentBadge(
                      store.payment_status
                    )}`}
                  >
                    {getPaymentText(store.payment_status)}
                  </span>

                  <Link
                    href={`/admin/stores/${store.id}/users`}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                  >
                    <UserCog className="h-3 w-3" />
                    Usuarios
                  </Link>

                  <Link
                    href={`/admin/stores/${store.id}/edit`}
                    className="rounded-full bg-[#0B1F4D] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#102b69]"
                  >
                    Editar
                  </Link>
                </div>
              </article>
            ))}

            {stores.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <p className="font-semibold text-slate-700">
                  No hay tiendas creadas.
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Crea la primera tienda para comenzar el módulo SaaS.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}