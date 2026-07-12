"use client";

import { useEffect, useMemo, useState } from "react";
import TrackingSearch from "./TrackingSearch";
import TrackingProductsCarousel from "./TrackingProductsCarousel";
import type { PublicTrackingResult } from "@/lib/tracking/types";

const STORE_URL = "/tienda";
const WHATSAPP_URL = "https://wa.me/13054974891";

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
        const response = await fetch(
          `/api/tracking/${encodeURIComponent(code)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload.error || "No se pudo consultar el envío"
          );
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

  const completedEvents = useMemo(
    () => data?.events ?? [],
    [data]
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-3 py-7 text-slate-900 sm:px-6 sm:py-14">
      <section className="mx-auto max-w-4xl">
        <header className="text-center">
          <span className="inline-flex rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 sm:px-4 sm:py-2 sm:text-sm">
            Águila Cuba Express
          </span>

          <h1 className="mt-3 text-3xl font-black text-[#062446] sm:mt-5 sm:text-5xl">
            Rastreo de envío
          </h1>

          <p className="mt-2 text-sm text-slate-600 sm:mt-3 sm:text-base">
            Consulta segura del estado actual y su historial.
          </p>
        </header>

        <TrackingSearch initialCode={code} />

        {loading ? (
          <div className="mt-7 rounded-3xl border bg-white p-7 text-center shadow-sm">
            <p className="font-semibold text-slate-600">
              Consultando el envío...
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="mt-7 rounded-3xl border border-red-200 bg-red-50 p-6 text-center">
            <h2 className="text-xl font-black text-red-800">
              No pudimos mostrar el envío
            </h2>
            <p className="mt-2 text-red-700">{error}</p>
          </div>
        ) : null}

        {data ? (
          <div className="mt-7 space-y-5">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
              <div className="bg-[#062446] px-5 py-5 text-white sm:px-8 sm:py-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200 sm:text-sm">
                      Estado actual
                    </p>

                    <h2 className="mt-1 text-3xl font-black sm:text-4xl">
                      {data.statusLabel}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-blue-100 sm:text-sm">
                      Código{" "}
                      <strong className="text-white">
                        {data.trackingCode}
                      </strong>
                    </span>

                    <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-blue-100 sm:text-sm">
                      {completedEvents.length}{" "}
                      {completedEvents.length === 1
                        ? "evento"
                        : "eventos"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-7">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Seguimiento
                    </p>

                    <h3 className="mt-1 text-xl font-black text-[#062446] sm:text-2xl">
                      Historial del envío
                    </h3>
                  </div>

                  <div className="text-right">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Última actualización
                    </p>

                    <p className="mt-1 text-xs font-bold text-slate-600 sm:text-sm">
                      {formatDate(data.updatedAt)}
                    </p>
                  </div>
                </div>

                <div className="space-y-0">
                  {completedEvents.length ? (
                    completedEvents.map((event, index) => (
                      <div
                        key={`${event.eventDate}-${index}`}
                        className="relative flex gap-4 pb-6 last:pb-0"
                      >
                        {index < completedEvents.length - 1 ? (
                          <span className="absolute left-[7px] top-5 h-full w-0.5 bg-slate-200" />
                        ) : null}

                        <span className="relative mt-1 h-4 w-4 shrink-0 rounded-full bg-red-600 ring-4 ring-red-50" />

                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900">
                            {event.title}
                          </h4>

                          <p className="mt-1 text-sm text-slate-500">
                            {formatDate(event.eventDate)}
                          </p>

                          {event.description ? (
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {event.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">
                      Todavía no hay eventos adicionales para este envío.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-red-600">
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
                    className="inline-flex justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-[#062446] transition hover:bg-slate-50"
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
                  className="mt-5 block overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                >
                  <img
                    src={data.deliveryPhotoUrl}
                    alt={`Evidencia de entrega del envío ${data.trackingCode}`}
                    className="max-h-[620px] w-full object-contain"
                  />
                </a>
              ) : data.hasDeliveryPhoto ? (
                <Notice tone="warning">
                  La evidencia existe, pero no pudo cargarse temporalmente.
                  Actualiza la página en unos minutos.
                </Notice>
              ) : data.status === "delivered" ? (
                <Notice>
                  El envío está marcado como entregado, pero la evidencia
                  todavía está pendiente de sincronizar.
                </Notice>
              ) : (
                <Notice>
                  La evidencia estará disponible cuando el envío sea
                  entregado y la foto se sincronice.
                </Notice>
              )}

              <p className="mt-4 text-xs leading-5 text-slate-500">
                La imagen se entrega mediante un enlace temporal y no queda
                publicada de forma permanente.
              </p>
            </section>

            <TrackingProductsCarousel />

            <StoreBenefits />

            <p className="px-4 text-center text-xs leading-5 text-slate-500">
              Por seguridad, esta página no muestra teléfonos, dirección
              completa ni notas privadas.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function StoreBenefits() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="grid gap-4 sm:grid-cols-3">
        <Benefit
          title="Compra fácil"
          text="Explora productos y opciones disponibles desde tu teléfono."
        />

        <Benefit
          title="Envíos confiables"
          text="Usa el mismo sistema de seguimiento para tus próximos envíos."
        />

        <Benefit
          title="Atención directa"
          text="Habla con el equipo de Águila si necesitas ayuda."
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <a
          href={STORE_URL}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#062446] px-5 font-bold text-white transition hover:bg-[#0A3764]"
        >
          Ver productos disponibles
        </a>

        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-green-600 px-5 font-bold text-green-700 transition hover:bg-green-50"
        >
          Contactar por WhatsApp
        </a>
      </div>
    </section>
  );
}

function Benefit({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <h3 className="font-black text-[#062446]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function Notice({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warning";
}) {
  const classes =
    tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <div className={`mt-5 rounded-2xl border p-4 ${classes}`}>
      {children}
    </div>
  );
}
