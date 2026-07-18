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
  const tones = {
    navy: "from-[#061b3a] to-[#123d78] text-white",
    blue: "from-blue-600 to-indigo-600 text-white",
    emerald: "from-emerald-500 to-teal-600 text-white",
    amber: "from-amber-400 to-orange-500 text-slate-950",
    rose: "from-rose-500 to-red-600 text-white",
    violet: "from-violet-500 to-purple-700 text-white",
  };

  return (
    <article
      className={`relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br p-5 shadow-lg ${tones[tone]}`}
    >
      <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10" />
      <div className="absolute -bottom-10 -left-8 h-28 w-28 rounded-full bg-white/5" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            {icon}
          </div>

          {trend && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold">
              {trend.positive === false ? (
                <ArrowDownRight size={14} />
              ) : (
                <ArrowUpRight size={14} />
              )}
              {trend.value}
            </span>
          )}
        </div>

        <p className="mt-5 text-sm font-semibold opacity-80">{label}</p>
        <p className="mt-1 text-3xl font-extrabold tracking-tight">{value}</p>
        <p className="mt-2 text-xs font-medium opacity-70">{helper}</p>
      </div>
    </article>
  );
}
