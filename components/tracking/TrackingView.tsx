"use client";

import { useEffect, useState } from "react";
import TrackingSearch from "./TrackingSearch";
import type { PublicTrackingResult } from "@/lib/tracking/types";

function formatDate(value: string | null) {
  if (!value) return "No disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function TrackingView({ code }: { code: string }) {
  const [data, setData] = useState<PublicTrackingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/tracking/${encodeURIComponent(code)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "No se pudo consultar el envío");
        }

        setData(payload);
      } catch (requestError) {
        if ((requestError as Error).name !== "AbortError") {
          setError((requestError as Error).message);
        }
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [code]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-10 text-slate-900 sm:px-6 sm:py-16">
      <section className="mx-auto max-w-4xl">
        <div className="text-center">
          <span className="inline-flex rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-700">
            Águila Cuba Express
          </span>
          <h1 className="mt-5 text-3xl font-black text-[#062446] sm:text-5xl">Rastreo de envío</h1>
          <p className="mt-3 text-slate-600">Consulta segura del estado actual y su historial.</p>
        </div>

        <TrackingSearch initialCode={code} />

        {loading ? (
          <div className="mt-10 rounded-3xl border bg-white p-8 text-center shadow-sm">
            <p className="font-semibold text-slate-600">Consultando el envío...</p>
          </div>
        ) : null}

        {error ? (
          <div className="mt-10 rounded-3xl border border-red-200 bg-red-50 p-7 text-center">
            <h2 className="text-xl font-black text-red-800">No pudimos mostrar el envío</h2>
            <p className="mt-2 text-red-700">{error}</p>
          </div>
        ) : null}

        {data ? (
          <div className="mt-10 space-y-6">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
              <div className="bg-[#062446] p-6 text-white sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-wider text-blue-200">Estado actual</p>
                <h2 className="mt-2 text-3xl font-black">{data.statusLabel}</h2>
                <p className="mt-3 text-blue-100">Código {data.trackingCode}</p>
              </div>

              <div className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
                <Info label="Destino" value={data.location} />
                <Info label="Destinatario" value={data.recipientDisplay} />
                <Info label="Fecha de recepción" value={data.createdDate || "No disponible"} />
                <Info label="Última actualización" value={formatDate(data.updatedAt)} />
                {data.deliveredDate ? (
                  <Info label="Fecha de entrega" value={data.deliveredDate} />
                ) : null}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-black text-[#062446]">Historial del envío</h2>

              <div className="mt-7 space-y-0">
                {data.events.length ? (
                  data.events.map((event, index) => (
                    <div key={`${event.eventDate}-${index}`} className="relative flex gap-4 pb-8 last:pb-0">
                      {index < data.events.length - 1 ? (
                        <span className="absolute left-[7px] top-5 h-full w-0.5 bg-slate-200" />
                      ) : null}
                      <span className="relative mt-1 h-4 w-4 shrink-0 rounded-full bg-red-600 ring-4 ring-red-50" />
                      <div>
                        <h3 className="font-bold text-slate-900">{event.title}</h3>
                        <p className="mt-1 text-sm text-slate-500">{formatDate(event.eventDate)}</p>
                        {event.description ? (
                          <p className="mt-2 text-sm text-slate-600">{event.description}</p>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500">Todavía no hay eventos adicionales para este envío.</p>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide text-red-600">
                    Comprobante privado
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-[#062446]">
                    Evidencia de entrega
                  </h2>
                </div>

                {data.deliveryPhotoUrl ? (
                  <a
                    href={data.deliveryPhotoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-[#062446] transition hover:bg-slate-50"
                  >
                    Abrir imagen
                  </a>
                ) : null}
              </div>

              {data.deliveryPhotoUrl ? (
                <a
                  href={data.deliveryPhotoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 block overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                >
                  <img
                    src={data.deliveryPhotoUrl}
                    alt={`Evidencia de entrega del envío ${data.trackingCode}`}
                    className="max-h-[680px] w-full object-contain"
                  />
                </a>
              ) : data.hasDeliveryPhoto ? (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
                  La evidencia existe, pero no pudo cargarse temporalmente. Actualiza la página en unos minutos.
                </div>
              ) : data.status === "delivered" ? (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
                  El envío está marcado como entregado, pero la evidencia todavía está pendiente de sincronizar.
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
                  La evidencia estará disponible cuando el envío sea entregado y la foto se sincronice.
                </div>
              )}

              <p className="mt-4 text-xs leading-5 text-slate-500">
                La imagen se entrega mediante un enlace temporal y no queda publicada de forma permanente.
              </p>
            </section>

            <p className="px-4 text-center text-xs leading-5 text-slate-500">
              Por seguridad, esta página no muestra teléfonos, dirección completa ni notas privadas.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-900">{value}</p>
    </div>
  );
}
