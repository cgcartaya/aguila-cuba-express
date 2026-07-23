"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Loader2, MapPin, Route } from "lucide-react";

type PublicRoute = { id: string; name: string; route_date: string; public_summary: string | null; cities: string[] };

export default function UpcomingPickupRoutes({ storeSlug = "yoyo-envios" }: { storeSlug?: string }) {
  const [routes, setRoutes] = useState<PublicRoute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/pickups/routes/public?store=${encodeURIComponent(storeSlug)}`)
      .then((response) => response.json())
      .then((payload) => setRoutes(payload.routes || []))
      .finally(() => setLoading(false));
  }, [storeSlug]);

  if (loading) return <div className="mx-auto flex max-w-7xl items-center justify-center px-5 py-12 text-slate-500"><Loader2 className="mr-2 animate-spin" size={18} /> Cargando próximas rutas...</div>;
  if (routes.length === 0) return null;

  return <section id="proximas-rutas" className="bg-white py-20">
    <div className="mx-auto max-w-7xl px-5 sm:px-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-xs font-black uppercase tracking-[.2em] text-red-600">Recogidas planificadas</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Próximas rutas cerca de ti</h2><p className="mt-4 max-w-2xl text-lg font-semibold text-slate-500">Consulta las ciudades programadas y solicita tu recogida para una fecha que te convenga.</p></div><a href="#recogida" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#071d43] px-6 py-4 font-black text-white"><Route size={19} /> Programar recogida</a></div>
      <div className="mt-10 grid gap-5 lg:grid-cols-2">{routes.map((route) => <article key={route.id} className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6"><div className="flex items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-blue-700"><CalendarDays size={17} /> {new Intl.DateTimeFormat("es-US", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${route.route_date}T12:00:00`))}</p><h3 className="mt-3 text-2xl font-black">{route.name}</h3></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">Ruta abierta</span></div><div className="mt-5 flex flex-wrap gap-2">{route.cities.map((city) => <span key={city} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-sm"><MapPin size={14} className="text-red-500" />{city}</span>)}</div>{route.public_summary && <p className="mt-5 font-semibold text-slate-500">{route.public_summary}</p>}</article>)}</div>
    </div>
  </section>;
}
