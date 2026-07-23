"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Loader2, MapPin, Route, Truck } from "lucide-react";

type PublicRoute = { id: string; name: string; route_date: string; public_summary: string | null; cities: string[] };

function routeDate(value: string) {
  return new Intl.DateTimeFormat("es-US", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${value}T12:00:00`));
}

function daysUntil(value: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${value}T12:00:00`);
  return Math.max(0, Math.ceil((date.getTime() - today.getTime()) / 86400000));
}

export default function UpcomingPickupRoutes({ storeSlug = "yoyo-envios" }: { storeSlug?: string }) {
  const [routes, setRoutes] = useState<PublicRoute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/pickups/routes/public?store=${encodeURIComponent(storeSlug)}`)
      .then((response) => response.json())
      .then((payload) => setRoutes(payload.routes || []))
      .finally(() => setLoading(false));
  }, [storeSlug]);

  const nextRoute = routes[0];
  const laterRoutes = useMemo(() => routes.slice(1), [routes]);

  if (loading) return <div className="mx-auto flex max-w-7xl items-center justify-center px-5 py-14 text-slate-500"><Loader2 className="mr-2 animate-spin" size={18} /> Cargando próximas rutas...</div>;
  if (!nextRoute) return null;

  return (
    <section id="proximas-rutas" className="overflow-hidden bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[.82fr_1.18fr] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-red-600">Rutas activas</p>
            <h2 className="mt-4 max-w-xl text-4xl font-black leading-[1.02] tracking-tight sm:text-5xl">Mira cuándo estaremos cerca de ti.</h2>
            <p className="mt-5 max-w-xl text-lg font-semibold leading-8 text-slate-500">Publicamos las próximas ciudades del recorrido para que puedas solicitar tu recogida antes de cerrar la ruta.</p>
            <div className="mt-7 flex flex-wrap gap-4 text-sm font-black text-slate-700">
              <span className="inline-flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-500" /> Recogida a domicilio</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-500" /> Confirmación por WhatsApp</span>
            </div>
          </div>

          <article className="relative overflow-hidden rounded-[2.25rem] bg-[#071d43] p-6 text-white shadow-[0_25px_80px_rgba(7,29,67,.22)] sm:p-8">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-400/15" />
            <div className="relative">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div>
                  <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-blue-200"><CalendarDays size={16} /> {routeDate(nextRoute.route_date)}</p>
                  <h3 className="mt-3 text-3xl font-black sm:text-4xl">{nextRoute.name}</h3>
                </div>
                <div className="w-fit rounded-2xl bg-white/10 px-4 py-3 text-center backdrop-blur">
                  <p className="text-2xl font-black">{daysUntil(nextRoute.route_date)}</p>
                  <p className="text-[11px] font-black uppercase tracking-wider text-blue-200">días faltan</p>
                </div>
              </div>

              <div className="mt-7 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.06] p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-600"><Truck size={21} /></span>
                <div><p className="font-black">Recorrido abierto para solicitudes</p><p className="text-sm font-semibold text-blue-100/70">Reserva ahora y la agencia confirmará la parada final.</p></div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {nextRoute.cities.map((city) => <span key={city} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3.5 py-2 text-sm font-black"><MapPin size={14} className="text-red-300" />{city}</span>)}
              </div>

              {nextRoute.public_summary && <p className="mt-5 font-semibold leading-7 text-blue-100/75">{nextRoute.public_summary}</p>}

              <a href="#recogida" className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 py-4 font-black text-white transition hover:bg-red-500 sm:w-auto">Solicitar recogida en esta ruta <ArrowRight size={18} /></a>
            </div>
          </article>
        </div>

        {laterRoutes.length > 0 && <div className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{laterRoutes.map((route) => <article key={route.id} className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg"><div className="flex items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-700"><CalendarDays size={15} /> {routeDate(route.route_date)}</p><h3 className="mt-2 text-xl font-black">{route.name}</h3></div><span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700"><Clock3 size={13} /> Abierta</span></div><div className="mt-4 flex flex-wrap gap-2">{route.cities.slice(0, 5).map((city) => <span key={city} className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm">{city}</span>)}</div><a href="#recogida" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-red-600">Programar recogida <ArrowRight size={16} /></a></article>)}</div>}
      </div>
    </section>
  );
}
