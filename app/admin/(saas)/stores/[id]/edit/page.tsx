"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  ExternalLink,
  Globe2,
  ImageIcon,
  Info,
  Layers3,
  Loader2,
  Package,
  Palette,
  Save,
  Search,
  Share2,
  ShoppingBag,
  Store,
  Truck,
  Upload,
  UserRound,
  Users,
  UtensilsCrossed,
} from "lucide-react"
import {
  getStoreById,
  getStorePlatformFeeSummary,
  updateStore,
  uploadStoreFavicon,
  uploadStoreLogo,
  uploadStoreOgImage,
} from "@/lib/services/stores"
import {
  getPendingPlatformFee,
  getPlatformFeeSettlementHistory,
  registerPlatformFeeSettlement,
  type PendingPlatformFee,
  type PlatformFeeSettlement,
} from "@/lib/services/platform-fee-settlements"
import {
  getEconomyModuleStatus,
  setEconomyModuleStatus,
} from "@/lib/services/economy"

type SectionKey = "general" | "modules" | "domains" | "brand" | "billing" | "client"

type StoreForm = {
  name: string
  slug: string
  subdomain: string
  domain: string
  logo_url: string
  favicon_url: string
  meta_title: string
  meta_description: string
  og_image_url: string
  primary_color: string
  secondary_color: string
  plan: string
  monthly_price: number
  platform_fee_enabled: boolean
  platform_fee_percent: string
  is_active: boolean
  has_landing: boolean
  module_store_enabled: boolean
  module_shipping_enabled: boolean
  module_pickups_enabled: boolean
  module_menu_enabled: boolean
  module_reservas_enabled: boolean
  module_economy_enabled: boolean
  last_payment_date: string
  next_payment_date: string
  payment_status: string
  notes: string
  client_name: string
  client_phone: string
  client_email: string
}

const EMPTY_FORM: StoreForm = {
  name: "",
  slug: "",
  subdomain: "",
  domain: "",
  logo_url: "",
  favicon_url: "",
  meta_title: "",
  meta_description: "",
  og_image_url: "",
  primary_color: "#0B1F4D",
  secondary_color: "#DC2626",
  plan: "basic",
  monthly_price: 20,
  platform_fee_enabled: false,
  platform_fee_percent: "0",
  is_active: true,
  has_landing: false,
  module_store_enabled: true,
  module_shipping_enabled: false,
  module_pickups_enabled: false,
  module_menu_enabled: false,
  module_reservas_enabled: false,
  module_economy_enabled: false,
  last_payment_date: "",
  next_payment_date: "",
  payment_status: "pending",
  notes: "",
  client_name: "",
  client_phone: "",
  client_email: "",
}

const sections: Array<{
  id: SectionKey
  label: string
  description: string
  icon: typeof Info
}> = [
  { id: "general", label: "Información general", description: "Datos básicos y estado", icon: Info },
  { id: "modules", label: "Módulos contratados", description: "Activa y configura módulos", icon: Layers3 },
  { id: "domains", label: "Dominios y URLs", description: "Web, subdominio y landing", icon: Globe2 },
  { id: "brand", label: "Marca y SEO", description: "Logo, colores y compartir", icon: Palette },
  { id: "billing", label: "Billing y suscripción", description: "Plan, comisión y pagos", icon: CreditCard },
  { id: "client", label: "Cliente y notas", description: "Contacto y seguimiento", icon: Users },
]

function sanitizeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? "bg-emerald-500 shadow-[0_6px_18px_rgba(16,185,129,0.25)]" : "bg-slate-200"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200 ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  )
}

