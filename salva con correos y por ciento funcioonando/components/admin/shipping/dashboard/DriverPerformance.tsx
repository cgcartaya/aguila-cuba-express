import {
  CheckCircle2,
  CircleAlert,
  Package,
  UserRound,
} from "lucide-react";

import type { ShippingDashboardDriverMetric } from "@/lib/shipping/dashboard-types";

export default function DriverPerformance({
  drivers,
}: {
  drivers: ShippingDashboardDriverMetric[];
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-emerald-700">
          Equipo de entrega
        </p>
        <h2 className="mt-1 text-xl font-extrabold text-slate-950">
          Rendimiento por repartidor
        </h2>
      </div>

      <div className="mt-5 space-y-3">
        {drivers.length ? (
          drivers.slice(0, 6).map((driver) => (
            <article
              key={driver.driver_id || driver.driver_name}
              className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#061b3a] text-white">
                  <UserRound size={19} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate font-extrabold text-slate-950">
                      {driver.driver_name}
                    </p>
                    <span className="text-sm font-extrabold text-emerald-700">
                      {driver.completion_rate.toFixed(0)}%
                    </span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width: `${Math.min(driver.completion_rate, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <SmallStat
                  icon={<Package size={14} />}
                  value={driver.pending}
                  label="Pendientes"
                />
                <SmallStat
                  icon={<CheckCircle2 size={14} />}
                  value={driver.delivered}
                  label="Entregados"
                />
                <SmallStat
                  icon={<CircleAlert size={14} />}
                  value={driver.issues}
                  label="Incidencias"
                />
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed p-6 text-center text-sm font-medium text-slate-400">
            Todavía no hay actividad por repartidor.
          </div>
        )}
      </div>
    </section>
  );
}

function SmallStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-xl bg-white px-2 py-2">
      <div className="flex items-center justify-center gap-1 text-slate-500">
        {icon}
        <span className="font-extrabold text-slate-900">{value}</span>
      </div>
      <p className="mt-0.5 text-[10px] font-semibold text-slate-400">{label}</p>
    </div>
  );
}
