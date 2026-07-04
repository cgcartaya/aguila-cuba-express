import Link from "next/link"
import {
  Building2,
  DollarSign,
  Store,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Pencil,
  MessageCircle,
  Mail,
  Phone,
} from "lucide-react"
import { getStores } from "@/lib/services/stores"
import MarkPaidButton from "@/components/admin/saas/MarkPaidButton"

function cleanPhone(phone?: string | null) {
  return (phone || "").replace(/\D/g, "")
}

function getUpcomingPaymentMessage(store: {
  name: string
  client_name?: string | null
  monthly_price?: number | null
  next_payment_date?: string | null
}) {
  return `Hola ${store.client_name || ""}, te recordamos que la mensualidad de ${store.name} vence el ${store.next_payment_date || "próximamente"}. El monto pendiente es de $${store.monthly_price || 0}. Gracias por mantener activo tu servicio.`
}

function getOverduePaymentMessage(store: {
  name: string
  client_name?: string | null
  monthly_price?: number | null
  next_payment_date?: string | null
}) {
  return `Hola ${store.client_name || ""}, la mensualidad de ${store.name} venció el ${store.next_payment_date || "recientemente"}. Para evitar la suspensión del servicio, por favor realiza el pago de $${store.monthly_price || 0}.`
}

function getWhatsappLink(phone: string | null | undefined, message: string) {
  const cleanedPhone = cleanPhone(phone)

  if (!cleanedPhone) return null

  return `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`
}

