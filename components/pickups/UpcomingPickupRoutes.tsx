"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
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

function routeDate(value: string) {
  return new Intl.DateTimeFormat("es-US", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${value}T12:00:00`));
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function cityPoint(city: PublicCity, index: number, total: number) {
  if (city.latitude != null && city.longitude != null) {
    // South Carolina bounds, converted to the viewBox used below.
    const x = 8 + ((city.longitude - -83.36) / (-78.45 - -83.36)) * 84;
    const y = 10 + ((35.22 - city.latitude) / (35.22 - 32.03)) * 78;
    return { x: Math.max(7, Math.min(93, x)), y: Math.max(8, Math.min(90, y)) };
  }
  const columns = Math.min(4, Math.max(2, total));
  return { x: 16 + (index % columns) * (68 / Math.max(1, columns - 1)), y: 24 + Math.floor(index / columns) * 27 };
}

function openPickupPlanner() {
  window.dispatchEvent(new CustomEvent("open-pickup-planner"));
}

function RouteMap({ route }: { route: PublicRoute }) {
  const points = route.cities.map((city, index) => ({ ...cityPoint(city, index, route.cities.length), city }));
  const path = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="relative min-h-[390px] overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 sm:p-6">
      <div className="absolute left-5 top-5 z-10 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-lg backdrop-blur">
        <p className="text-xs font-black uppercase tracking-[.15em] text-slate-400">Carolina del Sur</p>
        <p className="mt-1 inline-flex items-center gap-2 text-sm font-black text-slate-800">
          <span className={`h-2.5 w-2.5 rounded-full ${route.status === "in_progress" ? "animate-pulse bg-emerald-500" : "bg-amber-500"}`} />
          {route.status === "in_progress" ? "Ruta en recorrido" : "Ruta en preparación"}
        </p>
      </div>

      <svg viewBox="0 0 100 100" className="h-[350px] w-full" role="img" aria-label={`Recorrido planificado de ${route.name}`}>
        <defs>
          <filter id="route-shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity=".2" /></filter>
          <filter id="truck-glow" x="-80%" y="-80%" width="260%" height="260%"><feDropShadow dx="0" dy="1" stdDeviation="1.4" floodColor="#dc2626" floodOpacity=".45" /></filter>
        </defs>
        <path d="M12 23 L24 12 L43 12 L55 19 L73 16 L91 30 L87 46 L93 57 L83 71 L65 78 L54 91 L38 84 L22 88 L10 73 L13 56 L7 43 Z" fill="#eaf0f8" stroke="#cbd5e1" strokeWidth="1" />
        {points.length > 1 && (
          <>
            <polyline points={path} fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity=".9" />
            <polyline
              points={path}
              fill="none"
              stroke={route.color || "#dc2626"}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={route.status === "published" ? "4 3" : "7 2"}
              className="route-path-flow"
            />
            <g filter="url(#truck-glow)" className="route-truck">
              <circle r="3.9" fill="white" stroke={route.color || "#dc2626"} strokeWidth="1.2" />
              <text x="0" y="1.45" textAnchor="middle" fontSize="4">🚚</text>
              <animateMotion dur={route.status === "in_progress" ? "7s" : "11s"} repeatCount="indefinite" path={`M ${points.map((point) => `${point.x} ${point.y}`).join(" L ")}`} />
            </g>
          </>
        )}
        {points.map((point, index) => (
          <g key={`${point.city.name}-${index}`} transform={`translate(${point.x} ${point.y})`} filter="url(#route-shadow)">
            <circle r="4.5" fill={index === 0 ? "#071d43" : route.color || "#dc2626"} stroke="white" strokeWidth="1.5" className={route.status === "in_progress" ? "route-stop-pulse" : ""} style={{ animationDelay: `${index * 0.22}s` }} />
            <text y="1.4" textAnchor="middle" fontSize="3.8" fontWeight="900" fill="white">{index + 1}</text>
            <g transform="translate(0 7)"><rect x="-12" y="0" width="24" height="7" rx="3.5" fill="white" opacity=".96" /><text y="4.8" textAnchor="middle" fontSize="3.2" fontWeight="800" fill="#0f172a">{point.city.name.slice(0, 15)}</text></g>
          </g>
        ))}
      </svg>
      <p className="absolute bottom-4 left-5 right-5 text-center text-xs font-bold text-slate-400">Recorrido planificado. No representa la ubicación GPS del conductor.</p>
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
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-black uppercase tracking-[.22em] text-red-600">Recogidas públicas</p>
          <h2 className="mt-4 text-4xl font-black leading-[1.02] tracking-tight sm:text-5xl">Mira nuestra ruta y descubre cuándo pasamos por tu ciudad.</h2>
          <p className="mt-5 text-lg font-semibold leading-8 text-slate-500">Las ciudades se actualizan automáticamente cuando YOYO publica o inicia una ruta. Nunca mostramos direcciones de clientes.</p>
        </div>

        {activeRoute ? (
          <div className="mt-12 grid gap-7 lg:grid-cols-[1.15fr_.85fr] lg:items-stretch">
            <RouteMap route={activeRoute} />
            <article className="relative overflow-hidden rounded-[2rem] bg-[#071d43] p-7 text-white shadow-[0_25px_80px_rgba(7,29,67,.22)] sm:p-8">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-400/15" />
              <div className="relative">
                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-blue-200"><CalendarDays size={16} /> {routeDate(activeRoute.route_date)}</p>
                <h3 className="mt-3 text-3xl font-black sm:text-4xl">{activeRoute.name}</h3>
                <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.06] p-4">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${activeRoute.status === "in_progress" ? "bg-emerald-500" : "bg-amber-500"}`}><Truck size={22} /></span>
                  <div><p className="font-black">{activeRoute.status === "in_progress" ? "En recorrido" : "Ruta en preparación"}</p><p className="text-sm font-semibold text-blue-100/70">{activeRoute.status === "in_progress" ? "El recorrido programado ya comenzó." : "Todavía puedes solicitar una recogida."}</p></div>
                </div>
                <ol className="mt-6 space-y-3">
                  {activeRoute.cities.map((city, index) => <li key={`${city.name}-${index}`} className="flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black">{index + 1}</span><MapPin size={16} className="text-red-300" /><span className="font-black">{city.name}</span></li>)}
                </ol>
                {activeRoute.public_summary && <p className="mt-5 border-t border-white/10 pt-5 font-semibold leading-7 text-blue-100/75">{activeRoute.public_summary}</p>}
                <button type="button" onClick={openPickupPlanner} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 py-4 font-black transition hover:-translate-y-0.5 hover:bg-red-500">Solicitar recogida <ArrowRight size={18} /></button>
              </div>
            </article>
          </div>
        ) : (
          <div className="mt-12 rounded-[2rem] border border-slate-200 bg-slate-50 p-8 text-center"><Navigation className="mx-auto text-blue-700" /><h3 className="mt-3 text-2xl font-black">Próxima ruta por publicar</h3><p className="mt-2 font-semibold text-slate-500">Puedes comprobar la cobertura de tu ciudad y enviar una solicitud desde ahora.</p></div>
        )}

        <div className="mt-10 rounded-[2rem] border border-slate-200 bg-slate-50 p-6 sm:p-8">
          <div className="grid gap-7 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div><p className="text-xs font-black uppercase tracking-[.18em] text-blue-700">Cobertura inteligente</p><h3 className="mt-3 text-3xl font-black">¿Recogemos en tu ciudad?</h3><p className="mt-3 font-semibold leading-7 text-slate-500">Escribe la ciudad y te diremos si está incluida en una ruta publicada o dentro de nuestra cobertura.</p></div>
            <div>
              <form onSubmit={(event) => { event.preventDefault(); setSearched(true); }} className="flex flex-col gap-3 sm:flex-row">
                <label className="relative flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input value={query} onChange={(event) => { setQuery(event.target.value); setSearched(false); }} list="pickup-coverage-cities" placeholder="Ej. Greenville" className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 font-bold outline-none focus:border-blue-400" /></label>
                <datalist id="pickup-coverage-cities">{payload.coverageCities.map((city) => <option key={city.name} value={city.name} />)}</datalist>
                <button className="h-14 rounded-2xl bg-[#071d43] px-6 font-black text-white">Comprobar ciudad</button>
              </form>

              {searched && query.trim() && match && (
                <div className={`mt-4 rounded-2xl border p-5 ${match.route || match.coverage ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                  {match.route ? <><p className="flex items-center gap-2 text-lg font-black text-emerald-800"><CheckCircle2 size={21} /> Sí, estaremos en {query.trim()}.</p><p className="mt-2 font-semibold text-emerald-700">{match.route.name} · {routeDate(match.route.route_date)} · {match.route.status === "in_progress" ? "En recorrido" : "Ruta en preparación"}</p><button type="button" onClick={openPickupPlanner} className="mt-4 inline-flex items-center gap-2 font-black text-red-600 hover:text-red-500">Reservar mi recogida <ArrowRight size={17} /></button></> : match.coverage ? <><p className="flex items-center gap-2 text-lg font-black text-emerald-800"><CheckCircle2 size={21} /> Sí, recogemos en {match.coverage.name}.</p><p className="mt-2 font-semibold text-emerald-700">{match.coverage.zoneName ? `Pertenece a ${match.coverage.zoneName}. ` : ""}Todavía no hay una ruta pública con fecha para esta ciudad.</p><button type="button" onClick={openPickupPlanner} className="mt-4 inline-flex items-center gap-2 font-black text-red-600 hover:text-red-500">Solicitar recogida <ArrowRight size={17} /></button></> : <><p className="flex items-center gap-2 text-lg font-black text-amber-900"><CircleAlert size={21} /> No encontramos una ruta publicada para {query.trim()}.</p><p className="mt-2 font-semibold text-amber-800">Envíanos la solicitud para confirmar si podemos agregarla al próximo recorrido.</p><button type="button" onClick={openPickupPlanner} className="mt-4 inline-flex items-center gap-2 font-black text-red-600 hover:text-red-500">Consultar recogida <ArrowRight size={17} /></button></>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        .route-path-flow {
          animation: route-dash 1.25s linear infinite;
        }
        .route-stop-pulse {
          transform-box: fill-box;
          transform-origin: center;
          animation: route-pulse 1.8s ease-in-out infinite;
        }
        @keyframes route-dash {
          to { stroke-dashoffset: -12; }
        }
        @keyframes route-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.22); }
        }
        @media (prefers-reduced-motion: reduce) {
          .route-path-flow, .route-stop-pulse, .route-truck { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
