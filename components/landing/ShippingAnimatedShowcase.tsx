"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  MapPin,
  PackageCheck,
  Plane,
  Truck,
  UserRound,
  UsersRound,
} from "lucide-react";

const SCENES = [
  { id: "tracking", label: "Tracking" },
  { id: "shipment", label: "Crear envío" },
  { id: "dashboard", label: "Dashboard" },
] as const;

type SceneId = (typeof SCENES)[number]["id"];

type ShippingAnimatedShowcaseProps = {
  agencyName: string;
  trackingPrefix?: string;
  accentClassName?: string;
  accentSoftClassName?: string;
};

export default function ShippingAnimatedShowcase({
  agencyName,
  trackingPrefix = "ACE",
  accentClassName = "from-red-600 to-red-500",
  accentSoftClassName = "bg-red-500/15 text-red-200",
}: ShippingAnimatedShowcaseProps) {
  const [activeScene, setActiveScene] = useState<SceneId>("tracking");
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setActiveScene((current) => {
        const index = SCENES.findIndex((scene) => scene.id === current);
        return SCENES[(index + 1) % SCENES.length].id;
      });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [paused]);

  useEffect(() => {
    const onVisibilityChange = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  return (
    <div
      className="relative mx-auto w-full max-w-[690px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute -inset-8 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-[34px] border border-white/15 bg-white/[0.07] p-3 shadow-[0_45px_130px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-5">
        <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
        <div className="relative min-h-[510px] overflow-hidden rounded-[27px] border border-white/10 bg-[#07162f] sm:min-h-[540px]">
          <Scene visible={activeScene === "tracking"}>
            <TrackingScene agencyName={agencyName} trackingPrefix={trackingPrefix} accentClassName={accentClassName} accentSoftClassName={accentSoftClassName} />
          </Scene>
          <Scene visible={activeScene === "shipment"}>
            <ShipmentScene agencyName={agencyName} accentClassName={accentClassName} />
          </Scene>
          <Scene visible={activeScene === "dashboard"}>
            <DashboardScene agencyName={agencyName} accentClassName={accentClassName} accentSoftClassName={accentSoftClassName} />
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
                ? `w-10 bg-gradient-to-r ${accentClassName}`
                : "w-2.5 bg-white/25 hover:bg-white/45"
            }`}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute -right-2 top-20 hidden rounded-2xl border border-white/15 bg-white/95 p-4 text-slate-950 shadow-2xl xl:block">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">Operación conectada</p>
        <p className="mt-1 text-sm font-black">Landing + tracking + ERP</p>
      </div>
      <style jsx global>{`
        @keyframes fieldIn { from { opacity: 0; transform: translateX(22px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes barGrow { from { transform: scaleY(0); opacity: .35; } to { transform: scaleY(1); opacity: 1; } }
        @keyframes grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
      `}</style>
    </div>
  );
}

function Scene({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return (
    <div className={`absolute inset-0 transition-all duration-700 ease-out ${visible ? "translate-x-0 scale-100 opacity-100" : "pointer-events-none translate-x-8 scale-[0.985] opacity-0"}`}>
      {children}
    </div>
  );
}

function WindowHeader({ agencyName, badge }: { agencyName: string; badge: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
      </div>
      <p className="truncate px-3 text-xs font-black uppercase tracking-[0.16em] text-blue-100/75">{agencyName}</p>
      <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black text-white/80">{badge}</span>
    </div>
  );
}

function TrackingScene({ agencyName, trackingPrefix, accentClassName, accentSoftClassName }: ShippingAnimatedShowcaseProps) {
  const steps = [
    { label: "Recibido", icon: ClipboardCheck },
    { label: "En tránsito", icon: Plane },
    { label: "Llegó a Cuba", icon: MapPin },
    { label: "Entregado", icon: PackageCheck },
  ];

  return (
    <div className="h-full text-white">
      <WindowHeader agencyName={agencyName} badge="RASTREO EN VIVO" />
      <div className="p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">Código de rastreo</p>
            <h3 className="mt-2 text-2xl font-black sm:text-3xl">{trackingPrefix}-70F9F815</h3>
            <p className="mt-2 text-sm font-semibold text-blue-100/65">Miami → Cienfuegos, Cuba</p>
          </div>
          <div className={`rounded-2xl px-3 py-2 text-xs font-black ${accentSoftClassName}`}>Actualizado ahora</div>
        </div>

        <div className="mt-7 rounded-[24px] border border-white/10 bg-white/[0.055] p-4 sm:p-5">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.label} className="relative flex min-h-[82px] gap-4 last:min-h-0">
                {index < steps.length - 1 && <div className="absolute left-[21px] top-11 h-[45px] w-0.5 overflow-hidden bg-white/10"><div className={`h-full w-full origin-top animate-[grow_1.3s_ease-out_forwards] bg-gradient-to-b ${accentClassName}`} /></div>}
                <div className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${accentClassName} shadow-lg`}><Icon size={20} /></div>
                <div className="flex flex-1 items-center justify-between border-b border-white/10 pb-5 last:border-0 last:pb-0">
                  <div>
                    <p className="font-black">{step.label}</p>
                    <p className="mt-1 text-xs font-semibold text-blue-100/55">{index === 0 ? "Paquete registrado" : index === 1 ? "Procesando ruta internacional" : index === 2 ? "Recibido en almacén" : "Entrega confirmada"}</p>
                  </div>
                  <Check size={18} className="text-emerald-400" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ShipmentScene({ agencyName, accentClassName }: ShippingAnimatedShowcaseProps) {
  const fields = [
    ["Cliente", "Carlos García", UserRound],
    ["Destinatario", "María Hernández", UsersRound],
    ["Peso", "10 lb", PackageCheck],
    ["Destino", "Cienfuegos", MapPin],
    ["Total", "$60.00", CircleDollarSign],
  ] as const;

  return (
    <div className="h-full text-white">
      <WindowHeader agencyName={agencyName} badge="NUEVO ENVÍO" />
      <div className="p-5 sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">Creación inteligente</p><h3 className="mt-2 text-2xl font-black">Registra un envío en segundos</h3></div>
          <Truck className="hidden text-blue-300 sm:block" size={30} />
        </div>
        <div className="mt-6 space-y-3">
          {fields.map(([label, value, Icon], index) => (
            <div key={label} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 opacity-0 animate-[fieldIn_.5s_ease-out_forwards]" style={{ animationDelay: `${index * 550}ms` }}>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accentClassName}`}><Icon size={19} /></div>
              <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-200/60">{label}</p><p className="mt-1 truncate font-black">{value}</p></div>
              <Check size={17} className="text-emerald-400" />
            </div>
          ))}
        </div>
        <div className={`mt-5 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${accentClassName} px-5 py-4 font-black shadow-xl`}><PackageCheck size={20} /> Envío creado correctamente <ChevronRight size={18} /></div>
      </div>
    </div>
  );
}

function DashboardScene({ agencyName, accentClassName, accentSoftClassName }: ShippingAnimatedShowcaseProps) {
  const stats = useMemo(() => [
    ["Envíos", 248, PackageCheck],
    ["Clientes", 186, UsersRound],
    ["Entregados", 193, Check],
    ["En reparto", 27, Truck],
  ] as const, []);
  const bars = [42, 64, 53, 78, 69, 91, 76];

  return (
    <div className="h-full text-white">
      <WindowHeader agencyName={agencyName} badge="DASHBOARD" />
      <div className="p-5 sm:p-7">
        <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">Resumen operativo</p><h3 className="mt-2 text-2xl font-black">Todo bajo control</h3></div><div className={`rounded-2xl p-3 ${accentSoftClassName}`}><BarChart3 size={22} /></div></div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {stats.map(([label, value, Icon], index) => <CounterCard key={label} label={label} value={value} icon={Icon} delay={index * 100} />)}
        </div>
        <div className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.055] p-5">
          <div className="flex items-center justify-between"><div><p className="font-black">Operaciones de la semana</p><p className="mt-1 text-xs font-semibold text-blue-100/55">+18.4% frente a la semana anterior</p></div><span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-300">En crecimiento</span></div>
          <div className="mt-6 flex h-32 items-end gap-2 sm:gap-3">
            {bars.map((height, index) => <div key={index} className="flex h-full flex-1 items-end rounded-t-xl bg-white/5"><div className={`w-full origin-bottom rounded-t-xl bg-gradient-to-t ${accentClassName} animate-[barGrow_1.2s_ease-out_forwards]`} style={{ height: `${height}%`, animationDelay: `${index * 90}ms` }} /></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

function CounterCard({ label, value, icon: Icon, delay }: { label: string; value: number; icon: typeof Truck; delay: number }) {
  const [display, setDisplay] = useState(0);
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

  return <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4"><div className="flex items-center justify-between"><Icon size={18} className="text-blue-300" /><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /></div><p className="mt-4 text-3xl font-black">{display}</p><p className="mt-1 text-xs font-bold text-blue-100/55">{label}</p></div>;
}
