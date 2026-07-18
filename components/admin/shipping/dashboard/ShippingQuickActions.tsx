import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  PackagePlus,
  Settings,
  Truck,
  Users,
} from "lucide-react";

const actions = [
  {
    href: "/admin/shipping/new",
    label: "Nueva operación",
    description: "Crear paquete, dinero o envío mixto.",
    icon: PackagePlus,
    className: "bg-[#061b3a] text-white",
  },
  {
    href: "/admin/shipping/shipments",
    label: "Lista de envíos",
    description: "Buscar, editar, facturar y rastrear.",
    icon: Truck,
    className: "bg-blue-600 text-white",
  },
  {
    href: "/admin/customers",
    label: "Clientes",
    description: "Consultar historial y actividad.",
    icon: Users,
    className: "bg-emerald-600 text-white",
  },
  {
    href: "/admin/shipping/settings",
    label: "Tarifas y ajustes",
    description: "Destinos, precios, fees y estados.",
    icon: Settings,
    className: "bg-violet-600 text-white",
  },
];

export default function ShippingQuickActions() {
  return (
    <section>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.href}
              href={action.href}
              className={`group rounded-[1.5rem] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${action.className}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15">
                  <Icon size={20} />
                </div>
                <ArrowRight
                  size={18}
                  className="opacity-70 transition group-hover:translate-x-1"
                />
              </div>

              <p className="mt-4 font-extrabold">{action.label}</p>
              <p className="mt-1 text-xs font-medium opacity-75">
                {action.description}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