export default async function AdminSaasDashboardPage() {
  const stores = await getStores()
  const today = new Date()

  const overdueStores = stores.filter((store) => {
    if (!store.next_payment_date) return false

    return (
      new Date(store.next_payment_date) < today &&
      store.payment_status !== "paid"
    )
  })

  const upcomingStores = stores.filter((store) => {
    if (!store.next_payment_date) return false

    const paymentDate = new Date(store.next_payment_date)
    const diffTime = paymentDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return diffDays >= 0 && diffDays <= 5 && store.payment_status !== "paid"
  })

  const totalStores = stores.length
  const activeStores = stores.filter((store) => store.is_active).length
  const inactiveStores = stores.filter((store) => !store.is_active).length

  const monthlyRevenue = stores.reduce(
    (acc, store) => acc + Number(store.monthly_price || 0),
    0
  )

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Plataforma SaaS
          </p>

          <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-900">
                Dashboard SaaS
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Control de clientes, ingresos, pagos y alertas de vencimiento.
              </p>
            </div>

            <Link
              href="/admin/stores"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Ver tiendas
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-5">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-3">
                <Store className="h-5 w-5 text-slate-700" />
              </div>

              <div>
                <p className="text-sm text-slate-500">Total clientes</p>
                <p className="text-2xl font-black text-slate-900">
                  {totalStores}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-100 p-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
              </div>

              <div>
                <p className="text-sm text-slate-500">Activos</p>
                <p className="text-2xl font-black text-slate-900">
                  {activeStores}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-red-100 p-3">
                <AlertTriangle className="h-5 w-5 text-red-700" />
              </div>

              <div>
                <p className="text-sm text-slate-500">Suspendidos</p>
                <p className="text-2xl font-black text-slate-900">
                  {inactiveStores}
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
                <p className="text-sm text-slate-500">Ingreso mensual</p>
                <p className="text-2xl font-black text-slate-900">
                  ${monthlyRevenue}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber-100 p-3">
                <Clock3 className="h-5 w-5 text-amber-700" />
              </div>

              <div>
                <p className="text-sm text-slate-500">Alertas</p>
                <p className="text-2xl font-black text-slate-900">
                  {overdueStores.length + upcomingStores.length}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-black text-amber-700">
              Pagos próximos a vencer
            </h2>

            <div className="space-y-3">
              {upcomingStores.length === 0 && (
                <div className="rounded-2xl bg-slate-50 p-4 text-slate-600">
                  No hay pagos próximos a vencer.
                </div>
              )}

              {upcomingStores.map((store) => {
                const message = getUpcomingPaymentMessage(store)
                const whatsappLink = getWhatsappLink(store.client_phone, message)

                return (
                  <div
                    key={store.id}
                    className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
                  >
                    <p className="font-bold text-amber-900">{store.name}</p>

                    <p className="text-sm text-amber-700">
                      Cliente: {store.client_name || "Sin registrar"}
                    </p>

                    <p className="text-sm text-amber-700">
                      Vence: {store.next_payment_date}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
      <MarkPaidButton
  storeId={store.id}
  currentNextPaymentDate={store.next_payment_date}
/>
                      {whatsappLink && (
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white"
                        >
                          <MessageCircle className="h-4 w-4" />
                          WhatsApp
                        </a>
                      )}

                      <Link
                        href={`/admin/stores/${store.id}/edit`}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-black text-red-700">
              Clientes con pagos atrasados
            </h2>

            <div className="space-y-3">
              {overdueStores.length === 0 && (
                <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-700">
                  No hay clientes atrasados.
                </div>
              )}

              {overdueStores.map((store) => {
                const message = getOverduePaymentMessage(store)
                const whatsappLink = getWhatsappLink(store.client_phone, message)

                return (
                  <div
                    key={store.id}
                    className="rounded-2xl border border-red-200 bg-red-50 p-4"
                  >
                    <p className="font-bold text-red-800">{store.name}</p>

                    <p className="text-sm text-red-700">
                      Cliente: {store.client_name || "Sin registrar"}
                    </p>

                    <p className="text-sm text-red-700">
                      Vencimiento: {store.next_payment_date}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
          <MarkPaidButton
  storeId={store.id}
  currentNextPaymentDate={store.next_payment_date}
/>
                      {whatsappLink && (
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white"
                        >
                          <MessageCircle className="h-4 w-4" />
                          WhatsApp
                        </a>
                      )}

                      <Link
                        href={`/admin/stores/${store.id}/edit`}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white"
                      >
                        <Pencil className="h-4 w-4" />
                        Gestionar
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Clientes SaaS
              </h2>

              <p className="text-sm text-slate-500">
                Información comercial de todos los clientes registrados.
              </p>
            </div>

            <Link
              href="/admin/stores"
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
            >
              Gestionar tiendas
            </Link>
          </div>

          <div className="grid gap-4">
            {stores.map((store) => {
              const upcomingMessage = getUpcomingPaymentMessage(store)
              const whatsappLink = getWhatsappLink(
                store.client_phone,
                upcomingMessage
              )

              return (
                <article
                  key={store.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-100 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-white"
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
                        <Building2 className="h-5 w-5" />
                      )}
                    </div>

                    <div>
                      <h3 className="font-black text-slate-900">
                        {store.name}
                      </h3>

                      <p className="text-sm text-slate-500">
                        Cliente: {store.client_name || "Sin registrar"}
                      </p>

                      <div className="mt-2 space-y-1 text-xs text-slate-500">
                        <p className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {store.client_phone || "Sin teléfono"}
                        </p>

                        <p className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          {store.client_email || "Sin email"}
                        </p>

                        <p>
                          Próximo pago:{" "}
                          <span className="font-bold text-slate-700">
                            {store.next_payment_date || "Sin registrar"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {store.plan}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        store.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {store.is_active ? "Activa" : "Suspendida"}
                    </span>

                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                      ${store.monthly_price || 0}/mes
                    </span>

                    {whatsappLink && (
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-xs font-bold text-white"
                      >
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </a>
                    )}

                    <Link
                      href={`/admin/stores/${store.id}/edit`}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white"
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Link>
                  </div>
                </article>
              )
            })}

            {stores.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <p className="font-bold text-slate-700">
                  No hay clientes registrados.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}