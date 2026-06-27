"use client";

/* =========================================================
   TIENDA - SALIDAS

   Página pública profesional para mostrar próximas salidas.
   Usa imágenes desde:
   - /public/images/departures/departures-hero.png
   - /public/images/departures/cienfuegos-bg.png
========================================================= */

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  Plane,
  Rocket,
} from "lucide-react";

import {
  getActiveDepartures,
  type Departure,
  type DepartureStatus,
} from "@/lib/services/departures";

const statusLabels: Record<DepartureStatus, string> = {
  scheduled: "Programada",
  closed: "Cerrada",
  completed: "Completada",
  cancelled: "Cancelada",
};

const statusStyles: Record<DepartureStatus, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  closed: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function StoreDeparturesPage() {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDepartures() {
      try {
        setLoading(true);

        const { data, error } = await getActiveDepartures();

        if (error) throw error;

        setDepartures(data || []);
      } catch (err: any) {
        console.error("ERROR CARGANDO SALIDAS:", err);
        setError("No se pudieron cargar las próximas salidas.");
      } finally {
        setLoading(false);
      }
    }

    loadDepartures();
  }, []);

  const nextDeparture = useMemo(() => {
    return departures.find((departure) => departure.status === "scheduled");
  }, [departures]);

  const countdown = useMemo(() => {
    if (!nextDeparture) return null;

    const departureDate = new Date(`${nextDeparture.departure_date}T00:00:00`);
    const today = new Date();

    const diff = departureDate.getTime() - today.getTime();
    const days = Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);

    return {
      days,
      label: days === 1 ? "día" : "días",
    };
  }, [nextDeparture]);

  return (
    <main className="min-h-screen bg-[#f6f8fb] pb-28">
      <div className="mx-auto max-w-5xl px-4 py-5">
        <Link
          href="/tienda"
          className="mb-5 inline-flex items-center gap-2 text-sm font-black text-slate-500"
        >
          <ArrowLeft size={18} />
          Volver a la tienda
        </Link>

        <section className="relative min-h-[350px] overflow-hidden rounded-[2rem] bg-sky-100 shadow-sm md:min-h-[420px]">
          <Image
            src="/departures/departures-hero.png"
            alt="Próximas salidas de Águila Cuba Express"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 1024px"
            className="object-cover object-center"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/35 to-transparent" />

          <div className="relative z-10 p-7 md:p-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white shadow">
              <Plane size={15} />
              Envíos a Cuba
            </div>

            <h1 className="max-w-sm text-5xl font-black leading-none text-slate-950 md:text-6xl">
              Próximas <span className="text-blue-600">salidas</span>
            </h1>

            <p className="mt-5 max-w-md text-lg font-medium leading-8 text-slate-700">
              Consulta las próximas fechas programadas para los envíos hacia
              Cuba.
            </p>
          </div>
        </section>

        {nextDeparture && countdown && (
          <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
                <CalendarDays size={26} />
              </div>

              <div className="flex-1">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Próxima salida en
                </p>

                <p className="text-2xl font-black text-slate-950">
                  {countdown.days} {countdown.label}
                </p>
              </div>

              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold text-slate-500">
                  {formatDate(nextDeparture.departure_date)}
                </p>

                {nextDeparture.departure_time && (
                  <p className="text-xl font-black text-blue-700">
                    {nextDeparture.departure_time}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="mt-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-2xl font-black text-slate-950">
              <Rocket size={24} />
              Salidas programadas
            </h2>

            <span className="rounded-full border bg-white px-4 py-2 text-sm font-black text-slate-600">
              {departures.length} salidas
            </span>
          </div>

          {loading ? (
            <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
              <Clock className="mx-auto mb-3 animate-pulse text-gray-400" />
              <p className="font-semibold text-gray-500">
                Cargando próximas salidas...
              </p>
            </div>
          ) : error ? (
            <div className="rounded-3xl bg-red-50 p-6 font-bold text-red-600">
              {error}
            </div>
          ) : departures.length === 0 ? (
            <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
              <CalendarDays className="mx-auto mb-3 text-gray-400" size={40} />
              <h2 className="text-xl font-black text-gray-900">
                No hay salidas publicadas
              </h2>
              <p className="mt-2 text-gray-500">
                Vuelve pronto para ver nuevas fechas disponibles.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {departures.map((departure) => (
                <DepartureCard key={departure.id} departure={departure} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function DepartureCard({ departure }: { departure: Departure }) {
  const date = getDateParts(departure.departure_date);

  return (
    <article className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-black/5">
      <div className="grid grid-cols-[96px_1fr] md:grid-cols-[170px_1fr]">
        <div className="bg-gradient-to-b from-blue-50 to-white p-4 text-center md:p-5">
          <p className="text-xs font-black uppercase text-blue-700 md:text-sm">
            {date.weekday}
          </p>

          <p className="mt-2 text-5xl font-black leading-none text-slate-950 md:mt-3 md:text-6xl">
            {date.day}
          </p>

          <p className="mt-2 text-sm font-black uppercase text-slate-600 md:mt-3 md:text-xl">
            {date.month}
          </p>

          {departure.departure_time && (
            <div className="mt-4 rounded-2xl bg-blue-600 px-2 py-2 text-xs font-black text-white shadow md:mt-6 md:px-4 md:py-3 md:text-lg">
              {departure.departure_time}
            </div>
          )}
        </div>

        <div className="relative overflow-hidden p-5 md:p-6">
          <div className="absolute inset-y-0 right-0 hidden w-[42%] opacity-20 sm:block">
            <Image
              src="/departures/cienfuegos-bg.png"
              alt="Cienfuegos"
              fill
              sizes="360px"
              className="object-cover object-right"
            />
          </div>

          <div className="relative z-10">
            <div className="mb-3 flex flex-wrap items-center gap-2 md:mb-4">
              <span
                className={`rounded-full px-3 py-1 text-xs font-black md:px-4 md:py-2 ${
                  statusStyles[departure.status]
                }`}
              >
                {statusLabels[departure.status]}
              </span>
            </div>

            <h3 className="text-2xl font-black leading-tight text-slate-950 md:text-4xl">
              {departure.title}
            </h3>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-bold text-slate-500 md:mt-4 md:gap-6">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} />
                {formatDate(departure.departure_date)}
              </div>

              {departure.departure_time && (
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  {departure.departure_time}
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50/95 p-4 md:mt-6 md:grid-cols-2 md:p-5">
              <div className="flex items-center gap-3 md:gap-4">
                <MapPin className="text-slate-500" size={21} />

                <div>
                  <p className="text-xs font-black uppercase text-slate-400">
                    Origen
                  </p>

                  <p className="text-lg font-black text-slate-950 md:text-2xl">
                    {departure.origin}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 md:gap-4">
                <CheckCircle2 className="text-slate-500" size={21} />

                <div>
                  <p className="text-xs font-black uppercase text-slate-400">
                    Destino
                  </p>

                  <p className="text-lg font-black text-slate-950 md:text-2xl">
                    {departure.destination}
                  </p>
                </div>
              </div>
            </div>

            {departure.description && (
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 md:mt-5 md:text-base md:leading-7">
                {departure.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function getDateParts(date: string) {
  const parsedDate = new Date(`${date}T00:00:00`);

  return {
    weekday: parsedDate
      .toLocaleDateString("es-US", { weekday: "short" })
      .replace(".", ""),
    day: parsedDate.toLocaleDateString("es-US", { day: "2-digit" }),
    month: parsedDate
      .toLocaleDateString("es-US", { month: "short" })
      .replace(".", ""),
  };
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("es-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}