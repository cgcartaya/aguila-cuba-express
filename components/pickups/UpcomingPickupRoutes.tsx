"use client";

import { useEffect, useMemo, useState } from "react";
import PublicPickupRouteMap from "@/components/maps/PublicPickupRouteMap";
import { getScheduledProgress, progressNames, type ScheduledProgress } from "@/lib/pickups/scheduled-progress";
import { timeWindow } from "@/lib/pickups/itinerary";
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
  ShieldCheck,
  X,
} from "lucide-react";

type PublicCity = { name: string; latitude: number | null; longitude: number | null; order: number; start_time?: string | null; end_time?: string | null };
type PublicRoute = {
  id: string;
  name: string;
  route_date: string;
  status: "published" | "in_progress";
  public_summary: string | null;
  poster_image_url?: string | null;
  color: string | null;
  cities: PublicCity[];
};
type CoverageCity = { name: string; zoneName: string | null; zoneColor: string | null };
type PublicPayload = { routes: PublicRoute[]; coverageCities: CoverageCity[]; timezone?: string };


function routeDate(value: string) {
  return new Intl.DateTimeFormat("es-US", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${value}T12:00:00`));
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function openPickupPlanner(city?: string, route?: PublicRoute) {
  window.dispatchEvent(new CustomEvent("open-pickup-planner", {
    detail: { city, routeId: route?.id, routeName: route?.name, routeDate: route?.route_date },
  }));
}

function RouteMap({ route, progress }: { route: PublicRoute; progress: ScheduledProgress | null }) {
  return <PublicPickupRouteMap route={route} progress={progress} />;
}

export default function UpcomingPickupRoutes({ storeSlug = "yoyo-envios" }: { storeSlug?: string }) {
  const [payload, setPayload] = useState<PublicPayload>({ routes: [], coverageCities: [] });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [allStopsRouteId, setAllStopsRouteId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => { if (!document.hidden) setNow(new Date()); };
    tick();
    const timer = window.setInterval(tick, 15000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", tick); document.removeEventListener("visibilitychange", tick); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      if (document.hidden) return;
      fetch(`/api/pickups/routes/public?store=${encodeURIComponent(storeSlug)}`, { signal: controller.signal })
        .then((response) => { if (!response.ok) throw new Error("routes"); return response.json(); })
        .then((result) => { setPayload({ routes: result.routes || [], coverageCities: result.coverageCities || [], timezone: result.timezone }); setLoadError(false); })
        .catch((error) => { if (error.name !== "AbortError") setLoadError(true); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    };
    refresh();
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [storeSlug]);

  const preferredRoute = payload.routes.find((route) => route.status === "in_progress") || payload.routes[0];
  const activeRoute = payload.routes.find((route) => route.id === selectedRouteId) || preferredRoute;

  const progress = useMemo(() => activeRoute && now ? getScheduledProgress(activeRoute, now, payload.timezone) : null, [activeRoute, now, payload.timezone]);
  const currentNames = activeRoute && progress ? progressNames(activeRoute.cities, progress.currentIndices) : "";
  const nextNames = activeRoute && progress ? progressNames(activeRoute.cities, progress.nextIndices) : "";
  const progressTitle = progress?.phase === "stop" ? "Parada prevista ahora" : progress?.phase === "transit" ? "Trayecto previsto hacia" : progress?.phase === "finished" ? "Horario del recorrido finalizado" : progress?.phase === "upcoming" ? "Primera parada prevista" : "Recorrido programado";
  const visibleStops = useMemo(() => {
    if (!activeRoute) return [];
    return activeRoute.cities.map((city, index) => ({ city, index }));
  }, [activeRoute]);
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
          <p className="mt-5 text-base font-semibold leading-7 text-slate-500 sm:text-lg sm:leading-8">Elige tu fecha, consulta las ciudades y solicita tu recogida. Los horarios son orientativos y se confirman directamente contigo.</p>
        </div>

        {payload.routes.length > 0 && (
          <div className="mt-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.18em] text-blue-700">Próximas rutas publicadas</p>
                <p className="mt-2 font-semibold text-slate-500">Selecciona una fecha para ver su recorrido.</p>
              </div>
              <p className="hidden text-sm font-bold text-slate-400 sm:block">{payload.routes.length} {payload.routes.length === 1 ? "ruta disponible" : "rutas disponibles"}</p>
            </div>
            <div className="route-tabs mt-5 flex gap-3 overflow-x-auto pb-3">
              {payload.routes.map((route) => {
                const selected = activeRoute?.id === route.id;
                return (
                  <button
                    key={route.id}
                    type="button"
                    onClick={() => { setSelectedRouteId(route.id); setAllStopsRouteId(null); }}
                    className={`min-w-[190px] shrink-0 rounded-2xl border px-4 py-4 text-left transition duration-300 sm:min-w-[220px] ${selected ? "border-[#071d43] bg-[#071d43] text-white shadow-lg" : "border-slate-200 bg-white text-slate-900 hover:border-blue-300 hover:shadow-md"}`}
                  >
                    <p className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.14em] ${selected ? "text-blue-200" : "text-slate-400"}`}><CalendarDays size={12} /> {routeDate(route.route_date)}</p>
                    <p className="mt-1 truncate text-base font-black">{route.name}</p>
                    <div className={`mt-3 flex items-center justify-between text-xs font-bold ${selected ? "text-blue-100/75" : "text-slate-500"}`}>
                      <span>{route.cities.length} {route.cities.length === 1 ? "ciudad" : "ciudades"}</span>
                      <span className={`rounded-full px-2 py-1 ${route.status === "in_progress" ? "bg-emerald-500/20 text-emerald-300" : selected ? "bg-white/10" : "bg-amber-50 text-amber-700"}`}>{route.status === "in_progress" ? "En recorrido" : "Abierta"}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeRoute ? (
          <div className="mt-7 grid min-w-0 gap-6 lg:grid-cols-[1.08fr_.92fr] lg:items-start">
            <RouteMap route={activeRoute} progress={progress} />
            <article className="relative min-w-0 overflow-hidden rounded-[2rem] bg-[#071d43] p-6 text-white shadow-[0_25px_80px_rgba(7,29,67,.22)] sm:p-8">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-400/15" />
              <div className="relative">
                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-blue-200"><CalendarDays size={16} /> {routeDate(activeRoute.route_date)}</p>
                <h3 className="mt-3 break-words text-3xl font-black sm:text-4xl">{activeRoute.name}</h3>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[.06] p-3"><p className="text-[10px] font-black uppercase tracking-[.15em] text-blue-200/70">Paradas</p><p className="mt-1 text-xl font-black">{activeRoute.cities.length}</p></div>
                  <div className="rounded-2xl border border-white/10 bg-white/[.06] p-3"><p className="text-[10px] font-black uppercase tracking-[.15em] text-blue-200/70">Estado</p><p className="mt-1 text-sm font-black">{activeRoute.status === "in_progress" ? "En recorrido" : "Abierta"}</p></div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[.06] p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500"><Truck size={22} /></span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wide text-blue-100/70">{progressTitle}</p>
                      <p className="mt-1 break-words text-xl font-black">{progress?.phase === "stop" ? currentNames : progress?.phase === "transit" || progress?.phase === "upcoming" ? nextNames : progress?.phase === "finished" ? "Confirma con Yoyo la próxima ruta" : "Horarios por coordinar"}</p>
                      {progress?.phase === "stop" && <p className="mt-1 text-sm text-blue-100">{timeWindow(activeRoute.cities[progress.currentIndices[0]]?.start_time, activeRoute.cities[progress.currentIndices[0]]?.end_time)}</p>}
                    </div>
                  </div>
                  {progress?.phase === "stop" && nextNames && <p className="mt-3 border-t border-white/10 pt-3 text-sm text-blue-100/80">Próxima parada: <strong>{nextNames}</strong> · {timeWindow(activeRoute.cities[progress.nextIndices[0]]?.start_time, activeRoute.cities[progress.nextIndices[0]]?.end_time)}</p>}
                  {progress?.phase === "transit" && <p className="mt-3 text-sm text-blue-100/80">Llegada prevista: {timeWindow(activeRoute.cities[progress.nextIndices[0]]?.start_time, activeRoute.cities[progress.nextIndices[0]]?.end_time)}</p>}
                  <p className="mt-3 text-xs leading-5 text-blue-100/65">{progress && <>Hora local: {progress.localTime} · {progress.timezone}<br /></>}Estimación según horario · No es ubicación GPS. Los horarios pueden variar.</p>
                </div>

                <ol aria-label="Paradas y avance previsto" className="relative mt-6 max-h-[520px] overflow-y-auto space-y-0 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-white/15">
                  {visibleStops.map(({ city, index }) => {
                    const active = progress?.currentIndices.includes(index);
                    const previous = progress?.previousIndices.includes(index);
                    return (
                        <li key={`${city.name}-${index}`} aria-current={active ? "step" : undefined} className={`relative flex items-center gap-3 rounded-xl px-1 py-3 ${active ? "bg-emerald-500/15" : ""}`}>
                          <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-black ${active ? "border-emerald-300 bg-emerald-500 shadow-[0_0_0_5px_rgba(16,185,129,.14)]" : previous ? "border-emerald-300/30 bg-emerald-500/25 text-emerald-200" : "border-white/10 bg-[#102b58]"}`}>{active ? <Truck size={14} /> : previous ? <Check size={14} /> : index + 1}</span>
                          <div className="min-w-0 flex-1"><p className="break-words font-black">{city.name}</p><p className="text-xs font-semibold text-blue-100/55">{timeWindow(city.start_time, city.end_time)}</p></div>
                          <span className={`max-w-[90px] shrink-0 text-right text-[10px] font-bold ${active ? "text-emerald-200" : "text-blue-100/55"}`}>{active ? "Ahora, según horario" : previous ? "Horario finalizado" : <MapPin size={15} />}</span>
                        </li>
                    );
                  })}
                </ol>

                {activeRoute.cities.length > 6 && (
                  <button type="button" onClick={() => setAllStopsRouteId(activeRoute.id)} className="mt-3 w-full rounded-xl border border-white/10 bg-white/[.05] px-4 py-3 text-sm font-black text-blue-100 transition hover:bg-white/[.1]">
                    Ver recorrido completo · {activeRoute.cities.length} paradas
                  </button>
                )}

                {activeRoute.public_summary && <p className="mt-5 border-t border-white/10 pt-5 font-semibold leading-7 text-blue-100/75">{activeRoute.public_summary}</p>}
                {activeRoute.poster_image_url && <details className="mt-5 rounded-2xl border border-white/15 p-4"><summary className="cursor-pointer text-sm font-black">Ver cartel de esta ruta</summary><a href={activeRoute.poster_image_url} target="_blank" rel="noopener noreferrer"><img src={activeRoute.poster_image_url} alt={`Cartel de ${activeRoute.name}`} loading="lazy" className="mt-3 max-h-[500px] w-full rounded-xl object-contain" /></a></details>}
                <button type="button" onClick={() => openPickupPlanner(undefined, activeRoute)} className="mt-7 inline-flex w-full min-w-0 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-4 text-center font-black transition hover:-translate-y-0.5 hover:bg-red-500">{activeRoute.status === "in_progress" ? "Solicitar para la próxima ruta" : "Reservar recogida"} <ArrowRight size={18} /></button>{activeRoute.status === "in_progress" && <p className="mt-2 text-center text-xs font-bold text-blue-100/60">Esta ruta ya salió. Tu solicitud quedará pendiente para el próximo recorrido.</p>}
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
                  <div><ShieldCheck size={16} className="mx-auto text-emerald-300" /><p className="mt-1 text-[10px] font-bold leading-4 text-blue-100/65">Solicitud sencilla</p></div>
                  <div><Check size={16} className="mx-auto text-emerald-300" /><p className="mt-1 text-[10px] font-bold leading-4 text-blue-100/65">Confirmación directa</p></div>
                  <div><Clock3 size={16} className="mx-auto text-amber-300" /><p className="mt-1 text-[10px] font-bold leading-4 text-blue-100/65">Según disponibilidad</p></div>
                </div>
              </div>
            </article>
          </div>
        ) : (
          <div className="mt-12 rounded-[2rem] border border-slate-200 bg-slate-50 p-8 text-center">{loadError && <p role="status" className="mb-3 text-sm text-amber-800">No pudimos actualizar las rutas. Puedes solicitar tu recogida y confirmar con nosotros.</p>}<Navigation className="mx-auto text-blue-700" /><h3 className="mt-3 text-2xl font-black">Próxima ruta por publicar</h3><p className="mt-2 font-semibold text-slate-500">Puedes comprobar la cobertura de tu ciudad y enviar una solicitud desde ahora.</p></div>
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
                  {match.route ? <><p className="flex items-start gap-2 text-lg font-black text-emerald-800"><CheckCircle2 size={21} className="mt-0.5 shrink-0" /> <span>Sí, estaremos en {query.trim()}.</span></p><p className="mt-2 font-semibold text-emerald-700">{match.route.name} · {routeDate(match.route.route_date)} · {match.route.status === "in_progress" ? "En recorrido" : "Ruta en preparación"}</p><button type="button" onClick={() => openPickupPlanner(query.trim(), match.route)} className="mt-4 inline-flex items-center gap-2 font-black text-red-600 hover:text-red-500">Reservar mi recogida <ArrowRight size={17} /></button></> : match.coverage ? <><p className="flex items-start gap-2 text-lg font-black text-emerald-800"><CheckCircle2 size={21} className="mt-0.5 shrink-0" /> <span>Sí, recogemos en {match.coverage.name}.</span></p><p className="mt-2 font-semibold text-emerald-700">{match.coverage.zoneName ? `Pertenece a ${match.coverage.zoneName}. ` : ""}Todavía no hay una ruta pública con fecha para esta ciudad.</p><button type="button" onClick={() => openPickupPlanner(match.coverage?.name)} className="mt-4 inline-flex items-center gap-2 font-black text-red-600 hover:text-red-500">Solicitar recogida <ArrowRight size={17} /></button></> : <><p className="flex items-start gap-2 text-lg font-black text-amber-900"><CircleAlert size={21} className="mt-0.5 shrink-0" /> <span>No encontramos una ruta publicada para {query.trim()}.</span></p><p className="mt-2 font-semibold text-amber-800">Envíanos la solicitud para confirmar si podemos agregarla al próximo recorrido.</p><button type="button" onClick={() => openPickupPlanner(query.trim())} className="mt-4 inline-flex items-center gap-2 font-black text-red-600 hover:text-red-500">Consultar recogida <ArrowRight size={17} /></button></>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      {activeRoute && allStopsRouteId === activeRoute.id && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setAllStopsRouteId(null)}>
          <div className="max-h-[88vh] w-full max-w-xl overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5 sm:px-7">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[.16em] text-blue-700">Recorrido completo</p>
                <h3 className="mt-1 truncate text-2xl font-black text-slate-900">{activeRoute.name}</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">{routeDate(activeRoute.route_date)} · {activeRoute.cities.length} paradas</p>
              </div>
              <button type="button" onClick={() => setAllStopsRouteId(null)} className="ml-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200" aria-label="Cerrar"><X size={20} /></button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto px-5 py-4 sm:px-7">
              <ol className="relative space-y-0 before:absolute before:bottom-5 before:left-[17px] before:top-5 before:w-px before:bg-slate-200">
                {activeRoute.cities.map((city, index) => (
                  <li key={`${city.name}-modal-${index}`} className="relative flex items-center gap-4 py-3">
                    <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#071d43] text-xs font-black text-white">{index + 1}</span>
                    <div className="min-w-0 flex-1"><p className="font-black text-slate-900">{city.name}</p><p className="text-xs font-semibold text-slate-500">{timeWindow(city.start_time, city.end_time)}</p></div>
                    <MapPin size={16} className="shrink-0 text-red-500" />
                  </li>
                ))}
              </ol>
            </div>
            <div className="border-t border-slate-200 p-5 sm:px-7">
              <button type="button" onClick={() => { setAllStopsRouteId(null); openPickupPlanner(undefined, activeRoute); }} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-4 font-black text-white hover:bg-red-500">{activeRoute.status === "in_progress" ? "Solicitar para la próxima ruta" : "Reservar recogida"} <ArrowRight size={18} /></button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .route-path-flow { animation: route-dash 1.25s linear infinite; }
        .route-ring { transform-box: fill-box; transform-origin: center; animation: route-ring 1.9s ease-out infinite; }
        @keyframes route-dash { to { stroke-dashoffset: -14; } }
        @keyframes route-ring { 0% { opacity: .9; transform: scale(.75); } 75%, 100% { opacity: 0; transform: scale(1.55); } }
        .route-tabs { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
        .route-tabs::-webkit-scrollbar { height: 6px; }
        .route-tabs::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
        @media (prefers-reduced-motion: reduce) { .route-path-flow, .route-ring, .route-truck { animation: none !important; } }
      `}</style>
    </section>
  );
}
