import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  PackageCheck,
  Plane,
  Truck,
  Warehouse,
} from "lucide-react";

import type { ShippingDashboardStatusMetric } from "@/lib/shipping/dashboard-types";

const visuals: Record<
  string,
  {
    icon: React.ComponentType<{ size?: number }>;
    className: string;
  }
> = {
  received_miami: {
    icon: PackageCheck,
    className: "bg-slate-100 text-slate-700",
  },
  preparing: {
    icon: Clock3,
    className: "bg-amber-100 text-amber-800",
  },
  in_transit: {
    icon: Plane,
    className: "bg-violet-100 text-violet-800",
  },
  received_cuba: {
    icon: Warehouse,
    className: "bg-blue-100 text-blue-800",
  },
  out_for_delivery: {
    icon: Truck,
    className: "bg-cyan-100 text-cyan-800",
  },
  delivered: {
    icon: CheckCircle2,
    className: "bg-emerald-100 text-emerald-800",
  },
  issue: {
    icon: CircleAlert,
    className: "bg-rose-100 text-rose-700",
  },
};

export default function StatusOverview({
  statuses,
}: {
  statuses: ShippingDashboardStatusMetric[];
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-700">
          Flujo operativo
        </p>
        <h2 className="mt-1 text-xl font-extrabold text-slate-950">
          Estado actual de los envíos
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Distribución en tiempo real de todos los registros activos.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statuses.map((item) => {
          const visual = visuals[item.status] || visuals.preparing;
          const Icon = visual.icon;

          return (
            <div
              key={item.status}
              className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${visual.className}`}
              >
                <Icon size={21} />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-600">
                  {item.label}
                </p>
                <p className="text-2xl font-extrabold text-slate-950">
                  {item.count}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
