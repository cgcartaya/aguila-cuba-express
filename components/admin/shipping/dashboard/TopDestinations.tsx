import { MapPin } from "lucide-react";

import type { ShippingDashboardDestinationMetric } from "@/lib/shipping/dashboard-types";

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function TopDestinations({
  destinations,
}: {
  destinations: ShippingDashboardDestinationMetric[];
}) {
  const max = Math.max(1, ...destinations.map((item) => item.count));

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-amber-700">
          Demanda
        </p>
        <h2 className="mt-1 text-xl font-extrabold text-slate-950">
          Destinos principales
        </h2>
      </div>

      <div className="mt-5 space-y-4">
        {destinations.length ? (
          destinations.slice(0, 6).map((item, index) => (
            <div key={`${item.location}-${index}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                    <MapPin size={16} />
                  </div>
                  <p className="truncate text-sm font-extrabold text-slate-900">
                    {item.location || "Sin destino"}
                  </p>
                </div>

                <p className="shrink-0 text-sm font-extrabold text-slate-950">
                  {item.count}
                </p>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>

              <div className="mt-1.5 flex justify-between text-[10px] font-semibold text-slate-400">
                <span>{item.weight_lb.toFixed(1)} lb</span>
                <span>{money(item.total_amount)}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed p-6 text-center text-sm font-medium text-slate-400">
            No hay destinos con actividad todavía.
          </div>
        )}
      </div>
    </section>
  );
}
