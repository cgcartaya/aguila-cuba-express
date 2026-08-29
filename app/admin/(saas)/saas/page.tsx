export const dynamic = "force-dynamic"
export const revalidate = 0

import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  DollarSign,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Rocket,
  Store,
  TrendingUp,
  Users,
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

function formatDate(date?: string | null) {
  if (!date) return "Sin registrar"
  const value = new Date(`${date}T12:00:00`)
  if (Number.isNaN(value.getTime())) return date
  return value.toLocaleDateString("es", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function daysUntil(date?: string | null) {
  if (!date) return null
  const now = new Date()
  const target = new Date(`${date}T23:59:59`)
  if (Number.isNaN(target.getTime())) return null
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
  badge,
}: {
  label: string
  value: string | number
  helper: string
  icon: typeof Store
  tone: string
  badge?: string
}) {
  return (
    <article className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-12 w-12 place-items-center rounded-2xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
        {badge && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-3xl font-black tracking-tight text-[#071a3d]">
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-400">{helper}</p>
    </article>
  )
}

export default async function AdminSaasDashboardPage() {
  const stores = await getStores()
  const today = new Date()

  const overdueStores = stores.filter((store) => {
    if (!store.next_payment_date) return false
    return (
      new Date(`${store.next_payment_date}T23:59:59`) < today &&
      store.payment_status !== "paid"
    )
  })

  const upcomingStores = stores.filter((store) => {
    if (!store.next_payment_date) return false
    const diffDays = daysUntil(store.next_payment_date)
    return diffDays !== null && diffDays >= 0 && diffDays <= 5 && store.payment_status !== "paid"
  })

  const totalStores = stores.length
  const activeStores = stores.filter((store) => store.is_active).length
  const inactiveStores = stores.filter((store) => !store.is_active).length
  const monthlyRevenue = stores.reduce(
    (acc, store) => acc + Number(store.monthly_price || 0),
    0
  )
  const activePercent = totalStores ? Math.round((activeStores / totalStores) * 100) : 0
  const averageRevenue = totalStores ? monthlyRevenue / totalStores : 0
  const maxMonthly = Math.max(...stores.map((s) => Number(s.monthly_price || 0)), 1)

  return (
    <main className="min-h-screen bg-[#f6f8fc] px-4 py-5 md:px-6 xl:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <section className="flex flex-col gap-5 rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_10px_35px_rgba(15,23,42,0.04)] lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-400">Bienvenido, Super Admin</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-[#071a3d] md:text-4xl">
              Dashboard SaaS
            </h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Control total de tu plataforma: clientes, ingresos, pagos y alertas.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-600">
              <Clock3 size={16} />
              Estado actual
            </div>
            <Link
              href="/admin/stores"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/15 transition hover:bg-blue-700"
            >
              Ver tiendas
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Total clientes"
            value={totalStores}
            helper="Todos los clientes SaaS"
            icon={Users}
            tone="bg-blue-50 text-blue-700"
            badge="100%"
          />
          <StatCard
            label="Activos"
            value={activeStores}
            helper="Clientes operando"
            icon={CheckCircle2}
            tone="bg-emerald-50 text-emerald-700"
            badge={`${activePercent}%`}
          />
          <StatCard
            label="Suspendidos"
            value={inactiveStores}
            helper="No pueden operar"
            icon={AlertTriangle}
            tone="bg-amber-50 text-amber-700"
            badge={inactiveStores ? "Revisar" : "0%"}
          />
          <StatCard
            label="Ingreso mensual"
            value={`$${monthlyRevenue.toFixed(2)}`}
            helper={`Promedio $${averageRevenue.toFixed(2)} por cliente`}
            icon={DollarSign}
            tone="bg-violet-50 text-violet-700"
          />
          <StatCard
            label="Alertas"
            value={overdueStores.length + upcomingStores.length}
            helper="Requieren atención"
            icon={Clock3}
            tone="bg-rose-50 text-rose-600"
            badge={overdueStores.length ? `${overdueStores.length} vencido(s)` : "Al día"}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <article className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-amber-600">
                  Cobros
                </p>
                <h2 className="mt-1 text-xl font-black text-[#071a3d]">
                  Pagos próximos a vencer
                </h2>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700">
                {upcomingStores.length} próximo(s)
              </span>
            </div>

            <div className="space-y-3">
              {upcomingStores.length === 0 && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                  <p className="font-black text-emerald-800">Todo tranquilo</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-700">
                    No hay pagos próximos a vencer en los próximos 5 días.
                  </p>
                </div>
              )}

              {upcomingStores.map((store) => {
                const message = getUpcomingPaymentMessage(store)
                const whatsappLink = getWhatsappLink(store.client_phone, message)
                const remaining = daysUntil(store.next_payment_date)

                return (
                  <div
                    key={store.id}
                    className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-[#071a3d]">{store.name}</h3>
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-700">
                            {remaining === 0 ? "Vence hoy" : `En ${remaining} día(s)`}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          Cliente: {store.client_name || "Sin registrar"}
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-600">
                          Vence {formatDate(store.next_payment_date)}
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-xs font-black uppercase text-slate-400">
                          Mensualidad
                        </p>
                        <p className="text-xl font-black text-[#071a3d]">
                          ${Number(store.monthly_price || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <MarkPaidButton
                        storeId={store.id}
                        currentNextPaymentDate={store.next_payment_date}
                      />
                      {whatsappLink ? (
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-emerald-700"
                        >
                          <MessageCircle size={16} />
                          WhatsApp
                        </a>
                      ) : (
                        <span className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-400">
                          Sin WhatsApp
                        </span>
                      )}
                      <Link
                        href={`/admin/stores/${store.id}/edit`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#071a3d] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#0c2858]"
                      >
                        <Pencil size={16} />
                        Editar
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-rose-600">
                  Atención
                </p>
                <h2 className="mt-1 text-xl font-black text-[#071a3d]">
                  Clientes con pagos atrasados
                </h2>
              </div>
              <span className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-600">
                {overdueStores.length} atrasado(s)
              </span>
            </div>

            {overdueStores.length === 0 ? (
              <div className="flex min-h-44 items-center gap-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={22} />
                </span>
                <div>
                  <p className="font-black text-emerald-900">Excelente</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-700">
                    No hay clientes con pagos atrasados.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {overdueStores.map((store) => {
                  const message = getOverduePaymentMessage(store)
                  const whatsappLink = getWhatsappLink(store.client_phone, message)

                  return (
                    <div key={store.id} className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-black text-rose-900">{store.name}</p>
                          <p className="mt-1 text-sm font-semibold text-rose-700">
                            Cliente: {store.client_name || "Sin registrar"}
                          </p>
                          <p className="mt-1 text-sm font-bold text-rose-700">
                            Venció {formatDate(store.next_payment_date)}
                          </p>
                        </div>
                        <p className="text-xl font-black text-rose-900">
                          ${Number(store.monthly_price || 0).toFixed(2)}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <MarkPaidButton
                          storeId={store.id}
                          currentNextPaymentDate={store.next_payment_date}
                        />
                        {whatsappLink && (
                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white"
                          >
                            <MessageCircle size={16} />
                            WhatsApp
                          </a>
                        )}
                        <Link
                          href={`/admin/stores/${store.id}/edit`}
                          className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-black text-white"
                        >
                          <Pencil size={16} />
                          Gestionar
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </article>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
          <article className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                  Ingresos recurrentes
                </p>
                <h2 className="mt-1 text-xl font-black text-[#071a3d]">
                  Distribución del MRR
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-400">
                  Peso de cada cliente dentro de los ${monthlyRevenue.toFixed(2)} mensuales actuales.
                </p>
              </div>
              <BarChart3 className="text-blue-600" size={24} />
            </div>

            <div className="mt-6 space-y-4">
              {stores
                .slice()
                .sort((a, b) => Number(b.monthly_price || 0) - Number(a.monthly_price || 0))
                .slice(0, 8)
                .map((store) => {
                  const price = Number(store.monthly_price || 0)
                  const percent = monthlyRevenue ? (price / monthlyRevenue) * 100 : 0
                  return (
                    <div key={store.id}>
                      <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                        <span className="truncate font-black text-slate-700">{store.name}</span>
                        <span className="shrink-0 font-black text-[#071a3d]">
                          ${price.toFixed(2)} · {percent.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500"
                          style={{ width: `${Math.max(2, (price / maxMonthly) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </article>

          <article className="overflow-hidden rounded-[28px] bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-600 p-6 text-white shadow-lg shadow-blue-600/15">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
              <Rocket size={22} />
            </span>
            <h2 className="mt-5 text-2xl font-black">Haz crecer tu plataforma</h2>
            <p className="mt-2 max-w-md text-sm font-semibold text-blue-100">
              Centraliza tus clientes, activa nuevos módulos y aumenta tu ingreso mensual recurrente.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs font-black uppercase text-blue-100">MRR actual</p>
                <p className="mt-1 text-2xl font-black">${monthlyRevenue.toFixed(0)}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs font-black uppercase text-blue-100">Clientes</p>
                <p className="mt-1 text-2xl font-black">{totalStores}</p>
              </div>
            </div>

            <Link
              href="/admin/stores"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-blue-700"
            >
              <Users size={16} />
              Gestionar clientes
            </Link>
          </article>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-blue-600">Cartera</p>
              <h2 className="mt-1 text-xl font-black text-[#071a3d]">Clientes SaaS</h2>
              <p className="mt-1 text-sm font-semibold text-slate-400">
                Información comercial y estado de todos los clientes registrados.
              </p>
            </div>

            <Link
              href="/admin/stores"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white"
            >
              Gestionar tiendas
              <ChevronRight size={16} />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {stores.map((store) => {
              const message = getUpcomingPaymentMessage(store)
              const whatsappLink = getWhatsappLink(store.client_phone, message)

              return (
                <article
                  key={store.id}
                  className="grid gap-4 p-5 transition hover:bg-slate-50/70 xl:grid-cols-[1.25fr_1.25fr_.8fr_.75fr_1fr] xl:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl text-white shadow-sm"
                      style={{ backgroundColor: store.primary_color || "#071a3d" }}
                    >
                      {store.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={store.logo_url} alt={store.name} className="h-full w-full object-cover" />
                      ) : (
                        <Building2 size={20} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-black text-[#071a3d]">{store.name}</h3>
                      <p className="truncate text-sm font-semibold text-slate-400">
                        Cliente: {store.client_name || "Sin registrar"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs font-semibold text-slate-500">
                    <p className="flex items-center gap-2">
                      <Phone size={13} />
                      {store.client_phone || "Sin teléfono"}
                    </p>
                    <p className="flex items-center gap-2">
                      <Mail size={13} />
                      {store.client_email || "Sin email"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                      {store.plan || "Sin plan"}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        store.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-600"
                      }`}
                    >
                      {store.is_active ? "Activa" : "Suspendida"}
                    </span>
                  </div>

                  <div>
                    <span className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-black text-blue-700">
                      ${Number(store.monthly_price || 0).toFixed(0)}/mes
                    </span>
                    <p className="mt-2 text-xs font-semibold text-slate-400">
                      Próximo pago
                    </p>
                    <p className="text-xs font-black text-slate-700">
                      {formatDate(store.next_payment_date)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    {whatsappLink && (
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white"
                      >
                        <MessageCircle size={14} />
                        WhatsApp
                      </a>
                    )}
                    <Link
                      href={`/admin/stores/${store.id}/edit`}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#071a3d] px-3 py-2 text-xs font-black text-white"
                    >
                      <Pencil size={14} />
                      Editar
                    </Link>
                  </div>
                </article>
              )
            })}

            {stores.length === 0 && (
              <div className="p-10 text-center">
                <Store className="mx-auto text-slate-300" size={34} />
                <p className="mt-3 font-black text-slate-600">Todavía no hay clientes SaaS.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
