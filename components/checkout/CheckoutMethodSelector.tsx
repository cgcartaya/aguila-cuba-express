import { Home, PackageCheck } from "lucide-react";
import type { CheckoutMethod } from "@/lib/checkout/types";

type Props = {
  value: CheckoutMethod;
  enabledDelivery: boolean;
  enabledCuba: boolean;
  onChange: (method: CheckoutMethod) => void;
};

export function CheckoutMethodSelector({
  value,
  enabledDelivery,
  enabledCuba,
  onChange,
}: Props) {
  const methods = [
    enabledDelivery
      ? {
          id: "delivery" as const,
          title: "Entrega a domicilio",
          description: "Llevamos el pedido a la casa del cliente.",
          icon: Home,
        }
      : null,
    enabledCuba
      ? {
          id: "cuba" as const,
          title: "Enviar a Cuba",
          description: "Preparamos el pedido para enviarlo a un destinatario en Cuba.",
          icon: PackageCheck,
        }
      : null,
  ].filter(Boolean) as Array<{
    id: "delivery" | "cuba";
    title: string;
    description: string;
    icon: typeof Home;
  }>;

  if (methods.length <= 1) return null;

  return (
    <div className="min-w-0 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.06)] sm:p-6">
      <h2 className="text-lg font-bold text-gray-900">
        ¿Cómo deseas recibir tu pedido?
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Selecciona la opción que corresponde a este pedido.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {methods.map((method) => {
          const Icon = method.icon;
          const active = value === method.id;

          return (
            <button
              key={method.id}
              type="button"
              onClick={() => onChange(method.id)}
              className={`min-w-0 rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`rounded-xl p-2 ${
                    active ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  <Icon size={20} />
                </span>
                <span className="min-w-0">
                  <span className="block font-bold text-gray-900">
                    {method.title}
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-gray-500">
                    {method.description}
                  </span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
