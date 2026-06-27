"use client";

/* =========================================================
   TIENDA - SALIDAS

   Página pública sencilla para mostrar próximas salidas.
========================================================= */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  Plane,
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

  return (
    <main className="min-h-screen bg-gray-50 pb-28">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <Link
          href="/tienda"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-600"
        >
          <ArrowLeft size={18} />
          Volver a la tienda
        </Link>

        <section className="overflow-hidden rounded-[2rem] bg-black text-white shadow-sm">
          <div className="relative p-7 md:p-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
              <Plane size={16} />
              Envíos a Cuba
            </div>

            <h1 className="text-3xl font-black md:text-5xl">
              Próximas salidas
            </h1>

            <p className="mt-3 max-w-2xl text-white/70">
              Consulta las próximas fechas programadas para los envíos hacia
              Cuba.
            </p>
          </div>
        </section>

        <section className="mt-6">
          {loading ? (
            <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
              <Clock className="mx-auto mb-3 animate-pulse text-gray-400" />
              <p className="font-semibold text-gray-500">
                Cargando próximas salidas...
              </p>
            </div>
          ) : error ? (
            <div className="rounded-3xl bg-red-50 p-6 text-red-600">
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
            <div className="grid gap-4 md:grid-cols-2">
              {departures.map((departure) => (
                <article
                  key={departure.id}
                  className="rounded-3xl bg-white p-5 shadow-sm"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-black text-gray-900">
                        {departure.title}
                      </h2>

                      <p className="mt-1 text-sm font-semibold text-gray-500">
                        {formatDate(departure.departure_date)}
                        {departure.departure_time
                          ? ` · ${departure.departure_time}`
                          : ""}
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

                  <div className="space-y-3 rounded-2xl bg-gray-50 p-4">
                    <div className="flex items-center gap-3">
                      <MapPin size={18} className="text-gray-500" />
                      <div>
                        <p className="text-xs font-bold uppercase text-gray-400">
                          Origen
                        </p>
                        <p className="font-bold text-gray-900">
                          {departure.origin}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={18} className="text-gray-500" />
                      <div>
                        <p className="text-xs font-bold uppercase text-gray-400">
                          Destino
                        </p>
                        <p className="font-bold text-gray-900">
                          {departure.destination}
                        </p>
                      </div>
                    </div>
                  </div>

                  {departure.description && (
                    <p className="mt-4 text-sm leading-6 text-gray-600">
                      {departure.description}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("es-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}