function ModuleCard({
  icon: Icon,
  iconClass,
  title,
  description,
  helper,
  checked,
  onChange,
  badge,
}: {
  icon: typeof Store
  iconClass: string
  title: string
  description: string
  helper: string
  checked: boolean
  onChange: (value: boolean) => void
  badge?: string
}) {
  return (
    <div
      className={`group rounded-2xl border bg-white p-4 transition-all md:p-5 ${
        checked
          ? "border-indigo-200 shadow-[0_8px_28px_rgba(30,64,175,0.07)]"
          : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-4">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black text-slate-900">{title}</h3>
            {badge ? (
              <span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-600">
                {badge}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm font-medium leading-5 text-slate-500">{description}</p>
          <p className="mt-1 text-xs font-semibold text-indigo-500/90">{helper}</p>
        </div>

        <div className="flex shrink-0 items-center gap-3 pt-1">
          <span className={`hidden text-sm font-bold sm:block ${checked ? "text-emerald-600" : "text-slate-400"}`}>
            {checked ? "Activo" : "Inactivo"}
          </span>
          <Toggle checked={checked} onChange={onChange} label={`${checked ? "Desactivar" : "Activar"} ${title}`} />
        </div>
      </div>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-2 block text-sm font-black text-slate-700">{children}</label>
}

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"

export default function EditStorePage() {
  const router = useRouter()
  const params = useParams()
  const storeId = params.id as string

  const [activeSection, setActiveSection] = useState<SectionKey>("modules")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState<StoreForm>(EMPTY_FORM)

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [faviconFile, setFaviconFile] = useState<File | null>(null)
  const [ogImageFile, setOgImageFile] = useState<File | null>(null)
  const [ogPreviewUrl, setOgPreviewUrl] = useState("")

  const [feeSummary, setFeeSummary] = useState<{ totalSales: number; totalFee: number; ordersCount: number } | null>(null)
  const [pendingFee, setPendingFee] = useState<PendingPlatformFee | null>(null)
  const [settlementHistory, setSettlementHistory] = useState<PlatformFeeSettlement[]>([])
  const [registeringSettlement, setRegisteringSettlement] = useState(false)

  useEffect(() => {
    async function loadStore() {
      setLoading(true)

      const [store, economy] = await Promise.all([
        getStoreById(storeId),
        getEconomyModuleStatus(storeId),
      ])

      if (!store) {
        alert("No se encontró la tienda")
        router.push("/admin/stores")
        return
      }

      setForm({
        name: store.name || "",
        slug: store.slug || "",
        subdomain: store.subdomain || store.slug || "",
        domain: store.domain || "",
        logo_url: store.logo_url || "",
        favicon_url: store.favicon_url || "",
        meta_title: store.meta_title || "",
        meta_description: store.meta_description || "",
        og_image_url: store.og_image_url || "",
        primary_color: store.primary_color || "#0B1F4D",
        secondary_color: store.secondary_color || "#DC2626",
        plan: store.plan || "basic",
        monthly_price: Number(store.monthly_price || 20),
        platform_fee_enabled: Boolean(store.platform_fee_enabled),
        platform_fee_percent: String(store.platform_fee_percent ?? "0"),
        is_active: Boolean(store.is_active),
        has_landing: Boolean(store.has_landing),
        module_store_enabled: store.module_store_enabled !== false,
        module_shipping_enabled: Boolean(store.module_shipping_enabled),
        module_pickups_enabled: Boolean(store.module_pickups_enabled),
        module_menu_enabled: Boolean(store.module_menu_enabled),
        module_reservas_enabled: Boolean(store.module_reservas_enabled),
        module_economy_enabled: Boolean(economy?.module_economy_enabled),
        last_payment_date: store.last_payment_date || "",
        next_payment_date: store.next_payment_date || "",
        payment_status: store.payment_status || "pending",
        notes: store.notes || "",
        client_name: store.client_name || "",
        client_phone: store.client_phone || "",
        client_email: store.client_email || "",
      })

      setLoading(false)

      void Promise.all([
        getStorePlatformFeeSummary(storeId).then(setFeeSummary),
        getPendingPlatformFee(storeId).then(setPendingFee),
        getPlatformFeeSettlementHistory(storeId).then(setSettlementHistory),
      ])
    }

    void loadStore()
  }, [router, storeId])

  useEffect(() => {
    if (!ogImageFile) {
      setOgPreviewUrl(form.og_image_url)
      return
    }

    const objectUrl = URL.createObjectURL(ogImageFile)
    setOgPreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [ogImageFile, form.og_image_url])

  const publicUrl = useMemo(() => {
    if (form.domain.trim()) {
      return `https://${form.domain.replace(/^https?:\/\//, "").replace(/^www\./, "")}`
    }
    return `https://${form.subdomain || form.slug || "mi-tienda"}.perlamarketplace.com`
  }, [form.domain, form.slug, form.subdomain])

  const seoTitle = form.meta_title.trim() || `${form.name || "Mi tienda"} | Perla Marketplace`
  const seoDescription =
    form.meta_description.trim() || `Descubre productos, ofertas y novedades de ${form.name || "esta tienda"}.`

  function setValue<K extends keyof StoreForm>(key: K, value: StoreForm[K]) {
    setSaved(false)
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleRegisterSettlement() {
    if (!pendingFee || pendingFee.feeAmount <= 0) return

    const confirmed = window.confirm(
      `¿Confirmas que ya recibiste $${pendingFee.feeAmount.toFixed(2)} de esta tienda? Esto cierra el periodo pendiente.`
    )
    if (!confirmed) return

    try {
      setRegisteringSettlement(true)
      const { data, error } = await registerPlatformFeeSettlement(storeId)

      if (error || !data) {
        alert(error?.message || "No se pudo registrar el pago")
        return
      }

      const [newPending, newHistory] = await Promise.all([
        getPendingPlatformFee(storeId),
        getPlatformFeeSettlementHistory(storeId),
      ])
      setPendingFee(newPending)
      setSettlementHistory(newHistory)
    } finally {
      setRegisteringSettlement(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      setSaving(true)
      setSaved(false)

      let logoUrl = form.logo_url || null
      if (logoFile) {
        const { data, error } = await uploadStoreLogo(storeId, logoFile)
        if (error) throw error
        logoUrl = data
      }

      let faviconUrl = form.favicon_url || null
      if (faviconFile) {
        const { data, error } = await uploadStoreFavicon(storeId, faviconFile)
        if (error) throw error
        faviconUrl = data
      }

      let ogImageUrl = form.og_image_url || null
      if (ogImageFile) {
        const { data, error } = await uploadStoreOgImage(storeId, ogImageFile)
        if (error) throw error
        ogImageUrl = data
      }

      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        subdomain: form.subdomain.trim().toLowerCase(),
        domain: form.domain.trim() === "" ? null : form.domain.trim().toLowerCase(),
        logo_url: logoUrl,
        favicon_url: faviconUrl,
        meta_title: form.meta_title.trim() === "" ? null : form.meta_title.trim(),
        meta_description: form.meta_description.trim() === "" ? null : form.meta_description.trim(),
        og_image_url: ogImageUrl,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        plan: form.plan,
        monthly_price: Number(form.monthly_price),
        platform_fee_enabled: form.platform_fee_enabled,
        platform_fee_percent: Number(form.platform_fee_percent) || 0,
        is_active: form.is_active,
        has_landing: form.has_landing,
        module_store_enabled: form.module_store_enabled,
        module_shipping_enabled: form.module_shipping_enabled,
        module_pickups_enabled: form.module_pickups_enabled,
        module_menu_enabled: form.module_menu_enabled,
        module_reservas_enabled: form.module_reservas_enabled,
        last_payment_date: form.last_payment_date || null,
        next_payment_date: form.next_payment_date || null,
        payment_status: form.payment_status,
        notes: form.notes.trim() === "" ? null : form.notes.trim(),
        client_name: form.client_name.trim() === "" ? null : form.client_name.trim(),
        client_phone: form.client_phone.trim() === "" ? null : form.client_phone.trim(),
        client_email: form.client_email.trim() === "" ? null : form.client_email.trim(),
      }

      const [{ error: storeError }, { error: economyError }] = await Promise.all([
        updateStore(storeId, payload),
        setEconomyModuleStatus(storeId, form.module_economy_enabled),
      ])

      if (storeError) throw storeError
      if (economyError) throw economyError

      setForm((current) => ({
        ...current,
        logo_url: logoUrl || "",
        favicon_url: faviconUrl || "",
        og_image_url: ogImageUrl || "",
      }))
      setLogoFile(null)
      setFaviconFile(null)
      setOgImageFile(null)
      setSaved(true)
      router.refresh()
      window.setTimeout(() => setSaved(false), 3500)
    } catch (error) {
      console.error("ERROR ACTUALIZANDO TIENDA:", error)
      alert(error instanceof Error ? error.message : "Error actualizando tienda")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f8fc] p-6">
        <div className="mx-auto grid min-h-[420px] max-w-7xl place-items-center rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
            <p className="mt-3 text-sm font-bold text-slate-500">Cargando configuración...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f6f8fc] px-3 py-4 md:px-6 md:py-6 xl:px-8">
      <form onSubmit={handleSubmit} className="mx-auto max-w-[1500px]">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
          <Link href="/admin/saas" className="transition hover:text-indigo-600">SaaS</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/admin/stores" className="transition hover:text-indigo-600">Tiendas</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-slate-700">{form.name}</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span>Módulos</span>
        </div>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <header className="border-b border-slate-100 px-5 py-5 md:px-7 md:py-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-black tracking-tight text-[#0f1f3d] md:text-3xl">Configuración de la tienda</h1>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${form.is_active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                    {form.is_active ? "Activa" : "Inactiva"}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-slate-500">Controla los módulos, marca, dominios y configuración comercial de esta tienda.</p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 sm:min-w-[310px]">
                  <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-indigo-50 text-indigo-600">
                    {form.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.logo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Store className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-800">{form.name || "Tienda"}</p>
                    <p className="truncate text-xs font-semibold text-slate-400">{publicUrl.replace("https://", "")}</p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 text-sm font-black text-white shadow-[0_10px_30px_rgba(79,70,229,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_35px_rgba(79,70,229,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                  {saving ? "Guardando..." : saved ? "Guardado" : "Guardar cambios"}
                </button>
              </div>
            </div>
          </header>

          <div className="grid xl:grid-cols-[270px_minmax(0,1fr)]">
            <aside className="border-b border-slate-100 bg-slate-50/40 p-4 xl:border-b-0 xl:border-r xl:p-5">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-1">
                {sections.map((section) => {
                  const Icon = section.icon
                  const active = activeSection === section.id
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveSection(section.id)}
                      className={`flex items-center gap-3 rounded-2xl p-3 text-left transition ${
                        active ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100" : "text-slate-600 hover:bg-white hover:text-slate-900"
                      }`}
                    >
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${active ? "bg-white text-indigo-600" : "bg-white text-slate-500"}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-black">{section.label}</span>
                        <span className={`mt-0.5 hidden text-[11px] font-semibold xl:block ${active ? "text-indigo-400" : "text-slate-400"}`}>
                          {section.description}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </aside>

            <div className="min-w-0 p-5 md:p-7 xl:p-8">
              {activeSection === "modules" ? (
                <section>
                  <div className="mb-6">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">SaaS Multiempresa</p>
                    <h2 className="mt-2 text-2xl font-black text-[#0f1f3d]">Módulos contratados</h2>
                    <p className="mt-1 max-w-3xl text-sm font-medium text-slate-500">
                      Activa o desactiva las herramientas disponibles para esta tienda. El módulo de Economía ya queda integrado aquí igual que el resto.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    <ModuleCard
                      icon={ShoppingBag}
                      iconClass="bg-indigo-50 text-indigo-600"
                      title="Tienda / Marketplace"
                      description="Dashboard, órdenes, productos, combos, inventario, clientes y visitas."
                      helper="Módulo principal para comercios con catálogo y ventas online."
                      checked={form.module_store_enabled}
                      onChange={(value) => setValue("module_store_enabled", value)}
                    />
                    <ModuleCard
                      icon={Truck}
                      iconClass="bg-emerald-50 text-emerald-600"
                      title="Envíos"
                      description="Dashboard de envíos, viajes, todos los envíos y sus ajustes."
                      helper="Gestiona operaciones logísticas y entregas."
                      checked={form.module_shipping_enabled}
                      onChange={(value) => setValue("module_shipping_enabled", value)}
                    />
                    <ModuleCard
                      icon={Package}
                      iconClass="bg-fuchsia-50 text-fuchsia-600"
                      title="Recogidas"
                      description="Solicitudes, rutas, clientes y zonas de recogida."
                      helper="Incluye el portal comercial de cotización y seguimiento."
                      checked={form.module_pickups_enabled}
                      onChange={(value) => setValue("module_pickups_enabled", value)}
                    />
                    <ModuleCard
                      icon={UtensilsCrossed}
                      iconClass="bg-orange-50 text-orange-600"
                      title="Menú digital"
                      description="Menú de platillos con opciones, modificadores y pedido por WhatsApp."
                      helper="Ideal para bares y restaurantes."
                      checked={form.module_menu_enabled}
                      onChange={(value) => setValue("module_menu_enabled", value)}
                    />
                    <ModuleCard
                      icon={CalendarDays}
                      iconClass="bg-blue-50 text-blue-600"
                      title="Reservas de mesas"
                      description="Croquis del local con mesas, capacidad y franjas horarias."
                      helper="Permite recibir y administrar reservas en línea."
                      checked={form.module_reservas_enabled}
                      onChange={(value) => setValue("module_reservas_enabled", value)}
                    />
                    <ModuleCard
                      icon={BarChart3}
                      iconClass="bg-violet-50 text-violet-600"
                      title="Economía y rentabilidad"
                      description="Controla costos, gastos, márgenes, ROI e inventario valorizado."
                      helper="Herramientas financieras para entender cuánto inviertes, vendes y ganas."
                      checked={form.module_economy_enabled}
                      onChange={(value) => setValue("module_economy_enabled", value)}
                      badge="Nuevo"
                    />
                  </div>

                  <div className="mt-5 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                    <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                    <div>
                      <p className="text-sm font-black text-blue-900">El Super Admin conserva acceso total</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-blue-700/80">
                        Estos interruptores controlan qué módulos quedan habilitados para la tienda. Después de activar Economía y guardar, aparecerá en el menú administrativo de esa tienda.
                      </p>
                    </div>
                  </div>
                </section>
              ) : null}

              {activeSection === "general" ? (
                <section>
                  <div className="mb-6">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">Configuración base</p>
                    <h2 className="mt-2 text-2xl font-black text-[#0f1f3d]">Información general</h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">Datos principales y estado operativo de la tienda.</p>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <FieldLabel>Nombre de la tienda</FieldLabel>
                      <input required className={inputClass} value={form.name} onChange={(e) => setValue("name", e.target.value)} />
                    </div>
                    <div>
                      <FieldLabel>Slug</FieldLabel>
                      <input required className={inputClass} value={form.slug} onChange={(e) => setValue("slug", sanitizeSlug(e.target.value))} />
                    </div>
                    <div>
                      <FieldLabel>Plan</FieldLabel>
                      <select className={inputClass} value={form.plan} onChange={(e) => setValue("plan", e.target.value)}>
                        <option value="basic">Basic</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-black text-slate-900">Tienda activa</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">Controla si la tienda está operativa dentro de la plataforma.</p>
                        </div>
                        <Toggle checked={form.is_active} onChange={(value) => setValue("is_active", value)} label="Estado de la tienda" />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-black text-slate-900">Landing pública</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">Muestra la landing antes de entrar a /tienda.</p>
                        </div>
                        <Toggle checked={form.has_landing} onChange={(value) => setValue("has_landing", value)} label="Landing pública" />
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}

              {activeSection === "domains" ? (
                <section>
                  <div className="mb-6">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">Presencia web</p>
                    <h2 className="mt-2 text-2xl font-black text-[#0f1f3d]">Dominios y URLs</h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">Configura el subdominio de Perla Marketplace y un dominio personalizado.</p>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <FieldLabel>Subdominio</FieldLabel>
                      <input required className={inputClass} value={form.subdomain} onChange={(e) => setValue("subdomain", sanitizeSlug(e.target.value))} />
                      <p className="mt-2 text-xs font-semibold text-slate-400">https://{form.subdomain || "mi-tienda"}.perlamarketplace.com</p>
                    </div>
                    <div>
                      <FieldLabel>Dominio personalizado</FieldLabel>
                      <input className={inputClass} placeholder="mitienda.com" value={form.domain} onChange={(e) => setValue("domain", e.target.value)} />
                      <p className="mt-2 text-xs font-semibold text-slate-400">Déjalo vacío si la tienda usa solo el subdominio.</p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-indigo-500">URL pública actual</p>
                        <p className="mt-1 break-all font-black text-indigo-950">{publicUrl}</p>
                      </div>
                      <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-indigo-700 shadow-sm ring-1 ring-indigo-100">
                        Abrir sitio <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </section>
              ) : null}

              {activeSection === "brand" ? (
                <section>
                  <div className="mb-6">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">Identidad visual</p>
                    <h2 className="mt-2 text-2xl font-black text-[#0f1f3d]">Marca y SEO</h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">Logo, colores y presentación cuando la tienda se comparte.</p>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 p-5">
                      <div className="flex items-center gap-3">
                        <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-slate-100">
                          {form.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={form.logo_url} alt="Logo" className="h-full w-full object-cover" />
                          ) : <ImageIcon className="h-5 w-5 text-slate-400" />}
                        </div>
                        <div>
                          <p className="font-black text-slate-900">Logo de la tienda</p>
                          <p className="text-xs font-semibold text-slate-400">PNG, JPG o WebP</p>
                        </div>
                      </div>
                      <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-black text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600">
                        <Upload className="h-4 w-4" /> Elegir logo
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                      </label>
                      {logoFile ? <p className="mt-2 text-xs font-bold text-emerald-600">Seleccionado: {logoFile.name}</p> : null}
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-5">
                      <div className="flex items-center gap-3">
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100"><Globe2 className="h-5 w-5 text-slate-500" /></div>
                        <div>
                          <p className="font-black text-slate-900">Favicon</p>
                          <p className="text-xs font-semibold text-slate-400">Ícono del navegador</p>
                        </div>
                      </div>
                      <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-black text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600">
                        <Upload className="h-4 w-4" /> Elegir favicon
                        <input type="file" accept="image/*,.ico" className="hidden" onChange={(e) => setFaviconFile(e.target.files?.[0] || null)} />
                      </label>
                      {faviconFile ? <p className="mt-2 text-xs font-bold text-emerald-600">Seleccionado: {faviconFile.name}</p> : null}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <div>
                      <FieldLabel>Color principal</FieldLabel>
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-2">
                        <input type="color" className="h-10 w-12 cursor-pointer rounded-xl border-0 bg-transparent" value={form.primary_color} onChange={(e) => setValue("primary_color", e.target.value)} />
                        <input className="min-w-0 flex-1 bg-transparent px-2 text-sm font-black uppercase text-slate-700 outline-none" value={form.primary_color} onChange={(e) => setValue("primary_color", e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Color secundario</FieldLabel>
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-2">
                        <input type="color" className="h-10 w-12 cursor-pointer rounded-xl border-0 bg-transparent" value={form.secondary_color} onChange={(e) => setValue("secondary_color", e.target.value)} />
                        <input className="min-w-0 flex-1 bg-transparent px-2 text-sm font-black uppercase text-slate-700 outline-none" value={form.secondary_color} onChange={(e) => setValue("secondary_color", e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-7 border-t border-slate-100 pt-7">
                    <div className="mb-5 flex items-center gap-3">
                      <Search className="h-5 w-5 text-indigo-600" />
                      <div>
                        <h3 className="font-black text-slate-900">SEO y vista al compartir</h3>
                        <p className="text-xs font-semibold text-slate-400">Controla cómo aparece la tienda en Google, WhatsApp y redes.</p>
                      </div>
                    </div>

                    <div className="grid gap-5">
                      <div>
                        <FieldLabel>Título SEO</FieldLabel>
                        <input className={inputClass} placeholder={seoTitle} value={form.meta_title} onChange={(e) => setValue("meta_title", e.target.value)} />
                      </div>
                      <div>
                        <FieldLabel>Descripción SEO</FieldLabel>
                        <textarea rows={3} className={inputClass} placeholder={seoDescription} value={form.meta_description} onChange={(e) => setValue("meta_description", e.target.value)} />
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-slate-200 p-5">
                      <div className="flex items-center gap-3"><Share2 className="h-5 w-5 text-indigo-600" /><p className="font-black text-slate-900">Imagen para compartir</p></div>
                      <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
                        <div className="aspect-[1.91/1] overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
                          {ogPreviewUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={ogPreviewUrl} alt="Vista previa" className="h-full w-full object-cover" />
                          ) : <div className="grid h-full place-items-center"><ImageIcon className="h-8 w-8 text-slate-300" /></div>}
                        </div>
                        <div>
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white">
                            <Upload className="h-4 w-4" /> Subir imagen
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => setOgImageFile(e.target.files?.[0] || null)} />
                          </label>
                          <p className="mt-3 text-xs font-semibold leading-5 text-slate-400">Recomendado: 1200 × 630 px. Esta imagen se usa al compartir enlaces de la tienda.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}

              {activeSection === "billing" ? (
                <section>
                  <div className="mb-6">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">Finanzas SaaS</p>
                    <h2 className="mt-2 text-2xl font-black text-[#0f1f3d]">Billing y suscripción</h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">Plan mensual, estado de pago y comisión de plataforma.</p>
                  </div>

                  <div className="grid gap-5 md:grid-cols-3">
                    <div>
                      <FieldLabel>Plan</FieldLabel>
                      <select className={inputClass} value={form.plan} onChange={(e) => setValue("plan", e.target.value)}>
                        <option value="basic">Basic</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                    <div>
                      <FieldLabel>Mensualidad</FieldLabel>
                      <input type="number" min="0" step="0.01" className={inputClass} value={form.monthly_price} onChange={(e) => setValue("monthly_price", Number(e.target.value))} />
                    </div>
                    <div>
                      <FieldLabel>Estado de pago</FieldLabel>
                      <select className={inputClass} value={form.payment_status} onChange={(e) => setValue("payment_status", e.target.value)}>
                        <option value="pending">Pendiente</option>
                        <option value="paid">Pagado</option>
                        <option value="overdue">Atrasado</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    </div>
                    <div>
                      <FieldLabel>Último pago</FieldLabel>
                      <input type="date" className={inputClass} value={form.last_payment_date} onChange={(e) => setValue("last_payment_date", e.target.value)} />
                    </div>
                    <div>
                      <FieldLabel>Próximo pago</FieldLabel>
                      <input type="date" className={inputClass} value={form.next_payment_date} onChange={(e) => setValue("next_payment_date", e.target.value)} />
                    </div>
                  </div>

                  <div className="mt-7 rounded-2xl border border-slate-200 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5 text-emerald-600" /><h3 className="font-black text-slate-900">Comisión de plataforma</h3></div>
                        <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 text-slate-500">Suma automáticamente un porcentaje al precio mostrado al cliente sin modificar el precio base del producto.</p>
                      </div>
                      <Toggle checked={form.platform_fee_enabled} onChange={(value) => setValue("platform_fee_enabled", value)} label="Comisión de plataforma" />
                    </div>

                    {form.platform_fee_enabled ? (
                      <div className="mt-5 max-w-xs">
                        <FieldLabel>Porcentaje de comisión (%)</FieldLabel>
                        <input type="number" min="0" max="100" step="0.01" className={inputClass} value={form.platform_fee_percent} onChange={(e) => setValue("platform_fee_percent", e.target.value)} />
                      </div>
                    ) : null}

                    {feeSummary ? (
                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-400">Órdenes</p><p className="mt-1 text-xl font-black text-slate-900">{feeSummary.ordersCount}</p></div>
                        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-400">Ventas históricas</p><p className="mt-1 text-xl font-black text-slate-900">${feeSummary.totalSales.toFixed(2)}</p></div>
                        <div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs font-bold text-emerald-600">Comisión generada</p><p className="mt-1 text-xl font-black text-emerald-800">${feeSummary.totalFee.toFixed(2)}</p></div>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-emerald-600">Pendiente por cobrar</p>
                        <p className="mt-1 text-3xl font-black text-emerald-900">${(pendingFee?.feeAmount ?? 0).toFixed(2)}</p>
                        <p className="mt-1 text-xs font-semibold text-emerald-700/80">sobre ${(pendingFee?.salesAmount ?? 0).toFixed(2)} en ventas · {pendingFee?.ordersCount ?? 0} órdenes</p>
                      </div>
                      <button type="button" disabled={registeringSettlement || !pendingFee || pendingFee.feeAmount <= 0} onClick={handleRegisterSettlement} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-sm disabled:opacity-40">
                        {registeringSettlement ? "Registrando..." : "Registrar pago"}
                      </button>
                    </div>
                  </div>

                  {settlementHistory.length > 0 ? (
                    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                      <div className="border-b border-slate-100 bg-slate-50 px-4 py-3"><p className="text-sm font-black text-slate-700">Historial de pagos</p></div>
                      <div className="divide-y divide-slate-100">
                        {settlementHistory.slice(0, 6).map((item) => (
                          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                            <div><p className="font-bold text-slate-700">${Number(item.fee_amount || 0).toFixed(2)}</p><p className="text-xs font-semibold text-slate-400">{item.registered_at ? new Date(item.registered_at).toLocaleDateString("es") : ""}</p></div>
                            <span className="text-xs font-bold text-slate-500">${Number(item.sales_amount || 0).toFixed(2)} en ventas</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>
              ) : null}

              {activeSection === "client" ? (
                <section>
                  <div className="mb-6">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">CRM interno</p>
                    <h2 className="mt-2 text-2xl font-black text-[#0f1f3d]">Cliente y notas</h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">Información privada para administrar la relación con el negocio.</p>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <FieldLabel>Nombre del cliente</FieldLabel>
                      <input className={inputClass} value={form.client_name} onChange={(e) => setValue("client_name", e.target.value)} />
                    </div>
                    <div>
                      <FieldLabel>Teléfono / WhatsApp</FieldLabel>
                      <input className={inputClass} placeholder="Ej: 17861234567" value={form.client_phone} onChange={(e) => setValue("client_phone", e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <FieldLabel>Email</FieldLabel>
                      <input type="email" className={inputClass} value={form.client_email} onChange={(e) => setValue("client_email", e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <FieldLabel>Notas internas</FieldLabel>
                      <textarea rows={6} className={inputClass} value={form.notes} onChange={(e) => setValue("notes", e.target.value)} placeholder="Acuerdos, seguimiento, solicitudes especiales..." />
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link href={`/admin/stores/${storeId}/users`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600">
                      <UserRound className="h-4 w-4" /> Administrar usuarios
                    </Link>
                    <Link href="/admin/stores" className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">
                      <ArrowLeft className="h-4 w-4" /> Volver a tiendas
                    </Link>
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </section>
      </form>
    </main>
  )
}
