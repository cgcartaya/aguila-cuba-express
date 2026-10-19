"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, MapPin, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const slides = [
  { src: "/tumercadolajero/iglesia.jpeg", title: "Nuestras raíces", description: "Lajas, Cienfuegos", position: "center 60%" },
  { src: "/tumercadolajero/edificio-historico.jpeg", title: "Lugares que nos unen", description: "El encanto de nuestra tierra", position: "center" },
  { src: "/tumercadolajero/parque-iglesia.jpeg", title: "Orgullo lajero", description: "De aquí, para ti", position: "center 58%" },
];

export default function LajasBanner() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const touchStart = useRef<number | null>(null);
  const move = (direction: number) => setActive((current) => (current + direction + slides.length) % slides.length);

  useEffect(() => {
    if (paused || hovered || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActive((current) => (current + 1) % slides.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [paused, hovered, active]);

  return (
    <div
      role="region"
      aria-roledescription="carrusel"
      aria-label="Imágenes de Lajas"
      className="relative overflow-hidden rounded-[2rem] border-4 border-white bg-[#0B1F4D] shadow-2xl shadow-[#0B1F4D]/20 sm:rounded-[2.5rem]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setHovered(false); }}
      onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }}
      onTouchEnd={(event) => {
        if (touchStart.current === null) return;
        const distance = touchStart.current - event.changedTouches[0].clientX;
        if (Math.abs(distance) > 40) move(distance > 0 ? 1 : -1);
        touchStart.current = null;
      }}
    >
      <div className="relative aspect-[4/3] sm:aspect-[5/4] lg:aspect-[4/5] xl:aspect-[5/4]" style={{ touchAction: "pan-y" }}>
        {slides.map((slide, index) => (
          <div key={slide.src} aria-hidden={index !== active} className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${index === active ? "opacity-100" : "opacity-0"}`}>
            <Image src={slide.src} alt={slide.description} fill preload={index === 0} sizes="(max-width: 1023px) 100vw, 52vw" className="object-cover" style={{ objectPosition: slide.position }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F4D]/90 via-[#0B1F4D]/5 to-transparent" />
          </div>
        ))}
        <div className="absolute inset-x-5 bottom-16 text-white sm:inset-x-7 sm:bottom-20" aria-live={paused ? "polite" : "off"}>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#A4E687]"><MapPin size={16} /> {slides[active].description}</p>
          <p className="mt-2 text-2xl font-black sm:text-4xl">{slides[active].title}</p>
        </div>
        <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 sm:inset-x-6 sm:bottom-5">
          <div className="flex gap-1" aria-label="Elegir imagen">
            {slides.map((slide, index) => <button key={slide.src} type="button" onClick={() => setActive(index)} aria-label={`Ver imagen ${index + 1}: ${slide.title}`} aria-current={active === index ? "true" : undefined} className="flex h-11 min-w-9 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-white"><span className={`h-2 rounded-full transition-all ${active === index ? "w-8 bg-[#F4B544]" : "w-2 bg-white/60"}`} /></button>)}
          </div>
          <div className="flex gap-1">
            <button type="button" onClick={() => move(-1)} aria-label="Imagen anterior" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-[#0B1F4D]/40 text-white hover:bg-[#0C8ACB]"><ChevronLeft size={20} /></button>
            <button type="button" onClick={() => setPaused(!paused)} aria-label={paused ? "Reproducir carrusel" : "Pausar carrusel"} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-[#0B1F4D]/40 text-white hover:bg-[#0C8ACB]">{paused ? <Play size={16} /> : <Pause size={16} />}</button>
            <button type="button" onClick={() => move(1)} aria-label="Imagen siguiente" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-[#0B1F4D]/40 text-white hover:bg-[#0C8ACB]"><ChevronRight size={20} /></button>
          </div>
        </div>
      </div>
      <div className="flex h-2"><span className="flex-1 bg-[#0C8ACB]" /><span className="flex-1 bg-[#50A13A]" /><span className="flex-1 bg-[#F4B544]" /><span className="flex-1 bg-[#E55B2D]" /></div>
    </div>
  );
}
