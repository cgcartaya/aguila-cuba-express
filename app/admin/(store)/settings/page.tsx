import Link from "next/link";
import {
  Settings,
  Tags,
  Truck,
  Image,
  Store,
  ArrowRight,
  MapPinned,
  CalendarDays,
  TicketPercent,
  PanelsTopLeft,
  ShoppingBag,
} from "lucide-react";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";

const settingsCards = [

  {
    title: "Checkout Builder",
    description:
      "Configura métodos de entrega, bloques visibles, direcciones y vista previa del checkout.",
    href: "/admin/settings/checkout",
    icon: ShoppingBag,
    iconBox: "bg-blue-50 text-blue-700",
    hover: "hover:border-blue-200 hover:bg-blue-50/40",
  },

  {
    title: "Landing Builder",
    description:
      "Activa u oculta las secciones que aparecen en la página pública de cada tienda.",
    href: "/admin/settings/landing",
    icon: PanelsTopLeft,
    iconBox: "bg-indigo-50 text-indigo-700",
    hover: "hover:border-indigo-200 hover:bg-indigo-50/40",
  },

  {
    title: "Bonos de descuento",
    description:
      "Crea campañas de monto fijo y autoriza teléfonos específicos para usarlas una sola vez.",
    href: "/admin/settings/discounts",
    icon: TicketPercent,
    iconBox: "bg-pink-50 text-pink-700",
    hover: "hover:border-pink-200 hover:bg-pink-50/40",
  },

  {
    title: "Configuración general",
    description:
      "Nombre del negocio, WhatsApp, teléfono, dirección, redes sociales y datos principales.",
    href: "/admin/settings/general",
    icon: Store,
    iconBox: "bg-blue-50 text-blue-700",
    hover: "hover:border-blue-200 hover:bg-blue-50/40",
  },
  {
    title: "Categorías",
    description:
      "Crea, edita, ordena y activa las categorías que aparecen en la tienda.",
    href: "/admin/settings/categories",
    icon: Tags,
    iconBox: "bg-purple-50 text-purple-700",
    hover: "hover:border-purple-200 hover:bg-purple-50/40",
  },
  {
    title: "Domicilio",
    description:
      "Define compra mínima, costo de entrega, domicilio gratis y mensaje visible al cliente.",
    href: "/admin/settings/delivery",
    icon: Truck,
    iconBox: "bg-red-50 text-red-600",
    hover: "hover:border-red-200 hover:bg-red-50/40",
  },
  {
    title: "Zonas de entrega",
    description:
      "Administra municipios, zonas, costos de entrega y reglas reales de domicilio.",
    href: "/admin/settings/delivery-zones",
    icon: MapPinned,
    iconBox: "bg-emerald-50 text-emerald-700",
    hover: "hover:border-emerald-200 hover:bg-emerald-50/40",
  },
  {
    title: "Salidas",
    description:
      "Administra próximas salidas, fechas, horarios, origen y destino.",
    href: "/admin/settings/departures",
    icon: CalendarDays,
    iconBox: "bg-amber-50 text-amber-700",
    hover: "hover:border-amber-200 hover:bg-amber-50/40",
  },
  {
    title: "Banners",
    description:
      "Administra las tarjetas promocionales y banners principales de la tienda.",
    href: "/admin/settings/banners",
    icon: Image,
    iconBox: "bg-cyan-50 text-cyan-700",
    hover: "hover:border-cyan-200 hover:bg-cyan-50/40",
  },
];

export default function AdminSettingsPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] p-6">
      <div className="mx-auto max-w-7xl">
        <AdminPageHeader
          eyebrow="Centro de configuración"
          icon={Settings}
          title="Ajustes de la tienda"
          description="Controla desde aquí las opciones principales del negocio sin tocar código."
          actions={
            <Link
              href="/tienda"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-red-700"
            >
              Ver tienda
              <ArrowRight size={18} />
            </Link>
          }
        />

        {/* CARDS */}
        <section className="grid gap-5 md:grid-cols-2">
          {settingsCards.map((card) => {
            const Icon = card.icon;

            return (
              <Link
                key={card.href}
                href={card.href}
                className={`group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${card.hover}`}
              >
                <div
                  className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${card.iconBox}`}
                >
                  <Icon size={26} />
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#0B1F4D]">
                      {card.title}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {card.description}
                    </p>
                  </div>

                  <ArrowRight
                    size={20}
                    className="mt-1 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#0B1F4D]"
                  />
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}