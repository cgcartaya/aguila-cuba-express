"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Loader2,
  MapPin,
  Navigation,
  Search,
  Truck,
} from "lucide-react";

type PublicCity = { name: string; latitude: number | null; longitude: number | null; order: number };
type PublicRoute = {
  id: string;
  name: string;
  route_date: string;
  status: "published" | "in_progress";
  public_summary: string | null;
  color: string | null;
  cities: PublicCity[];
};
type CoverageCity = { name: string; zoneName: string | null; zoneColor: string | null };
type PublicPayload = { routes: PublicRoute[]; coverageCities: CoverageCity[] };

type MapPoint = PublicCity & { x: number; y: number };

function routeDate(value: string) {
  return new Intl.DateTimeFormat("es-US", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${value}T12:00:00`));
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function cityPoint(city: PublicCity, index: number, total: number) {
  if (city.latitude != null && city.longitude != null) {
    const x = 12 + ((city.longitude - -83.36) / (-78.45 - -83.36)) * 76;
    const y = 14 + ((35.22 - city.latitude) / (35.22 - 32.03)) * 70;
    return { x: Math.max(10, Math.min(90, x)), y: Math.max(12, Math.min(86, y)) };
  }

  const fallback = [
    { x: 22, y: 30 },
    { x: 38, y: 48 },
    { x: 61, y: 29 },
    { x: 76, y: 48 },
    { x: 56, y: 69 },
    { x: 31, y: 72 },
  ];
  return fallback[index] || { x: 18 + (index * 64) / Math.max(1, total - 1), y: index % 2 ? 55 : 35 };
}

function smoothPath(points: MapPoint[]) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const midX = (previous.x + current.x) / 2;
    path += ` C ${midX} ${previous.y}, ${midX} ${current.y}, ${current.x} ${current.y}`;
  }
  return path;
}

function openPickupPlanner(city?: string, routeId?: string) {
  window.dispatchEvent(new CustomEvent("open-pickup-planner", { detail: { city, routeId } }));
}

function RouteMap({ route }: { route: PublicRoute }) {
  const points: MapPoint[] = route.cities.map((city, index) => ({ ...city, ...cityPoint(city, index, route.cities.length) }));
  const path = smoothPath(points);
  const activeIndex = route.status === "in_progress" ? 0 : -1;

  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(219,234,254,.9),_transparent_42%),linear-gradient(135deg,#f8fafc_0%,#ffffff_55%,#eff6ff_100%)] p-4 sm:p-6">
      <div className="absolute inset-0 opacity-[.38]" style={{ backgroundImage: "linear-gradient(rgba(148,163,184,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.14) 1px, transparent 1px)", backgroundSize: "36px 36px" }} />

      <div className="absolute left-5 top-5 z-10 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-lg backdrop-blur">
        <p className="text-xs font-black uppercase tracking-[.15em] text-slate-400">Carolina del Sur</p>
        <p className="mt-1 inline-flex items-center gap-2 text-sm font-black text-slate-800">
          <span className={`h-2.5 w-2.5 rounded-full ${route.status === "in_progress" ? "animate-pulse bg-emerald-500" : "bg-amber-500"}`} />
          {route.status === "in_progress" ? "Ruta en recorrido" : "Ruta en preparación"}
        </p>
      </div>

      <div className="absolute right-5 top-5 z-10 hidden rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-lg backdrop-blur sm:block">
        <p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Recorrido</p>
        <p className="mt-1 text-sm font-black text-slate-800">{route.cities.length} ciudades</p>
      </div>

      <svg viewBox="0 0 100 100" className="relative z-[1] h-[370px] w-full" role="img" aria-label={`Recorrido planificado de ${route.name}`}>
        <defs>
          <filter id={`route-shadow-${route.id}`} x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity=".22" /></filter>
          <filter id={`truck-glow-${route.id}`} x="-100%" y="-100%" width="300%" height="300%"><feDropShadow dx="0" dy="1" stdDeviation="1.8" floodColor={route.color || "#dc2626"} floodOpacity=".55" /></filter>
          <linearGradient id={`state-fill-${route.id}`} x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#eef4fb" /><stop offset="100%" stopColor="#dbe7f5" /></linearGradient>
        </defs>

        <path d="M12 23 L24 12 L43 12 L55 19 L73 16 L91 30 L87 46 L93 57 L83 71 L65 78 L54 91 L38 84 L22 88 L10 73 L13 56 L7 43 Z" fill={`url(#state-fill-${route.id})`} stroke="#c4d1e1" strokeWidth="1.1" />
        <path d="M14 58 C25 54 29 64 41 60 S61 48 72 53 S82 65 89 60" fill="none" stroke="#cbd5e1" strokeWidth=".55" strokeDasharray="2 2" opacity=".8" />
        <path d="M18 32 C29 38 39 30 49 36 S70 44 84 35" fill="none" stroke="#cbd5e1" strokeWidth=".55" strokeDasharray="2 2" opacity=".8" />

        {points.length > 1 && (
          <>
            <path d={path} fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity=".96" />
            <path d={path} fill="none" stroke={route.color || "#dc2626"} strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={route.status === "published" ? "5 3" : "9 2"} className="route-path-flow" />
            <g filter={`url(#truck-glow-${route.id})`} className="route-truck">
              <circle r="4.3" fill="white" stroke={route.color || "#dc2626"} strokeWidth="1.2" />
              <text x="0" y="1.55" textAnchor="middle" fontSize="4.3">🚚</text>
              <animateMotion dur={route.status === "in_progress" ? "8s" : "13s"} repeatCount="indefinite" path={path} />
            </g>
          </>
        )}

        {points.map((point, index) => {
          const isActive = index === activeIndex;
          const isFirst = index === 0;
          return (
            <g key={`${point.name}-${index}`} transform={`translate(${point.x} ${point.y})`} filter={`url(#route-shadow-${route.id})`}>
              {isActive && <circle r="7.2" fill="none" stroke="#10b981" strokeWidth="1" className="route-ring" />}
              <circle r={isActive ? 5.2 : 4.6} fill={isActive ? "#10b981" : isFirst ? "#071d43" : route.color || "#dc2626"} stroke="white" strokeWidth="1.6" />
              {isActive ? <Check x={-2.1} y={-2.1} width={4.2} height={4.2} color="white" strokeWidth={4} /> : <text y="1.45" textAnchor="middle" fontSize="3.7" fontWeight="900" fill="white">{index + 1}</text>}
              <g transform="translate(0 7.2)">
                <rect x="-13" y="0" width="26" height="7.6" rx="3.8" fill="white" opacity=".98" />
                <text y="5" textAnchor="middle" fontSize="3.05" fontWeight="800" fill="#0f172a">{point.name.slice(0, 16)}</text>
              </g>
            </g>
          );
        })}
      </svg>

      <div className="absolute bottom-12 left-5 z-10 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-md backdrop-blur">
        <p className="text-[10px] font-black uppercase tracking-[.15em] text-slate-400">{route.status === "in_progress" ? "Próxima parada" : "Primera parada"}</p>
        <p className="mt-1 flex items-center gap-2 text-sm font-black text-slate-800"><MapPin size={14} className="text-red-500" /> {route.cities[0]?.name || "Por confirmar"}</p>
      </div>

      <p className="absolute bottom-4 left-5 right-5 z-10 text-center text-[11px] font-bold text-slate-400">Recorrido planificado. No representa la ubicación GPS del conductor.</p>
    </div>
  );
}

export default function UpcomingPickupRoutes({ storeSlug = "yoyo-envios" }: { storeSlug?: string }) {
  const [payload, setPayload] = useState<PublicPayload>({ routes: [], coverageCities: [] });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    fetch(`/api/pickups/routes/public?store=${encodeURIComponent(storeSlug)}`)
      .then((response) => response.json())
      .then((result) => setPayload({ routes: result.routes || [], coverageCities: result.coverageCities || [] }))
      .finally(() => setLoading(false));
  }, [storeSlug]);

  const activeRoute = payload.routes.find((route) => route.status === "in_progress") || payload.routes[0];
  const match = useMemo(() => {
    if (!searched || !query.trim()) return null;
    const target = normalize(query);
    const route = payload.routes.find((item) => item.cities.some((city) => normalize(city.name) === target));
    const coverage = payload.coverageCities.find((city) => normalize(city.name) === target);
    return { route, coverage };
  }, [payload, query, searched]);

  if (loading) return <div className="mx-auto flex max-w-7xl items-center justify-center px-5 py-14 text-slate-500"><Loader2 className="mr-2 animate-spin" size={18} /> Cargando rutas y cobertura...</div>;

  return (
    <section id="proximas-rutas" className="overflow-hidden bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-black uppercase tracking-[.22em] text-red-600">Recogidas públicas</p>
          <h2 className="mt-4 text-4xl font-black leading-[1.02] tracking-tight sm:text-5xl">Mira nuestra ruta y descubre cuándo pasamos por tu ciudad.</h2>
          <p className="mt-5 text-base font-semibold leading-7 text-slate-500 sm:text-lg sm:leading-8">Las ciudades se actualizan automáticamente cuando YOYO publica o inicia una ruta. Nunca mostramos direcciones de clientes.</p>
        </div>

        {activeRoute ? (
          <div className="mt-12 grid min-w-0 gap-7 lg:grid-cols-[1.15fr_.85fr] lg:items-stretch">
            <RouteMap route={activeRoute} />
            <article className="relative min-w-0 overflow-hidden rounded-[2rem] bg-[#071d43] p-6 text-white shadow-[0_25px_80px_rgba(7,29,67,.22)] sm:p-8">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-400/15" />
              <div className="relative">
                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-blue-200"><CalendarDays size={16} /> {routeDate(activeRoute.route_date)}</p>
                <h3 className="mt-3 break-words text-3xl font-black sm:text-4xl">{activeRoute.name}</h3>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[.06] p-3"><p className="text-[10px] font-black uppercase tracking-[.15em] text-blue-200/70">Ciudades</p><p className="mt-1 text-xl font-black">{activeRoute.cities.length}</p></div>
                  <div className="rounded-2xl border border-white/10 bg-white/[.06] p-3"><p className="text-[10px] font-black uppercase tracking-[.15em] text-blue-200/70">Estado</p><p className="mt-1 text-sm font-black">{activeRoute.status === "in_progress" ? "En recorrido" : "Abierta"}</p></div>
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.06] p-4">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${activeRoute.status === "in_progress" ? "bg-emerald-500" : "bg-amber-500"}`}><Truck size={22} /></span>
                  <div className="min-w-0"><p className="font-black">{activeRoute.status === "in_progress" ? "En recorrido" : "Ruta en preparación"}</p><p className="text-sm font-semibold text-blue-100/70">{activeRoute.status === "in_progress" ? "El recorrido programado ya comenzó." : "Todavía puedes solicitar una recogida."}</p></div>
                </div>

                <ol className="relative mt-6 space-y-0 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-white/15">
                  {activeRoute.cities.map((city, index) => {
                    const active = activeRoute.status === "in_progress" && index === 0;
                    return (
                      <li key={`${city.name}-${index}`} className="relative flex items-center gap-3 py-2.5">
                        <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-black ${active ? "border-emerald-300 bg-emerald-500 shadow-[0_0_0_5px_rgba(16,185,129,.14)]" : "border-white/10 bg-[#102b58]"}`}>{active ? <Truck size={14} /> : index + 1}</span>
                        <div className="min-w-0 flex-1"><p className="truncate font-black">{city.name}</p><p className="text-xs font-semibold text-blue-100/55">{active ? "Próxima parada" : index === 0 ? "Inicio del recorrido" : "Parada programada"}</p></div>
                        <MapPin size={15} className={active ? "text-emerald-300" : "text-red-300"} />
                      </li>
                    );
                  })}
                </ol>

                {activeRoute.public_summary && <p className="mt-5 border-t border-white/10 pt-5 font-semibold leading-7 text-blue-100/75">{activeRoute.public_summary}</p>}
                <button type="button" onClick={() => openPickupPlanner(undefined, activeRoute.id)} className="mt-7 inline-flex w-full min-w-0 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-4 text-center font-black transition hover:-translate-y-0.5 hover:bg-red-500">Reservar en esta ruta <ArrowRight size={18} /></button>
                <p className="mt-3 flex items-center justify-center gap-2 text-center text-xs font-semibold text-blue-100/55"><Clock3 size={13} /> Sujeto a disponibilidad de la ruta</p>
              </div>
            </article>
          </div>
        ) : (
          <div className="mt-12 rounded-[2rem] border border-slate-200 bg-slate-50 p-8 text-center"><Navigation className="mx-auto text-blue-700" /><h3 className="mt-3 text-2xl font-black">Próxima ruta por publicar</h3><p className="mt-2 font-semibold text-slate-500">Puedes comprobar la cobertura de tu ciudad y enviar una solicitud desde ahora.</p></div>
        )}

        <div className="mt-10 rounded-[2rem] border border-slate-200 bg-slate-50 p-5 sm:p-8">
          <div className="grid min-w-0 gap-7 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div className="min-w-0"><p className="text-xs font-black uppercase tracking-[.18em] text-blue-700">Cobertura inteligente</p><h3 className="mt-3 break-words text-3xl font-black">¿Recogemos en tu ciudad?</h3><p className="mt-3 font-semibold leading-7 text-slate-500">Escribe la ciudad y te diremos si está incluida en una ruta publicada o dentro de nuestra cobertura.</p></div>
            <div className="min-w-0">
              <form onSubmit={(event) => { event.preventDefault(); setSearched(true); }} className="flex min-w-0 flex-col gap-3 sm:flex-row">
                <label className="relative min-w-0 flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input value={query} onChange={(event) => { setQuery(event.target.value); setSearched(false); }} list="pickup-coverage-cities" placeholder="Ej. Greenville" className="h-14 w-full min-w-0 rounded-2xl border border-slate-200 bg-white pl-12 pr-4 font-bold outline-none focus:border-blue-400" /></label>
                <datalist id="pickup-coverage-cities">{payload.coverageCities.map((city) => <option key={city.name} value={city.name} />)}</datalist>
                <button className="h-14 w-full rounded-2xl bg-[#071d43] px-6 font-black text-white sm:w-auto">Comprobar ciudad</button>
              </form>

              {searched && query.trim() && match && (
                <div className={`mt-4 rounded-2xl border p-5 ${match.route || match.coverage ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                  {match.route ? <><p className="flex items-start gap-2 text-lg font-black text-emerald-800"><CheckCircle2 size={21} className="mt-0.5 shrink-0" /> <span>Sí, estaremos en {query.trim()}.</span></p><p className="mt-2 font-semibold text-emerald-700">{match.route.name} · {routeDate(match.route.route_date)} · {match.route.status === "in_progress" ? "En recorrido" : "Ruta en preparación"}</p><button type="button" onClick={() => openPickupPlanner(query.trim(), match.route?.id)} className="mt-4 inline-flex items-center gap-2 font-black text-red-600 hover:text-red-500">Reservar mi recogida <ArrowRight size={17} /></button></> : match.coverage ? <><p className="flex items-start gap-2 text-lg font-black text-emerald-800"><CheckCircle2 size={21} className="mt-0.5 shrink-0" /> <span>Sí, recogemos en {match.coverage.name}.</span></p><p className="mt-2 font-semibold text-emerald-700">{match.coverage.zoneName ? `Pertenece a ${match.coverage.zoneName}. ` : ""}Todavía no hay una ruta pública con fecha para esta ciudad.</p><button type="button" onClick={() => openPickupPlanner(match.coverage?.name)} className="mt-4 inline-flex items-center gap-2 font-black text-red-600 hover:text-red-500">Solicitar recogida <ArrowRight size={17} /></button></> : <><p className="flex items-start gap-2 text-lg font-black text-amber-900"><CircleAlert size={21} className="mt-0.5 shrink-0" /> <span>No encontramos una ruta publicada para {query.trim()}.</span></p><p className="mt-2 font-semibold text-amber-800">Envíanos la solicitud para confirmar si podemos agregarla al próximo recorrido.</p><button type="button" onClick={() => openPickupPlanner(query.trim())} className="mt-4 inline-flex items-center gap-2 font-black text-red-600 hover:text-red-500">Consultar recogida <ArrowRight size={17} /></button></>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .route-path-flow { animation: route-dash 1.25s linear infinite; }
        .route-ring { transform-box: fill-box; transform-origin: center; animation: route-ring 1.9s ease-out infinite; }
        @keyframes route-dash { to { stroke-dashoffset: -14; } }
        @keyframes route-ring { 0% { opacity: .9; transform: scale(.75); } 75%, 100% { opacity: 0; transform: scale(1.55); } }
        @media (prefers-reduced-motion: reduce) { .route-path-flow, .route-ring, .route-truck { animation: none !important; } }
      `}</style>
    </section>
  );
}
