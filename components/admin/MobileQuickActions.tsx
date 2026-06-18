import Link from "next/link";
import {
  Plus,
  ClipboardList,
  Store,
  Settings,
  ArrowRight,
} from "lucide-react";

const actions = [
  {
    title: "Nuevo producto",
    description: "Agregar producto a la tienda",
    href: "/admin/products/new",
    icon: Plus,
    bg: "bg-blue-50",
    color: "text-blue-600",
  },
  {
    title: "Ver órdenes",
    description: "Gestionar pedidos recibidos",
    href: "/admin/orders",
    icon: ClipboardList,
    bg: "bg-green-50",
    color: "text-green-600",
  },
  {
    title: "Abrir tienda",
    description: "Ver tienda online",
    href: "/tienda",
    icon: Store,
    bg: "bg-purple-50",
    color: "text-purple-600",
  },
  {
    title: "Configuración",
    description: "Ajustes del negocio",
    href: "/admin",
    icon: Settings,
    bg: "bg-gray-100",
    color: "text-gray-600",
  },
];

export default function MobileQuickActions() {
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-xl font-black text-[#061b3a]">
        Acciones rápidas
      </h2>

      <div className="overflow-hidden rounded-3xl bg-white shadow-sm border">
        {actions.map((action, index) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.title}
              href={action.href}
              className={`flex items-center gap-4 px-4 py-4 ${
                index !== actions.length - 1 ? "border-b" : ""
              }`}
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${action.bg}`}
              >
                <Icon size={24} className={action.color} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-black text-gray-900">
                  {action.title}
                </p>
                <p className="text-sm text-gray-500">
                  {action.description}
                </p>
              </div>

              <ArrowRight size={20} className="text-gray-400" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}