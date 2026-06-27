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
  },
  {
    title: "Categorías",
    description:
      "Crea, edita, ordena y activa las categorías que aparecen en la tienda.",
    href: "/admin/settings/categories",
    icon: Tags,
  },
  {
    title: "Domicilio",
    description:
      "Define compra mínima, costo de entrega, domicilio gratis y mensaje visible al cliente.",
    href: "/admin/settings/delivery",
    icon: Truck,
  },
  {
    title: "Zonas de entrega",
    description:
      "Administra municipios, zonas, costos de entrega y reglas reales de domicilio.",
    href: "/admin/settings/delivery-zones",
    icon: MapPinned,
  },
  {
    title: "Salidas",
    description:
      "Administra próximas salidas, fechas, horarios, origen y destino.",
    href: "/admin/settings/departures",
    icon: CalendarDays,
  },
  {
    title: "Banners",
    description:
      "Administra las tarjetas promocionales y banners principales de la tienda.",
    href: "/admin/settings/banners",
    icon: Image,
  },
];

export default function AdminSettingsPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 rounded-[2rem] bg-black p-8 text-white shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
                <Settings size={16} />
                Centro de configuración
              </div>

              <h1 className="text-3xl font-bold md:text-5xl">
                Ajustes de la tienda
              </h1>

              <p className="mt-3 max-w-2xl text-white/70">
                Controla desde aquí las opciones principales del negocio sin
                tocar código.
              </p>
            </div>

            <Link
              href="/tienda"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-bold text-black"
            >
              Ver tienda
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          {settingsCards.map((card) => {
            const Icon = card.icon;

            return (
              <Link
                key={card.href}
                href={card.href}
                className="group rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-900">
                  <Icon size={26} />
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {card.title}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-gray-500">
                      {card.description}
                    </p>
                  </div>

                  <ArrowRight
                    size={20}
                    className="mt-1 text-gray-400 transition group-hover:translate-x-1 group-hover:text-gray-900"
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