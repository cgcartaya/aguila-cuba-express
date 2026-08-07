"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart3, Check, PackageCheck, Plane, Truck, UsersRound } from "lucide-react";

const SCENES = [
  { id: "rutas", label: "Rutas en vivo" },
  { id: "numeros", label: "En números" },
] as const;

type SceneId = (typeof SCENES)[number]["id"];

export default function AguilaShowcase() {
  const [activeScene, setActiveScene] = useState<SceneId>("rutas");
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setActiveScene((current) => (current === "rutas" ? "numeros" : "rutas"));
    }, 6000);
    return () => window.clearInterval(timer);
  }, [paused]);

  return (
    <div
      className="relative mx-auto w-full max-w-[540px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="pointer-events-none absolute -inset-8 rounded-full bg-[#d7a13f]/15 blur-3xl" />
      <div className="relative overflow-hidden rounded-[34px] border border-white/15 bg-white/[0.06] p-3 shadow-[0_40px_110px_rgba(13,27,48,.4)] backdrop-blur-2xl sm:p-4">
        <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        <div className="relative min-h-[580px] overflow-hidden rounded-[26px] border border-white/10 bg-[#0d1b30] sm:min-h-[600px]">
          <WindowHeader badge={activeScene === "rutas" ? "RED EN VIVO" : "ESTADÍSTICAS"} />
          <Scene visible={activeScene === "rutas"}>
            <RoutesScene />
          </Scene>
          <Scene visible={activeScene === "numeros"}>
            <NumbersScene />
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
              activeScene === scene.id ? "w-10 bg-[#c31f2e]" : "w-2.5 bg-white/25 hover:bg-white/45"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function Scene({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`absolute inset-0 top-[57px] transition-all duration-700 ease-out ${
        visible ? "translate-x-0 scale-100 opacity-100" : "pointer-events-none translate-x-6 scale-[0.985] opacity-0"
      }`}
    >
      {children}
    </div>
  );
}

function WindowHeader({ badge }: { badge: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-white/10 px-5 py-4 sm:px-6">
      <div className="flex shrink-0 items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#c31f2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#d7a13f]" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
      </div>
      <p className="min-w-0 flex-1 truncate px-2 text-center text-xs font-black uppercase tracking-[0.16em] text-white/60">Aguila Express USA</p>
      <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-[10px] font-black text-white/80">{badge}</span>
    </div>
  );
}

// Live-ops radar instead of literal cartography: concentric range rings around
// the Miami hub, straight routes out to each destination, a rotating sweep for
// motion. This is an honest network diagram, not a map — no risk of looking
// like a wrong or sloppy coastline.
const ROUTES = [
  { id: "r1", x: 96, y: 178, dest: "CDMX", dur: "3.4s", begin: "0s" },
  { id: "r2", x: 300, y: 150, dest: "Sto. Domingo", dur: "3s", begin: "1s" },
  { id: "r3", x: 200, y: 78, dest: "Bogotá", dur: "3.8s", begin: "2s" },
];
const HUB = { x: 200, y: 300 };

function RoutesScene() {
  return (
    <div className="flex h-full flex-col text-white">
      <div className="px-5 pt-5 sm:px-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d7a13f]">Ahora mismo</p>
        <h3 className="mt-1 text-2xl font-black leading-tight sm:text-[1.7rem]">3 rutas activas saliendo de Miami</h3>
        <p className="mt-1.5 text-sm font-semibold text-white/55">Cada envío sale con seguimiento activo, sin importar el destino.</p>
      </div>

      <div className="relative mt-2 h-[300px] px-4 sm:h-[320px]">
        <svg viewBox="0 0 400 400" className="h-full w-full" role="img" aria-label="Radar animado de rutas de envío activas">
          {/* Range rings around the hub */}
          {[60, 120, 180].map((r) => (
            <circle key={r} cx={HUB.x} cy={HUB.y} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="1" />
          ))}

          {/* Rotating sweep */}
          <g style={{ transformOrigin: `${HUB.x}px ${HUB.y}px`, animation: "sweep 5s linear infinite" }}>
            <path d={`M${HUB.x},${HUB.y} L${HUB.x},${HUB.y - 180} A180,180 0 0,1 ${HUB.x + 46},${HUB.y - 174} Z`} fill="url(#sweepFade)" />
          </g>
          <defs>
            <linearGradient id="sweepFade" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#d7a13f" stopOpacity="0" />
              <stop offset="100%" stopColor="#d7a13f" stopOpacity="0.22" />
            </linearGradient>
          </defs>

          {/* Straight routes hub -> destination */}
          {ROUTES.map((route) => (
            <line key={route.id} x1={HUB.x} y1={HUB.y} x2={route.x} y2={route.y} stroke="rgba(255,255,255,.22)" strokeWidth="1.4" strokeDasharray="1 6" strokeLinecap="round" />
          ))}

          {/* Hub: Miami */}
          <circle cx={HUB.x} cy={HUB.y} r="6" fill="#c31f2e" />
          <circle cx={HUB.x} cy={HUB.y} r="6" fill="#c31f2e" opacity="0.5">
            <animate attributeName="r" values="6;16;6" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0;0.5" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <text x={HUB.x} y={HUB.y + 22} textAnchor="middle" fontSize="11" fontWeight="900" fill="#f6f1e4">MIA</text>

          {/* Destinations */}
          {ROUTES.map((route, index) => (
            <g key={route.dest}>
              <circle cx={route.x} cy={route.y} r="4.5" fill="#d7a13f" />
              <circle cx={route.x} cy={route.y} r="4.5" fill="#d7a13f" opacity="0.5">
                <animate attributeName="r" values="4.5;12;4.5" dur="2s" begin={`${index * 0.6}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" begin={`${index * 0.6}s`} repeatCount="indefinite" />
              </circle>
              <text x={route.x} y={route.y - 12} textAnchor="middle" fontSize="10" fontWeight="700" fill="rgba(255,255,255,.8)">
                {route.dest}
              </text>
            </g>
          ))}

          {/* Planes traveling each straight route */}
          {ROUTES.map((route) => (
            <path key={`plane-${route.id}`} d="M0,-4 L4,3 L0,1.4 L-4,3 Z" fill="#f6f1e4">
              <animateMotion dur={route.dur} begin={route.begin} repeatCount="indefinite" rotate="auto" path={`M${HUB.x},${HUB.y} L${route.x},${route.y}`} />
            </path>
          ))}
        </svg>
        <style jsx>{`
          @keyframes sweep {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-white/10 px-5 py-4 text-xs font-bold text-white/55 sm:px-6">
        <span className="inline-flex items-center gap-2">
          <Plane size={14} className="text-[#d7a13f]" /> Salidas diarias
        </span>
        <span className="inline-flex items-center gap-2">
          <PackageCheck size={14} className="text-[#d7a13f]" /> Rastreo en cada ruta
        </span>
      </div>
    </div>
  );
}

function NumbersScene() {
  const stats = [
    { label: "Ventas del mes", value: 12480, prefix: "$", icon: BarChart3, step: [15, 60] as [number, number] },
    { label: "Envíos activos", value: 84, prefix: "", icon: Truck, step: [1, 2] as [number, number] },
    { label: "Clientes atendidos", value: 320, prefix: "", icon: UsersRound, step: [1, 3] as [number, number] },
    { label: "Entregados hoy", value: 41, prefix: "", icon: Check, step: [1, 1] as [number, number] },
  ];
  const bars = [42, 64, 53, 78, 69, 91, 76];

  return (
    <div className="h-full text-white">
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d7a13f]">Resumen operativo</p>
            <h3 className="mt-2 text-2xl font-black">Todo se mueve, en tiempo real</h3>
          </div>
          <div className="rounded-2xl bg-[#c31f2e]/20 p-3 text-[#f0a3a9]">
            <BarChart3 size={22} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {stats.map((stat, index) => (
            <CounterCard key={stat.label} {...stat} delay={index * 120} />
          ))}
        </div>

        <div className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.055] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black">Actividad de la semana</p>
              <p className="mt-1 text-xs font-semibold text-white/55">+18.4% frente a la semana anterior</p>
            </div>
            <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-300">En crecimiento</span>
          </div>
          <div className="mt-6 flex h-28 items-end gap-2 sm:gap-3">
            {bars.map((height, index) => (
              <div key={index} className="flex h-full flex-1 items-end rounded-t-xl bg-white/5">
                <div
                  className="w-full origin-bottom animate-[grow_1.2s_ease-out_forwards] rounded-t-xl bg-gradient-to-t from-[#c31f2e] to-[#e0525f]"
                  style={{ height: `${height}%`, animationDelay: `${index * 90}ms` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes grow {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}

function CounterCard({
  label,
  value,
  prefix,
  icon: Icon,
  delay,
  step,
}: {
  label: string;
  value: number;
  prefix: string;
  icon: typeof Truck;
  delay: number;
  step: [number, number];
}) {
  const [display, setDisplay] = useState(0);
  const liveIntervalRef = useRef<number | undefined>(undefined);

  // Initial count-up from 0 to the baseline value.
  useEffect(() => {
    let frame = 0;
    const start = window.setTimeout(() => {
      const timer = window.setInterval(() => {
        frame += 1;
        setDisplay(Math.round((value * frame) / 24));
        if (frame >= 24) window.clearInterval(timer);
      }, 35);
    }, delay);
    return () => window.clearTimeout(start);
  }, [delay, value]);

  // Once settled, keep the number gently ticking upward every few seconds
  // so the dashboard reads as live instead of a one-time animation.
  useEffect(() => {
    const settleDelay = delay + 24 * 35 + 400;
    const settleTimeout = window.setTimeout(() => {
      const [min, max] = step;
      liveIntervalRef.current = window.setInterval(() => {
        const delta = min + Math.round(Math.random() * (max - min));
        setDisplay((current) => current + delta);
      }, 2600 + Math.random() * 1600);
    }, settleDelay);
    return () => {
      window.clearTimeout(settleTimeout);
      if (liveIntervalRef.current) window.clearInterval(liveIntervalRef.current);
    };
  }, [delay, step]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
      <div className="flex items-center justify-between">
        <Icon size={18} className="text-[#d7a13f]" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
      </div>
      <p className="mt-4 text-2xl font-black tabular-nums sm:text-3xl">
        {prefix}
        {display.toLocaleString("en-US")}
      </p>
      <p className="mt-1 text-xs font-bold text-white/55">{label}</p>
    </div>
  );
}
