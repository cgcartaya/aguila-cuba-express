"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, MessageCircle, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const slides = [
  { src: "/tumercadolajero/iglesia-ilustrada.jpeg", title: "Nuestra iglesia", alt: "Ilustración de la iglesia de San José de las Lajas rodeada de árboles", position: "center" },
  { src: "/tumercadolajero/edificio-ilustrado.jpeg", title: "Patrimonio local", alt: "Ilustración del edificio histórico azul y blanco de San José de las Lajas", position: "center" },
  { src: "/tumercadolajero/parque-ilustrado.jpeg", title: "Nuestro parque", alt: "Ilustración del gazebo del parque de San José de las Lajas junto a la iglesia", position: "center" },
];

export default function LajasBanner({ whatsapp, logoUrl }: { whatsapp: string; logoUrl?: string | null }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const move = (direction: number) => setActive((current) => (current + direction + slides.length) % slides.length);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (paused || interacting) return;
    const timer = window.setInterval(() => {
      if (!document.hidden && !preference.matches) setActive((current) => (current + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [paused, interacting, active]);

  const control = "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/50 bg-[#0B1F4D]/40 text-white backdrop-blur-sm transition hover:bg-[#0C8ACB] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F4B544]";

  return (
    <div
      role="region"
      aria-roledescription="carrusel"
      aria-label="Lugares de San José de las Lajas"
      className="relative isolate overflow-hidden bg-[#0B1F4D] text-white"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}
    >
      <div
        className="absolute inset-0 -z-20"
        style={{ touchAction: "pan-y" }}
        onTouchStart={(event) => { touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }}
        onTouchEnd={(event) => {
          if (!touchStart.current) return;
          const dx = touchStart.current.x - event.changedTouches[0].clientX;
          const dy = touchStart.current.y - event.changedTouches[0].clientY;
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
          touchStart.current = null;
        }}
        onTouchCancel={() => { touchStart.current = null; }}
      >
        {slides.map((slide, index) => (
          <div key={slide.src} aria-hidden={active !== index} className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${active === index ? "opacity-100" : "opacity-0"}`}>
            <Image src={slide.src} alt={slide.alt} fill preload={index === 0} sizes="100vw" className="object-cover" style={{ objectPosition: slide.position }} />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-[#061A39]/95 via-[#061A39]/50 to-[#061A39]/10" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-[#061A39]/85 via-transparent to-[#061A39]/10" />
      <div className="pointer-events-none mx-auto max-w-7xl px-5 pb-6 pt-10 sm:px-8 sm:pb-8 sm:pt-16 lg:pt-20">
        <div className="pointer-events-auto max-w-lg">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#F4B544] sm:text-sm">San José de las Lajas, Mayabeque</p>
          <h1 className="mt-4 text-[2.8rem] font-black leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-7xl">Tu mercado.<br /><span className="text-[#60D5EE]">Tu gente.</span><br />Más cerca.</h1>
          <p className="mt-5 max-w-sm text-base leading-7 text-white/85 sm:text-xl sm:leading-8">Compra online con la cercanía de nuestra tierra.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/tienda" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#E55B2D] px-5 text-sm font-bold shadow-lg transition hover:bg-[#C9471D] sm:min-h-14 sm:text-base">Explorar la tienda <ArrowRight size={20} /></Link>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/80 bg-[#0B1F4D]/35 px-5 text-sm font-bold backdrop-blur-sm transition hover:bg-[#0B1F4D]/70 sm:min-h-14 sm:text-base"><MessageCircle size={21} /> WhatsApp</a>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-4 lg:mt-14 lg:flex-row lg:items-end lg:gap-6">
          <div className="pointer-events-auto flex items-center gap-3 lg:order-1 lg:pb-2">
            <button type="button" onClick={() => setPaused((value) => !value)} aria-label={paused ? "Reproducir carrusel" : "Pausar carrusel"} className={control}>{paused ? <Play size={18} /> : <Pause size={18} />}</button>
            <span className="min-w-14 text-sm font-semibold tabular-nums">{String(active + 1).padStart(2, "0")} / 03</span>
            <button type="button" onClick={() => move(-1)} aria-label="Imagen anterior" className={control}><ChevronLeft size={23} /></button>
            <button type="button" onClick={() => move(1)} aria-label="Imagen siguiente" className={control}><ChevronRight size={23} /></button>
          </div>
          <div className="pointer-events-auto grid min-w-0 grid-cols-3 gap-2 lg:order-2 lg:flex-1 lg:gap-3" aria-label="Elegir foto del banner">
            {slides.map((slide, index) => (
              <button key={slide.src} type="button" onClick={() => setActive(index)} aria-label={`Mostrar ${slide.title}`} aria-current={active === index ? "true" : undefined} className={`relative aspect-[4/3] min-w-0 overflow-hidden rounded-xl border-[3px] text-left transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F4B544] sm:aspect-[16/9] ${active === index ? "border-[#F4B544] shadow-lg" : "border-white/80 hover:border-[#60D5EE]"}`}>
                <Image src={slide.src} alt="" fill sizes="(max-width: 1023px) 30vw, 240px" className="object-cover" style={{ objectPosition: slide.position }} />
                <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                <span className="absolute inset-x-1 bottom-1 text-center text-[10px] font-bold sm:inset-x-2 sm:bottom-2 sm:text-sm">{slide.title}</span>
              </button>
            ))}
          </div>
          <div className="hidden shrink-0 text-center lg:order-3 lg:block">
            <Image src={logoUrl || "/tumercadolajero/logo.jpeg"} alt="Tu Mercado Lajero" width={72} height={72} unoptimized={Boolean(logoUrl)} className="mx-auto h-16 w-16 rounded-full bg-white object-contain shadow-lg" />
            <p className="mt-2 text-xs font-bold">De aquí, para ti</p>
          </div>
        </div>
      </div>
    </div>
  );
}
