"use client";

import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export default function OperationalMetricCard({
  label,
  value,
  helper,
  icon,
  tone = "navy",
  trend,
}: {
  label: string;
  value: string;
  helper: string;
  icon: ReactNode;
  tone?: "navy" | "blue" | "emerald" | "amber" | "rose" | "violet";
  trend?: {
    value: string;
    positive?: boolean;
  };
}) {
  // Mismo lenguaje visual que StatusOverview: tarjeta blanca neutra + una
  // sola insignia de color con significado (ámbar = atención, rosa =
  // dinero por cobrar, verde = facturado). El color queda para lo que
  // importa, no decorando toda la tarjeta.
  const badgeTones: Record<string, string> = {
    navy: "bg-slate-100 text-slate-700",
    blue: "bg-blue-100 text-blue-800",
    emerald: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    rose: "bg-rose-100 text-rose-700",
    violet: "bg-violet-100 text-violet-800",
  };

  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${badgeTones[tone]}`}>
          {icon}
        </div>

        {trend && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
              trend.positive === false ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {trend.positive === false ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
            {trend.value}
          </span>
        )}
      </div>

      <p className="mt-5 text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-xs font-medium text-slate-400">{helper}</p>
    </article>
  );
}
