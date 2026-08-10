"use client";

import { useEffect, useState } from "react";
import AnimatedCart from "./AnimatedCart";
import AnimatedDashboard from "./AnimatedDashboard";
import AnimatedOrder from "./AnimatedOrder";

const SCENES = [
  { id: "dashboard", label: "Dashboard" },
  { id: "cart", label: "Carrito" },
  { id: "order", label: "Pedidos" },
] as const;

type SceneId = (typeof SCENES)[number]["id"];

export default function AnimatedShowcase() {
  const [activeScene, setActiveScene] = useState<SceneId>("dashboard");
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;

    const timer = window.setInterval(() => {
      setActiveScene((current) => {
        const index = SCENES.findIndex((scene) => scene.id === current);
        return SCENES[(index + 1) % SCENES.length].id;
      });
    }, 6000);

    return () => window.clearInterval(timer);
  }, [paused]);

  useEffect(() => {
    const handleVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  return (
    <div
      className="relative mx-auto w-full max-w-[710px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.055] p-3 shadow-[0_40px_120px_rgba(44,15,98,0.55)] backdrop-blur-xl sm:p-5">
        <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/80 to-transparent" />

        <div className="relative min-h-[500px] overflow-hidden rounded-[27px] border border-white/10 bg-[#0b1020] sm:min-h-[525px]">
          <Scene visible={activeScene === "dashboard"}>
            <AnimatedDashboard />
          </Scene>

          <Scene visible={activeScene === "cart"}>
            <AnimatedCart />
          </Scene>

          <Scene visible={activeScene === "order"}>
            <AnimatedOrder />
          </Scene>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-2">
        {SCENES.map((scene) => (
          <button
            key={scene.id}
            type="button"
            onClick={() => setActiveScene(scene.id)}
            aria-label={`Mostrar ${scene.label}`}
            className={`h-2.5 rounded-full transition-all duration-500 ${
              activeScene === scene.id
                ? "w-10 bg-gradient-to-r from-fuchsia-500 to-violet-500"
                : "w-2.5 bg-white/25 hover:bg-white/45"
            }`}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute -right-3 top-20 hidden rounded-2xl border border-white/10 bg-white/95 p-4 text-slate-900 shadow-2xl lg:block">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-600">
          Sistema conectado
        </p>
        <p className="mt-1 text-sm font-black">Inventario + ventas + WhatsApp</p>
      </div>
    </div>
  );
}

function Scene({
  visible,
  children,
}: {
  visible: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`absolute inset-0 transition-all duration-700 ease-out ${
        visible
          ? "pointer-events-auto translate-x-0 scale-100 opacity-100"
          : "pointer-events-none translate-x-8 scale-[0.985] opacity-0"
      }`}
    >
      {children}
    </div>
  );
}
