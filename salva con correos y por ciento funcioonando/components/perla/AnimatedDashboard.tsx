"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Boxes,
  PackageCheck,
  ShoppingBag,
  Users,
} from "lucide-react";

type Metric = {
  label: string;
  value: number;
  prefix?: string;
  icon: React.ElementType;
};

const INITIAL_METRICS: Metric[] = [
  { label: "Ventas", value: 8250, prefix: "$", icon: BarChart3 },
  { label: "Pedidos", value: 248, icon: ShoppingBag },
  { label: "Productos", value: 540, icon: Boxes },
  { label: "Clientes", value: 1320, icon: Users },
];

export default function AnimatedDashboard() {
  const [metrics, setMetrics] = useState(INITIAL_METRICS);
  const [pulseIndex, setPulseIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMetrics((current) =>
        current.map((metric, index) => ({
          ...metric,
          value:
            metric.value +
            (index === 0
              ? Math.floor(Math.random() * 90) + 20
              : Math.floor(Math.random() * 6) + 1),
        }))
      );
      setPulseIndex((current) => (current + 1) % INITIAL_METRICS.length);
    }, 3200);

    return () => window.clearInterval(timer);
  }, []);

  const bars = useMemo(() => [34, 54, 43, 74, 61, 88, 105], []);

  return (
    <div className="h-full bg-white text-slate-900">
      <WindowHeader title="Panel administrativo" />

      <div className="grid h-[calc(100%-58px)] grid-cols-[78px_1fr] sm:grid-cols-[112px_1fr]">
        <aside className="bg-[#0d1530] px-3 py-5 text-white">
          <div className="mb-5 flex items-center justify-center gap-2 sm:justify-start">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600">
              P
            </div>
            <span className="hidden text-sm font-black sm:inline">Perla</span>
          </div>

          <div className="space-y-2">
            {["Dashboard", "Productos", "Pedidos", "Inventario"].map(
              (item, index) => (
                <div
                  key={item}
                  className={`rounded-xl px-2 py-2 text-[10px] font-black sm:px-3 sm:text-xs ${
                    index === 0
                      ? "bg-gradient-to-r from-violet-600 to-fuchsia-600"
                      : "text-slate-400"
                  }`}
                >
                  {item}
                </div>
              )
            )}
          </div>
        </aside>

        <main className="overflow-hidden bg-slate-50 p-3 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-600">
                Resumen en tiempo real
              </p>
              <h3 className="text-lg font-black sm:text-xl">Dashboard</h3>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black text-emerald-700">
              ● En vivo
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <div
                  key={metric.label}
                  className={`rounded-2xl bg-white p-3 shadow-sm transition-all duration-500 ${
                    pulseIndex === index
                      ? "-translate-y-1 ring-2 ring-violet-300"
                      : ""
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500">
                      {metric.label}
                    </span>
                    <Icon size={14} className="text-violet-600" />
                  </div>
                  <p className="text-lg font-black sm:text-xl">
                    {metric.prefix}
                    {metric.value.toLocaleString()}
                  </p>
                  <p className="mt-1 text-[9px] font-black text-emerald-600">
                    +{index === 0 ? "24.5" : "12.8"}%
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[1.08fr_.92fr]">
            <section className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black">Ventas recientes</p>
                <span className="text-[9px] font-black text-violet-600">
                  Últimos 7 días
                </span>
              </div>

              <div className="mt-5 flex h-36 items-end gap-2">
                {bars.map((height, index) => (
                  <div key={index} className="flex flex-1 items-end">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-violet-700 via-violet-500 to-fuchsia-400 transition-all duration-1000"
                      style={{
                        height: `${height}px`,
                        animation: `dashboardBar 1.3s ease-out ${
                          index * 90
                        }ms both`,
                      }}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <PackageCheck size={16} className="text-violet-600" />
                <p className="text-xs font-black">Pedidos recientes</p>
              </div>

              <div className="space-y-2">
                {[
                  ["María Pérez", "$30", "Entregado"],
                  ["Carlos García", "$45", "En camino"],
                  ["Ana López", "$60", "Confirmado"],
                  ["Pedro Díaz", "$75", "Nuevo"],
                ].map(([name, price, status], index) => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                    style={{
                      animation: `dashboardOrder .55s ease-out ${
                        index * 110
                      }ms both`,
                    }}
                  >
                    <div>
                      <p className="text-[10px] font-black sm:text-xs">{name}</p>
                      <p className="text-[8px] font-bold text-slate-400">
                        Pedido #{1200 + index}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-emerald-600">
                        {price}
                      </p>
                      <p className="text-[7px] font-bold text-slate-400">
                        {status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>

      <style jsx>{`
        @keyframes dashboardBar {
          from {
            height: 0;
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes dashboardOrder {
          from {
            transform: translateX(18px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

function WindowHeader({ title }: { title: string }) {
  return (
    <div className="flex h-[58px] items-center justify-between border-b border-slate-200 bg-white px-5">
      <div className="flex gap-2">
        <span className="h-3 w-3 rounded-full bg-red-400" />
        <span className="h-3 w-3 rounded-full bg-yellow-400" />
        <span className="h-3 w-3 rounded-full bg-green-400" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        {title}
      </p>
    </div>
  );
}
