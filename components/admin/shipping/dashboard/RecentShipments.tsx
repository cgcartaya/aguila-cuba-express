import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Package,
  Scale,
  Truck,
} from "lucide-react";

import ShippingStatusBadge from "@/components/admin/shipping/ShippingStatusBadge";
import type { ShippingDashboardRecentShipment } from "@/lib/shipping/dashboard-types";

function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function RecentShipments({
  shipments,
}: {
  shipments: ShippingDashboardRecentShipment[];
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-700">
            Actividad reciente
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-slate-950">
            Últimos envíos
          </h2>
        </div>

        <Link
          href="/admin/shipping/shipments"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700"
        >
          Ver todos
          <ArrowRight size={16} />
        </Link>
      </div>

      <div className="mt-5 space-y-3">
        {shipments.length ? (
          shipments.map((shipment) => (
            <Link
              href={`/admin/shipping/${shipment.id}/edit`}
              key={shipment.id}
              className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-blue-200 hover:bg-blue-50/40 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="flex h-11 min-w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 px-2 text-base font-extrabold text-violet-800">
                  {shipment.order_number ?? "—"}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-extrabold text-slate-950">
                      {shipment.recipient_name || "Sin destinatario"}
                    </p>
                    <ShippingStatusBadge status={shipment.status} />
                  </div>

                  <p className="mt-1 truncate text-sm font-medium text-slate-500">
                    {shipment.location} ·{" "}
                    {shipment.assigned_driver_name || "Sin repartidor"}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                    {shipment.contains_package && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                        <Scale size={13} />
                        {shipment.weight_lb.toFixed(1)} lb
                      </span>
                    )}
                    {shipment.contains_money && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                        <Banknote size={13} />
                        Dinero
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-3 sm:block sm:border-0 sm:pt-0 sm:text-right">
                <p className="font-extrabold text-slate-950">
                  {money(shipment.service_price)}
                </p>
                <p
                  className={`mt-1 text-xs font-bold ${
                    shipment.balance_due > 0
                      ? "text-amber-700"
                      : "text-emerald-700"
                  }`}
                >
                  {shipment.balance_due > 0
                    ? `Saldo ${money(shipment.balance_due)}`
                    : "Pagado"}
                </p>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm font-medium text-slate-400">
            Todavía no hay envíos recientes.
          </div>
        )}
      </div>
    </section>
  );
}
