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
} from "lucide-react";

const settingsCards = [
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
        {/* HERO */}
        <section className="mb-8 overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#0B1F4D] via-[#123D8D] to-[#2563EB] p-8 text-white shadow-xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-blue-100 ring-1 ring-white/15">
                <Settings size={16} />
                Centro de configuración
              </div>

              <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                Ajustes de la tienda
              </h1>

              <p className="mt-3 max-w-2xl text-blue-100">
                Controla desde aquí las opciones principales del negocio sin
                tocar código.
              </p>
            </div>

            <Link
              href="/tienda"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 font-bold text-white shadow-lg shadow-red-900/20 transition hover:bg-red-700"
            >
              Ver tienda
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>

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