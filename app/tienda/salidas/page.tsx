"use client";

/* =========================================================
   TIENDA - SALIDAS
   Diseño mobile-first + desktop premium
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
          className="mb-4 inline-flex items-center gap-2 text-sm font-black text-slate-500"
        >
          <ArrowLeft size={18} />
          Volver a la tienda
        </Link>

        <section className="relative min-h-[245px] overflow-hidden rounded-[1.75rem] bg-sky-100 shadow-sm sm:min-h-[330px] md:min-h-[420px]">
          <Image
            src="/departures/departures-hero.png"
            alt="Próximas salidas de Águila Cuba Express"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 1024px"
            className="object-cover object-[62%_center] sm:object-center"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/70 to-white/5 sm:from-white/80 sm:via-white/35 sm:to-transparent" />

          <div className="relative z-10 max-w-[67%] p-5 sm:max-w-md sm:p-7 md:p-10">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-600 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white shadow sm:mb-5 sm:px-4 sm:text-xs">
              <Plane size={14} />
              Envíos a Cuba
            </div>

            <h1 className="text-4xl font-black leading-none text-slate-950 sm:text-5xl md:text-6xl">
              Próximas <span className="text-blue-600">salidas</span>
            </h1>

            <p className="mt-3 max-w-xs text-sm font-semibold leading-6 text-slate-700 sm:mt-5 sm:max-w-md sm:text-lg sm:leading-8">
              Consulta las próximas fechas programadas para los envíos hacia
              Cuba.
            </p>
          </div>
        </section>

        {nextDeparture && countdown && (
          <section className="mt-4 rounded-[1.75rem] bg-white p-4 shadow-sm sm:mt-5 sm:p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
                <CalendarDays size={26} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Próxima salida en
                </p>

                <p className="text-2xl font-black text-slate-950">
                  {countdown.days} {countdown.label}
                </p>

                <p className="mt-1 text-xs font-bold text-slate-500 sm:hidden">
                  {formatDate(nextDeparture.departure_date)}
                  {nextDeparture.departure_time
                    ? ` · ${nextDeparture.departure_time}`
                    : ""}
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

        <section className="mt-6 sm:mt-7">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
              <Rocket size={24} />
              Salidas programadas
            </h2>

            <span className="shrink-0 rounded-full border bg-white px-4 py-2 text-sm font-black text-slate-600">
              {departures.length}
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
  return (
    <>
      <MobileDepartureCard departure={departure} />
      <DesktopDepartureCard departure={departure} />
    </>
  );
}

function MobileDepartureCard({ departure }: { departure: Departure }) {
  const date = getDateParts(departure.departure_date);

  return (
    <article className="relative overflow-hidden rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-black/5 md:hidden">
      <div className="absolute inset-0 opacity-20">
        <Image
          src="/departures/cienfuegos-bg.png"
          alt="Cienfuegos"
          fill
          sizes="100vw"
          className="object-cover object-right"
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/70" />

      <div className="relative z-10">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="rounded-2xl bg-blue-50 px-4 py-3 text-center">
            <p className="text-xs font-black uppercase text-blue-700">
              {date.month}
            </p>

            <p className="text-4xl font-black leading-none text-slate-950">
              {date.day}
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-black ${
              statusStyles[departure.status]
            }`}
          >
            {statusLabels[departure.status]}
          </span>
        </div>

        <h3 className="text-2xl font-black leading-tight text-slate-950">
          {departure.title}
        </h3>

        <div className="mt-3 space-y-2 text-sm font-bold text-slate-500">
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

        <div className="mt-4 rounded-2xl bg-slate-50/95 p-4">
          <div className="flex items-center gap-3">
            <MapPin className="text-slate-500" size={20} />

            <div>
              <p className="text-xs font-black uppercase text-slate-400">
                Origen
              </p>

              <p className="text-lg font-black text-slate-950">
                {departure.origin}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <CheckCircle2 className="text-slate-500" size={20} />

            <div>
              <p className="text-xs font-black uppercase text-slate-400">
                Destino
              </p>

              <p className="text-lg font-black text-slate-950">
                {departure.destination}
              </p>
            </div>
          </div>
        </div>

        {departure.description && (
          <p className="mt-4 text-sm leading-6 text-slate-600">
            {departure.description}
          </p>
        )}
      </div>
    </article>
  );
}

function DesktopDepartureCard({ departure }: { departure: Departure }) {
  const date = getDateParts(departure.departure_date);

  return (
    <article className="hidden overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-black/5 md:block">
      <div className="grid md:grid-cols-[170px_1fr]">
        <div className="bg-gradient-to-b from-blue-50 to-white p-5 text-center">
          <p className="text-sm font-black uppercase text-blue-700">
            {date.weekday}
          </p>

          <p className="mt-3 text-6xl font-black leading-none text-slate-950">
            {date.day}
          </p>

          <p className="mt-3 text-xl font-black uppercase text-slate-600">
            {date.month}
          </p>

          {departure.departure_time && (
            <div className="mt-6 rounded-2xl bg-blue-600 px-4 py-3 text-lg font-black text-white shadow">
              {departure.departure_time}
            </div>
          )}
        </div>

        <div className="relative overflow-hidden p-6">
          <div className="absolute inset-y-0 right-0 w-[42%] opacity-25">
            <Image
              src="/departures/cienfuegos-bg.png"
              alt="Cienfuegos"
              fill
              sizes="420px"
              className="object-cover object-right"
            />
          </div>

          <div className="relative z-10">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-4 py-2 text-xs font-black ${
                  statusStyles[departure.status]
                }`}
              >
                {statusLabels[departure.status]}
              </span>
            </div>

            <h3 className="text-4xl font-black text-slate-950">
              {departure.title}
            </h3>

            <div className="mt-4 flex flex-wrap items-center gap-6 text-sm font-bold text-slate-500">
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

            <div className="mt-6 grid gap-4 rounded-2xl bg-slate-50/95 p-5 md:grid-cols-2">
              <div className="flex items-center gap-4">
                <MapPin className="text-slate-500" size={22} />

                <div>
                  <p className="text-xs font-black uppercase text-slate-400">
                    Origen
                  </p>

                  <p className="text-2xl font-black text-slate-950">
                    {departure.origin}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <CheckCircle2 className="text-slate-500" size={22} />

                <div>
                  <p className="text-xs font-black uppercase text-slate-400">
                    Destino
                  </p>

                  <p className="text-2xl font-black text-slate-950">
                    {departure.destination}
                  </p>
                </div>
              </div>
            </div>

            {departure.description && (
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
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