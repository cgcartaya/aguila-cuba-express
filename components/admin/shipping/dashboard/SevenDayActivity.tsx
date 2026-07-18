import type { ShippingDashboardDayMetric } from "@/lib/shipping/dashboard-types";

export default function SevenDayActivity({
  days,
}: {
  days: ShippingDashboardDayMetric[];
}) {
  const max = Math.max(
    1,
    ...days.map((item) => Math.max(item.created, item.delivered))
  );

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-violet-700">
            Tendencia
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-slate-950">
            Actividad de los últimos 7 días
          </h2>
        </div>

        <div className="flex gap-4 text-xs font-bold text-slate-500">
          <span className="flex items-center gap-2">
            <i className="h-2.5 w-2.5 rounded-full bg-blue-600" />
            Creados
          </span>
          <span className="flex items-center gap-2">
            <i className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Entregados
          </span>
        </div>
      </div>

      <div className="mt-8 grid h-56 grid-cols-7 items-end gap-2 sm:gap-4">
        {days.map((item) => (
          <div key={item.date} className="flex h-full flex-col justify-end">
            <div className="flex flex-1 items-end justify-center gap-1 sm:gap-2">
              <div
                className="w-3 rounded-t-lg bg-blue-600 transition-all sm:w-5"
                style={{
                  height: `${Math.max((item.created / max) * 100, item.created ? 8 : 2)}%`,
                }}
                title={`${item.created} creados`}
              />
              <div
                className="w-3 rounded-t-lg bg-emerald-500 transition-all sm:w-5"
                style={{
                  height: `${Math.max((item.delivered / max) * 100, item.delivered ? 8 : 2)}%`,
                }}
                title={`${item.delivered} entregados`}
              />
            </div>

            <div className="mt-3 text-center">
              <p className="text-xs font-extrabold text-slate-700">
                {item.label}
              </p>
              <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                {item.created}/{item.delivered}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
