import { ArrowRight, MessageCircle } from "lucide-react";

import { FACEBOOK_URL, INSTAGRAM_URL, TIKTOK_URL, WHATSAPP_URL } from "./constants";

const SOCIAL_CARDS = [
  {
    name: "Facebook",
    href: FACEBOOK_URL,
    description: "Noticias, promociones y novedades del servicio.",
    features: ["Noticias y anuncios", "Promociones exclusivas", "Preguntas frecuentes", "Atención directa"],
    button: "Seguir en Facebook",
    background: "bg-gradient-to-br from-[#1d5ec8] via-[#12458f] to-[#0d1b30]",
    mark: <FacebookMark />,
  },
  {
    name: "Instagram",
    href: INSTAGRAM_URL,
    description: "Historias, promociones y detrás de cámaras.",
    features: ["Historias diarias", "Promociones especiales", "Detrás de cámaras", "Consejos y tips"],
    button: "Ver Instagram",
    background: "bg-gradient-to-br from-[#d7a13f] via-[#c31f2e] via-40% to-[#0d1b30]",
    mark: <InstagramMark />,
  },
  {
    name: "TikTok",
    href: TIKTOK_URL,
    description: "Videos cortos con tips de envío y empaque.",
    features: ["Videos y tips", "Empaque y consejos", "Detrás de cámaras", "Novedades y más"],
    button: "Seguir en TikTok",
    background: "bg-gradient-to-br from-[#0d1b30] via-black to-[#0d1b30]",
    mark: <TikTokMark />,
  },
];

export default function AguilaSocial() {
  return (
    <section className="relative overflow-hidden bg-white px-5 py-20 sm:px-6">
      <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[44rem] -translate-x-1/2 rounded-full bg-[#d7a13f]/10 blur-3xl" />
      <div className="relative mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-black uppercase tracking-[.22em] text-[#c31f2e]">Síguenos en redes</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-[#0d1b30] sm:text-5xl">
            Síguenos y mantente al día
          </h2>
          <div className="mx-auto mt-5 h-1 w-16 rounded-full bg-[#c31f2e]" />
          <p className="mt-5 text-base font-semibold leading-7 text-[#0d1b30]/55 sm:text-lg">
            Publicamos rutas, promociones, consejos de envío y novedades todas las semanas.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {SOCIAL_CARDS.map((card) => (
            <article
              key={card.name}
              className={`group relative overflow-hidden rounded-[2rem] p-6 text-white shadow-[0_24px_60px_rgba(13,27,48,.16)] transition duration-300 hover:-translate-y-2 hover:shadow-[0_30px_80px_rgba(13,27,48,.24)] ${card.background}`}
            >
              <div className="pointer-events-none absolute -right-12 top-16 opacity-10 transition duration-500 group-hover:scale-110 group-hover:opacity-15">
                {card.mark}
              </div>

              <div className="relative flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/15 shadow-lg backdrop-blur">
                  {card.mark}
                </div>
                <div>
                  <h3 className="text-3xl font-black">{card.name}</h3>
                  <p className="mt-1 font-semibold leading-6 text-white/80">{card.description}</p>
                </div>
              </div>

              <div className="relative mt-7 space-y-3">
                {card.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3 font-bold">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-sm text-[#0d1b30]">
                      ✓
                    </span>
                    {feature}
                  </div>
                ))}
              </div>

              <a
                href={card.href}
                target="_blank"
                rel="noreferrer"
                className="relative mt-8 flex items-center justify-between rounded-2xl bg-white px-5 py-4 font-black text-[#0d1b30] shadow-lg transition hover:bg-[#f6f1e4]"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f6f1e4] text-[#0d1b30]">
                    {card.mark}
                  </span>
                  {card.button}
                </span>
                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
              </a>
            </article>
          ))}
        </div>

        <div className="mt-7 flex flex-col items-center justify-between gap-5 rounded-[2rem] border border-[#0d1b30]/10 bg-[#f6f1e4] p-6 sm:flex-row sm:px-8">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#c31f2e] text-white shadow-lg">
              <MessageCircle size={28} />
            </div>
            <div>
              <p className="text-xl font-black text-[#0d1b30]">¿Prefieres escribirnos directamente?</p>
              <p className="mt-1 font-semibold text-[#0d1b30]/55">Estamos listos para ayudarte.</p>
            </div>
          </div>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-[#c31f2e] px-7 py-4 text-lg font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#a91826] sm:w-auto"
          >
            <MessageCircle size={23} /> Hablar por WhatsApp <ArrowRight size={19} />
          </a>
        </div>
      </div>
    </section>
  );
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8 fill-current text-white">
      <path d="M14.5 8.5V6.7c0-.8.5-1 1-1h2.6V1.2L14.5 1C10.9 1 9 3.2 9 6.3v2.2H6v5h3V23h5.5v-9.5h3.3l.5-5h-3.8Z" />
    </svg>
  );
}

function InstagramMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8 fill-none stroke-current text-white" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8 fill-current text-white">
      <path d="M14.5 2h3.2c.3 2.1 1.5 3.6 3.3 4.3v3.2c-1.5 0-2.9-.4-4-1.2v7.1a6.4 6.4 0 1 1-5.5-6.3v3.3a3.1 3.1 0 1 0 2.9 3.1V2Z" />
    </svg>
  );
}
