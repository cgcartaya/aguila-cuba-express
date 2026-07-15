"use client";

import { useEffect, useState } from "react";

function Counter({
  value,
  prefix = "",
}: {
  value: number;
  prefix?: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;

    const duration = 1500;
    const increment = value / (duration / 16);

    const timer = setInterval(() => {
      start += increment;

      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <>
      {prefix}
      {count.toLocaleString()}
    </>
  );
}

export default function AnimatedDashboard() {
  return (
    <div className="overflow-hidden rounded-3xl bg-white text-slate-900 shadow-2xl">
      <div className="flex border-b p-5">
        <div className="h-3 w-3 rounded-full bg-red-400 mr-2" />
        <div className="h-3 w-3 rounded-full bg-yellow-400 mr-2" />
        <div className="h-3 w-3 rounded-full bg-green-400" />
      </div>

      <div className="grid grid-cols-4 gap-4 p-6">
        <Card
          title="Ventas"
          value={<Counter prefix="$" value={8250} />}
        />

        <Card
          title="Pedidos"
          value={<Counter value={248} />}
        />

        <Card
          title="Productos"
          value={<Counter value={540} />}
        />

        <Card
          title="Clientes"
          value={<Counter value={1320} />}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 px-6 pb-6">
        <div className="rounded-2xl bg-slate-50 p-5">
          <h4 className="font-semibold mb-6">
            Ventas últimos 7 días
          </h4>

          <div className="flex h-40 items-end gap-3">
            {[35, 70, 55, 90, 110, 85, 130].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-xl bg-gradient-to-t from-violet-700 to-fuchsia-500 animate-pulse"
                style={{
                  height: `${h}px`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-5">
          <h4 className="font-semibold mb-4">
            Pedidos recientes
          </h4>

          <div className="space-y-3">
            {[
              "María Pérez",
              "Carlos García",
              "Ana López",
              "Pedro Díaz",
            ].map((name, i) => (
              <div
                key={name}
                className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm"
              >
                <div>
                  <p className="font-medium">{name}</p>
                  <p className="text-sm text-slate-500">
                    Pedido #{1200 + i}
                  </p>
                </div>

                <span className="text-green-600 font-semibold">
                  ${30 + i * 15}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  value,
}: {
  title: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p className="mt-3 text-3xl font-bold">
        {value}
      </p>
    </div>
  );
}