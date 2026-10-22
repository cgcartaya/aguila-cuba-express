"use client";

import Image from "next/image";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  MessageCircle,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { getPublicPromotionsByStoreSlug } from "@/lib/services/marketing";
import type { MarketingPromotion } from "@/types/marketing";
import { buildPromotionDestination } from "@/lib/marketing/destination";

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
  return buildPromotionDestination(
    promotion.destination_type,
    promotion.destination_url,
    promotion.destination_message
  );
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
  const [activePromotion, setActivePromotion] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

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

  function scrollToPromotion(index: number) {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const nextIndex = Math.max(0, Math.min(index, orderedPromotions.length - 1));
    const card = carousel.children.item(nextIndex) as HTMLElement | null;
    card?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    setActivePromotion(nextIndex);
  }

  function updateActivePromotion() {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const cards = Array.from(carousel.children) as HTMLElement[];
    const closest = cards.reduce(
      (best, card, index) => {
        const distance = Math.abs(card.offsetLeft - carousel.scrollLeft);
        return distance < best.distance ? { index, distance } : best;
      },
      { index: 0, distance: Number.POSITIVE_INFINITY }
    );
    setActivePromotion(closest.index);
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
      <section id="promociones" className="relative overflow-hidden bg-[#f8fbff] py-14 sm:py-20">
        <div className="pointer-events-none absolute -right-32 top-4 h-80 w-80 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-blue-700">
              <Sparkles className="h-4 w-4" /> Promociones de YOYO
            </div>
            <h2 className="mt-4 text-4xl font-black leading-[1.02] tracking-[-0.04em] text-slate-950 sm:text-6xl">
              Ofertas que te llevan más lejos
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Descubre las promociones vigentes para tus envíos a Cuba.
            </p>
          </div>

          <div className="mt-9 flex items-center justify-end gap-2">
            <button type="button" onClick={() => scrollToPromotion(activePromotion - 1)} disabled={activePromotion === 0} className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-35" aria-label="Promoción anterior"><ChevronLeft className="h-5 w-5" /></button>
            <button type="button" onClick={() => scrollToPromotion(activePromotion + 1)} disabled={activePromotion === orderedPromotions.length - 1} className="grid h-11 w-11 place-items-center rounded-full bg-blue-700 text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-35" aria-label="Promoción siguiente"><ChevronRight className="h-5 w-5" /></button>
          </div>

          <div ref={carouselRef} onScroll={updateActivePromotion} className="-mx-4 mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-6 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 [&::-webkit-scrollbar]:hidden">
            {orderedPromotions.map((promotion, index) => {
              const destination = resolveDestination(promotion);
              return (
                <article key={promotion.id} className="group w-[88%] shrink-0 snap-start overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,.09)] sm:w-[560px]">
                  <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-100 via-white to-blue-50">
                    <button type="button" onClick={() => setSelected(promotion)} className="absolute inset-0 z-10" aria-label={`Abrir promoción ${promotion.title}`} />
                    <PromotionImage promotion={promotion} priority={index === 0} />
                    <span className={`absolute left-4 top-4 z-20 rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-wider shadow-md ${promotion.is_featured ? "bg-amber-300 text-slate-950" : "bg-white/95 text-blue-700"}`}>{getAutomaticBadge(promotion)}</span>
                    <button type="button" onClick={() => void sharePromotion(promotion)} className="absolute right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full bg-white/95 text-slate-950 shadow-md backdrop-blur transition hover:scale-105" aria-label={`Compartir ${promotion.title}`}><Share2 className="h-5 w-5" /></button>
                  </div>
                  <div className="p-5 sm:p-7">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">{CATEGORY_LABELS[promotion.category]}</p>
                    <h3 className="mt-2 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{promotion.title}</h3>
                    <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-6 text-slate-600">{promotion.subtitle || promotion.description || "Conoce todos los detalles de esta promoción."}</p>
                    <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                      <button type="button" onClick={() => setSelected(promotion)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-blue-700 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-800">Ver promoción <ArrowRight className="h-4 w-4" /></button>
                      {destination && <a href={destination} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-blue-700 bg-white px-5 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-50"><MessageCircle className="h-4 w-4 text-emerald-600" />{promotion.button_text || "Información"}</a>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-2" aria-label={`Promoción ${activePromotion + 1} de ${orderedPromotions.length}`}>
              {orderedPromotions.map((promotion, index) => <button key={promotion.id} type="button" onClick={() => scrollToPromotion(index)} className={`h-2.5 rounded-full transition-all ${activePromotion === index ? "w-8 bg-blue-700" : "w-2.5 bg-slate-300"}`} aria-label={`Ir a promoción ${index + 1}`} />)}
            </div>
            {orderedPromotions.length > 1 && <p className="text-xs font-semibold text-slate-500">Desliza para ver más</p>}
          </div>

          {orderedPromotions.length > 1 && (
            <div className="mt-10">
              <div className="flex items-center justify-between gap-4"><h3 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Más promociones</h3><button type="button" onClick={() => scrollToPromotion(1)} className="inline-flex items-center gap-1 text-sm font-black text-blue-700">Ver todas <ArrowRight className="h-4 w-4" /></button></div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {orderedPromotions.slice(1).map((promotion) => (
                  <button key={promotion.id} type="button" onClick={() => setSelected(promotion)} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                    <div className="relative aspect-square bg-gradient-to-br from-slate-100 via-white to-blue-50"><PromotionImage promotion={promotion} /></div>
                    <div className="p-3 sm:p-4"><p className="text-[10px] font-black uppercase tracking-wider text-blue-700">{CATEGORY_LABELS[promotion.category]}</p><p className="mt-1 line-clamp-2 text-sm font-black leading-snug text-slate-950 sm:text-base">{promotion.title}</p></div>
                  </button>
                ))}
              </div>
            </div>
          )}
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
