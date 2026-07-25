"use client";

import Image from "next/image";
import {
  ArrowRight,
  CalendarClock,
  MessageCircle,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getPublicPromotionsByStoreSlug } from "@/lib/services/marketing";
import type { MarketingPromotion } from "@/types/marketing";
import { WHATSAPP_URL } from "@/components/landing/yoyo/constants";

const CATEGORY_LABELS: Record<MarketingPromotion["category"], string> = {
  general: "Promoción",
  express: "Express",
  aereo: "Aéreo",
  maritimo: "Marítimo",
  miscelanea: "Miscelánea",
  energia: "Energía",
  recogidas: "Recogidas",
  tienda: "Tienda",
};

function getAutomaticBadge(promotion: MarketingPromotion) {
  const now = Date.now();
  const createdAt = new Date(promotion.created_at).getTime();
  const endsAt = promotion.ends_at
    ? new Date(promotion.ends_at).getTime()
    : null;

  if (endsAt) {
    const remainingDays = Math.ceil((endsAt - now) / 86_400_000);
    if (remainingDays >= 0 && remainingDays <= 5) return "Últimos días";
  }

  const ageDays = Math.floor((now - createdAt) / 86_400_000);
  if (ageDays <= 7) return "Nuevo";

  return promotion.is_featured ? "Destacada" : "Promoción";
}

function resolveDestination(promotion: MarketingPromotion) {
  if (promotion.destination_type === "none") return null;
  if (promotion.destination_url?.trim()) return promotion.destination_url.trim();
  if (promotion.destination_type === "whatsapp") return WHATSAPP_URL;
  return null;
}

function PromotionImage({
  promotion,
  priority = false,
  fit = "contain",
}: {
  promotion: MarketingPromotion;
  priority?: boolean;
  fit?: "contain" | "cover";
}) {
  return (
    <Image
      src={promotion.image_url}
      alt={promotion.title}
      fill
      priority={priority}
      sizes="(max-width: 768px) 100vw, 50vw"
      className={`${fit === "cover" ? "object-cover" : "object-contain"} transition duration-500 group-hover:scale-[1.02]`}
    />
  );
}

