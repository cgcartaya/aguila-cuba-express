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
}: {
  promotion: MarketingPromotion;
  priority?: boolean;
}) {
  return (
    <Image
      src={promotion.image_url}
      alt={promotion.title}
      fill
      priority={priority}
      sizes="(max-width: 768px) 100vw, 50vw"
      className="object-cover transition duration-700 group-hover:scale-[1.035]"
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

  const featured = useMemo(
    () => promotions.find((promotion) => promotion.is_featured) ?? promotions[0],
    [promotions]
  );

  const remaining = useMemo(
    () => promotions.filter((promotion) => promotion.id !== featured?.id),
    [featured?.id, promotions]
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

  if (!featured) return null;

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

          <article className="group mt-10 overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.65)]">
            <div className="grid lg:grid-cols-[1.45fr_0.8fr]">
              <button
                type="button"
                onClick={() => setSelected(featured)}
                className="relative min-h-[300px] overflow-hidden text-left sm:min-h-[430px]"
                aria-label={`Abrir promoción ${featured.title}`}
              >
                <PromotionImage promotion={featured} priority />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-slate-950/50" />
                <span className="absolute left-5 top-5 rounded-full bg-amber-300 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg">
                  {getAutomaticBadge(featured)}
                </span>
              </button>

              <div className="flex flex-col justify-center p-7 text-white sm:p-10 lg:p-12">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300">
                  {CATEGORY_LABELS[featured.category]}
                </p>
                <h3 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                  {featured.title}
                </h3>
                {featured.subtitle && (
                  <p className="mt-4 text-lg font-semibold text-slate-200">
                    {featured.subtitle}
                  </p>
                )}
                {featured.description && (
                  <p className="mt-4 leading-7 text-slate-300">
                    {featured.description}
                  </p>
                )}

                <div className="mt-7 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setSelected(featured)}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-50"
                  >
                    Ver promoción
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  {resolveDestination(featured) && (
                    <a
                      href={resolveDestination(featured) ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-black text-white backdrop-blur transition hover:bg-white/20"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {featured.button_text || "Solicitar información"}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </article>

          {remaining.length > 0 && (
            <div className="mt-7 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {remaining.map((promotion) => (
                <article
                  key={promotion.id}
                  className="group overflow-hidden rounded-[1.65rem] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <button
                    type="button"
                    onClick={() => setSelected(promotion)}
                    className="relative block aspect-[16/10] w-full overflow-hidden text-left"
                    aria-label={`Abrir promoción ${promotion.title}`}
                  >
                    <PromotionImage promotion={promotion} />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent opacity-80" />
                    <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-blue-700 shadow-sm">
                      {getAutomaticBadge(promotion)}
                    </span>
                  </button>

                  <div className="p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">
                      {CATEGORY_LABELS[promotion.category]}
                    </p>
                    <h3 className="mt-2 text-xl font-black text-slate-950">
                      {promotion.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-6 text-slate-600">
                      {promotion.subtitle || promotion.description || "Conoce todos los detalles de esta promoción."}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelected(promotion)}
                      className="mt-5 inline-flex items-center gap-2 text-sm font-black text-blue-700 transition hover:gap-3"
                    >
                      Ver promoción
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}
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
          <div className="relative flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-slate-950/75 text-white backdrop-blur transition hover:bg-slate-950"
              aria-label="Cerrar promoción"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="overflow-y-auto">
              <div className="relative aspect-[16/9] min-h-[240px] w-full bg-slate-100">
                <Image
                  src={selected.image_url}
                  alt={selected.title}
                  fill
                  sizes="100vw"
                  className="object-contain"
                />
              </div>

              <div className="p-6 sm:p-8">
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
