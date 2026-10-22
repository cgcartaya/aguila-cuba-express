"use client";

import { ArrowRight, Headphones, Home, MapPinned, PackageCheck } from "lucide-react";
import { useEffect, useState } from "react";

const ROUTES = [
  "M164 122 C242 96 286 128 330 190 C376 254 472 244 572 326",
  "M176 286 C244 246 268 168 352 146 C436 124 490 178 590 210",
  "M220 342 C272 290 326 304 372 252 C418 202 484 116 570 126",
] as const;

const supportItems = [
  [Home, "Recogida a domicilio"],
  [Headphones, "Atención directa"],
  [PackageCheck, "Envíos a Cuba"],
] as const;

export default function YoyoMovementMap() {
  const [routeIndex, setRouteIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRouteIndex((current) => {
        const offset = 1 + Math.floor(Math.random() * (ROUTES.length - 1));
        return (current + offset) % ROUTES.length;
      });
    }, 12000);

    return () => window.clearInterval(interval);
  }, []);

  function openPickupPlanner() {
    window.dispatchEvent(new CustomEvent("open-pickup-planner"));
  }

  return (
    <section className="relative overflow-hidden bg-[#f7fbff] py-14 sm:py-20">
      <div className="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full bg-blue-100/70 blur-3xl" />
      <div className="relative mx-auto grid max-w-[1440px] items-center gap-10 px-5 sm:px-8 lg:grid-cols-[.78fr_1.22fr] lg:gap-12">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.24em] text-[#ed1438]">YOYO en movimiento</div>
          <h2 className="mt-5 max-w-2xl text-4xl font-black leading-[1.03] tracking-[-0.045em] text-[#071b3d] sm:text-5xl lg:text-6xl">
            Recorremos Carolina del Sur para estar más cerca de ti.
          </h2>
          <p className="mt-6 max-w-xl text-base font-medium leading-7 text-slate-600 sm:text-lg">
            Nuestra camioneta sigue en movimiento para recoger tus paquetes y prepararlos para su viaje a Cuba.
          </p>
          <button type="button" onClick={openPickupPlanner} className="mt-7 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-blue-700 px-7 py-4 text-sm font-black text-white shadow-[0_15px_35px_rgba(29,78,216,.2)] transition hover:-translate-y-0.5 hover:bg-blue-800 sm:w-auto">
            Solicitar recogida <ArrowRight className="h-5 w-5" />
          </button>

          <div className="mt-8 grid grid-cols-3 gap-3 border-t border-slate-200 pt-6">
            {supportItems.map(([Icon, label]) => (
              <div key={label} className="min-w-0">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-blue-700"><Icon className="h-5 w-5" /></span>
                <p className="mt-2 text-xs font-bold leading-5 text-[#071b3d] sm:text-sm">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-white p-3 shadow-[0_28px_70px_rgba(30,64,175,.12)] sm:p-5 lg:rounded-[2.5rem]">
          <div className="absolute right-5 top-5 z-10 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-[11px] font-black text-[#071b3d] shadow-md backdrop-blur sm:right-7 sm:top-7 sm:px-4 sm:text-xs">
            <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-70 motion-reduce:animate-none" /><span className="relative h-2.5 w-2.5 rounded-full bg-[#ed1438]" /></span>
            Siempre en movimiento
          </div>

          <svg viewBox="0 0 760 460" role="img" aria-labelledby="yoyo-map-title yoyo-map-description" className="h-auto w-full">
            <title id="yoyo-map-title">Mapa ilustrativo de Carolina del Sur con camioneta de YOYO Envíos</title>
            <desc id="yoyo-map-description">Una camioneta recorre trayectos decorativos que no representan rutas públicas reales.</desc>
            <defs>
              <linearGradient id="sc-land" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#eaf5ff" /><stop offset="1" stopColor="#c9e7ff" /></linearGradient>
              <filter id="sc-shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#1d4ed8" floodOpacity=".16" /></filter>
              <filter id="van-shadow" x="-60%" y="-100%" width="220%" height="300%"><feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#071b3d" floodOpacity=".25" /></filter>
              <clipPath id="sc-clip"><path d="M116 88 C170 42 252 42 318 58 L590 58 C610 94 626 133 654 165 C682 199 689 242 668 282 C645 326 596 350 548 373 C498 397 449 421 400 414 C338 405 304 358 256 337 C207 315 156 323 128 286 C104 254 111 218 91 184 C73 153 76 116 116 88 Z" /></clipPath>
            </defs>

            <path d="M116 88 C170 42 252 42 318 58 L590 58 C610 94 626 133 654 165 C682 199 689 242 668 282 C645 326 596 350 548 373 C498 397 449 421 400 414 C338 405 304 358 256 337 C207 315 156 323 128 286 C104 254 111 218 91 184 C73 153 76 116 116 88 Z" fill="url(#sc-land)" stroke="#8cc8f8" strokeWidth="4" filter="url(#sc-shadow)" />

            <g clipPath="url(#sc-clip)" fill="none" strokeLinecap="round">
              <path d="M84 150 C200 116 242 122 340 92 C449 59 552 106 669 120" stroke="#fff" strokeWidth="2" opacity=".75" />
              <path d="M98 232 C170 190 258 206 329 164 C424 108 513 176 664 187" stroke="#fff" strokeWidth="2" opacity=".72" />
              <path d="M112 292 C210 250 280 276 370 230 C469 180 540 248 668 244" stroke="#fff" strokeWidth="2" opacity=".72" />
              <path d="M176 76 C191 152 166 225 212 326" stroke="#fff" strokeWidth="2" opacity=".62" />
              <path d="M306 58 C294 138 326 222 286 350" stroke="#fff" strokeWidth="2" opacity=".62" />
              <path d="M470 61 C444 139 484 250 438 406" stroke="#fff" strokeWidth="2" opacity=".62" />
              <path d={ROUTES[0]} stroke="#0757bb" strokeWidth="7" opacity={routeIndex === 0 ? .95 : .18} />
              <path d={ROUTES[1]} stroke="#ed1438" strokeWidth="5" strokeDasharray="11 12" opacity={routeIndex === 1 ? .9 : .28} />
              <path d={ROUTES[2]} stroke="#0757bb" strokeWidth="5" strokeDasharray="4 13" opacity={routeIndex === 2 ? .9 : .22} />
            </g>

            {([[164,122,"#0757bb"],[590,210,"#ed1438"],[220,342,"#0757bb"]] as const).map(([cx, cy, color]) => (
              <g key={`${cx}-${cy}`}><circle cx={cx} cy={cy} r="13" fill="white" stroke={color} strokeWidth="5" /><circle cx={cx} cy={cy} r="4" fill={color} /></g>
            ))}

            <g key={routeIndex} filter="url(#van-shadow)" className="motion-reduce:hidden">
              <g transform="translate(-30 -18)">
                <rect x="2" y="4" width="43" height="26" rx="6" fill="white" stroke="#0757bb" strokeWidth="2" />
                <path d="M45 12 H56 L64 22 V30 H45 Z" fill="white" stroke="#0757bb" strokeWidth="2" />
                <path d="M49 14 H55 L60 21 H49 Z" fill="#bfe3ff" />
                <text x="9" y="21" fill="#ed1438" fontSize="10" fontWeight="900">YOYO</text>
                <circle cx="15" cy="32" r="5" fill="#071b3d" /><circle cx="53" cy="32" r="5" fill="#071b3d" />
              </g>
              <animateMotion path={ROUTES[routeIndex]} dur="12s" repeatCount="indefinite" rotate="auto" />
            </g>

            <g className="hidden motion-reduce:block" transform="translate(350 210)"><circle r="19" fill="#0757bb" /><path d="M-9 2 H6 M3-5 L10 2 L3 9" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></g>
          </svg>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-2 pb-2 pt-4 sm:px-4">
            <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-600"><span className="h-1.5 w-8 rounded-full bg-blue-700" /> Recorrido animado</span>
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500"><MapPinned className="h-4 w-4 text-red-500" /> Vista ilustrativa · No representa rutas reales</span>
          </div>
        </div>
      </div>
    </section>
  );
}