export default function YoyoPromotions() {
  const [promotions, setPromotions] = useState<MarketingPromotion[]>([]);
  const [selected, setSelected] = useState<MarketingPromotion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadPromotions() {
      const { data, error } = await getPublicPromotionsByStoreSlug("yoyo-envios");

      if (!active) return;

      if (error) {
        console.error("No se pudieron cargar las promociones públicas:", error);
        setPromotions([]);
      } else {
        setPromotions(data ?? []);
      }

      setLoading(false);
    }

    void loadPromotions();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selected) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selected]);

  const orderedPromotions = useMemo(
    () =>
      [...promotions].sort((a, b) => {
        if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
        return a.sort_order - b.sort_order;
      }),
    [promotions]
  );

  async function sharePromotion(promotion: MarketingPromotion) {
    const shareData = {
      title: promotion.title,
      text: promotion.subtitle || promotion.description || promotion.title,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(window.location.href);
      window.alert("Enlace copiado.");
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") {
        console.error("No se pudo compartir la promoción:", error);
      }
    }
  }

  if (loading) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="h-8 w-64 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-6 h-[340px] animate-pulse rounded-[2rem] bg-slate-200" />
      </section>
    );
  }

  if (orderedPromotions.length === 0) return null;

  return (
    <>
      <section id="promociones" className="relative overflow-hidden py-14 sm:py-20">
        <div className="pointer-events-none absolute inset-x-0 top-20 mx-auto h-72 max-w-5xl rounded-full bg-blue-200/30 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-blue-700 shadow-sm">
              <Sparkles className="h-4 w-4" />
              Promociones de YOYO
            </div>
            <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Ofertas pensadas para tus envíos
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
              Descubre nuestras promociones vigentes y elige la que mejor se adapte a lo que deseas enviar a Cuba.
            </p>
          </div>

          <div className="mt-9 grid gap-5 lg:grid-cols-2">
            {orderedPromotions.map((promotion) => {
              const destination = resolveDestination(promotion);

              return (
                <article
                  key={promotion.id}
                  className={`group relative overflow-hidden rounded-[1.75rem] border bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    promotion.is_featured
                      ? "border-slate-900 ring-1 ring-slate-900/10"
                      : "border-slate-200"
                  }`}
                >
                  <div className="grid min-h-[300px] sm:grid-cols-[42%_58%] lg:min-h-[330px]">
                    <button
                      type="button"
                      onClick={() => setSelected(promotion)}
                      className="relative min-h-[250px] overflow-hidden bg-gradient-to-br from-slate-100 via-white to-blue-50 text-left sm:min-h-full"
                      aria-label={`Abrir promoción ${promotion.title}`}
                    >
                      <PromotionImage promotion={promotion} priority={promotion.is_featured} />
                      <div className="absolute inset-0 ring-1 ring-inset ring-black/5" />
                      <span
                        className={`absolute left-4 top-4 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wider shadow-md ${
                          promotion.is_featured
                            ? "bg-amber-300 text-slate-950"
                            : "bg-white/95 text-blue-700"
                        }`}
                      >
                        {getAutomaticBadge(promotion)}
                      </span>
                    </button>

                    <div
                      className={`flex flex-col justify-center p-6 sm:p-7 ${
                        promotion.is_featured
                          ? "bg-slate-950 text-white"
                          : "bg-white text-slate-950"
                      }`}
                    >
                      <p
                        className={`text-[11px] font-black uppercase tracking-[0.2em] ${
                          promotion.is_featured ? "text-sky-300" : "text-blue-600"
                        }`}
                      >
                        {CATEGORY_LABELS[promotion.category]}
                      </p>

                      <h3 className="mt-3 text-2xl font-black leading-tight">
                        {promotion.title}
                      </h3>

                      <p
                        className={`mt-3 line-clamp-3 text-sm leading-6 ${
                          promotion.is_featured ? "text-slate-300" : "text-slate-600"
                        }`}
                      >
                        {promotion.subtitle ||
                          promotion.description ||
                          "Conoce todos los detalles de esta promoción."}
                      </p>

                      <div className="mt-5 flex flex-wrap gap-2.5">
                        <button
                          type="button"
                          onClick={() => setSelected(promotion)}
                          className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-black transition hover:-translate-y-0.5 ${
                            promotion.is_featured
                              ? "bg-white text-slate-950 hover:bg-sky-50"
                              : "bg-slate-950 text-white hover:bg-slate-800"
                          }`}
                        >
                          Ver promoción
                          <ArrowRight className="h-4 w-4" />
                        </button>

                        {destination && (
                          <a
                            href={destination}
                            target="_blank"
                            rel="noreferrer"
                            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-black transition ${
                              promotion.is_featured
                                ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
                                : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                            }`}
                          >
                            <MessageCircle className="h-4 w-4" />
                            {promotion.button_text || "Información"}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {selected && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-md sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={selected.title}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSelected(null);
          }}
        >
          <div className="relative max-h-[94vh] w-full max-w-6xl overflow-hidden rounded-[1.75rem] bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute right-3 top-3 z-20 grid h-11 w-11 place-items-center rounded-full bg-slate-950/80 text-white backdrop-blur transition hover:bg-slate-950"
              aria-label="Cerrar promoción"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="grid max-h-[94vh] overflow-y-auto lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] lg:overflow-hidden">
              <div className="relative min-h-[360px] bg-gradient-to-br from-slate-100 via-white to-blue-50 sm:min-h-[520px] lg:h-[82vh] lg:max-h-[760px]">
                <Image
                  src={selected.image_url}
                  alt={selected.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-contain p-3 sm:p-5"
                />
              </div>

              <div className="overflow-y-auto p-6 sm:p-8 lg:flex lg:flex-col lg:justify-center lg:p-10">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-700">
                    {CATEGORY_LABELS[selected.category]}
                  </span>
                  {selected.ends_at && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500">
                      <CalendarClock className="h-4 w-4" />
                      Vigente hasta {new Intl.DateTimeFormat("es-US", { dateStyle: "medium" }).format(new Date(selected.ends_at))}
                    </span>
                  )}
                </div>

                <h3 className="mt-4 text-2xl font-black text-slate-950 sm:text-4xl">
                  {selected.title}
                </h3>
                {selected.subtitle && (
                  <p className="mt-3 text-lg font-bold text-slate-700">
                    {selected.subtitle}
                  </p>
                )}
                {selected.description && (
                  <p className="mt-4 leading-7 text-slate-600">
                    {selected.description}
                  </p>
                )}

                <div className="mt-7 flex flex-wrap gap-3">
                  {resolveDestination(selected) && (
                    <a
                      href={resolveDestination(selected) ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-emerald-600"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {selected.button_text || "Solicitar información"}
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => void sharePromotion(selected)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-50"
                  >
                    <Share2 className="h-4 w-4" />
                    Compartir
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
