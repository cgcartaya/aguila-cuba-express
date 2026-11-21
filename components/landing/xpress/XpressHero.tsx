"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Calculator, ChevronLeft, ChevronRight, Clock, House, PackageSearch, Pause, Play, ShieldCheck } from "lucide-react";
import { xpress } from "./content";
import styles from "./xpress.module.css";

const banners = [
  { title: "Tus envíos a Cuba, más rápidos, seguros y confiables.", description: "", image: xpress.hero, href: "#cotizador", action: "Cotizar envío ahora" },
  { title: "Cajas marítimas de precio fijo", description: "Cinco tamaños desde $45. Consulta el precio según el tamaño y la cantidad de cajas.", image: "/xpress/boxes.webp", href: "#cajas", action: "Ver tamaños y precios" },
  { title: "Frutas frescas y congelados", description: "Servicio Express prioritario con preparación y conservación refrigerada. La Habana en 24 h y provincias en 48–72 h.", image: "/xpress/fresh.webp", href: "#cotizador", action: "Consultar servicio prioritario" },
  { title: "Compra en línea. Recibe con Xpress.", description: "Consulta cómo recibir compras de Amazon, Walmart y otras tiendas.", image: "/xpress/locker.webp", href: "/casillero", action: "Ver casillero virtual" },
];

export default function XpressHero({ logoUrl, lockersEnabled }: { logoUrl: string; lockersEnabled: boolean }) {
  const slides = lockersEnabled ? banners : banners.slice(0, -1);
  const slideCount = slides.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(preference.matches);
    sync();
    preference.addEventListener("change", sync);
    return () => preference.removeEventListener("change", sync);
  }, []);

  const rotating = !paused && !interacting && !focused && !reducedMotion;
  useEffect(() => {
    if (!rotating) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % slideCount), 7500);
    return () => window.clearInterval(timer);
  }, [rotating, active, slideCount]);

  function select(index: number) {
    setPaused(true);
    setActive((index + slideCount) % slideCount);
  }

  return (
    <section
      className={styles.hero}
      aria-roledescription="carrusel"
      aria-label="Servicios destacados"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStart.current = { x: touch.clientX, y: touch.clientY };
      }}
      onTouchCancel={() => { touchStart.current = null; }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (!start) return;
        const touch = event.changedTouches[0];
        const delta = touch.clientX - start.x;
        if (Math.abs(delta) > 48 && Math.abs(delta) > Math.abs(touch.clientY - start.y)) {
          select(active + (delta < 0 ? 1 : -1));
        }
      }}
    >
      <div className={styles.heroInside}>
        <div className={styles.heroMedia}>
          {slides.map((item, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={item.image}
              className={styles.heroPhoto}
              src={item.image}
              alt=""
              data-active={index === active}
              fetchPriority={index === 0 ? "high" : "low"}
              decoding="async"
            />
          ))}
        </div>
        <div className={styles.heroContent}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.heroLogo} src={logoUrl} alt={xpress.name} />
          <div className={styles.heroCopy} aria-live={rotating ? "off" : "polite"}>
            {slides.map((item, index) => (
              <div className={styles.heroSlide} key={item.title} aria-hidden={index !== active} inert={index !== active}>
                {index === 0
                  ? <h1 className={styles.heroTitle}>{item.title}</h1>
                  : <p className={styles.heroTitle}>{item.title}</p>}
                {index === 0 ? (
                  <ul className={styles.benefits}>
                    <li><Clock aria-hidden /> Express en La Habana en 24–48 h</li>
                    <li><ShieldCheck aria-hidden /> Seguridad y seguimiento</li>
                    <li><House aria-hidden /> Entrega a domicilio en Cuba</li>
                  </ul>
                ) : <p className={styles.heroDescription}>{item.description}</p>}
                <div className={styles.heroActions}>
                  <Link className={styles.primary} href={item.href}><Calculator size={17} aria-hidden />{item.action}</Link>
                  <Link className={styles.heroTrack} href="#rastreo"><PackageSearch size={17} aria-hidden />Rastrear paquete</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.controls}>
          <button className={styles.direction} type="button" onClick={() => select(active - 1)} aria-label="Banner anterior"><ChevronLeft size={20} /></button>
          {slides.map((item, index) => (
            <button className={styles.dot} key={item.title} type="button" onClick={() => select(index)} aria-label={`Ver banner ${index + 1}`} aria-current={index === active ? "true" : undefined} />
          ))}
          <button className={styles.direction} type="button" onClick={() => select(active + 1)} aria-label="Banner siguiente"><ChevronRight size={20} /></button>
          {!reducedMotion && <button type="button" onClick={() => setPaused(!paused)} aria-label={paused ? "Reproducir banners" : "Pausar banners"}>{paused ? <Play size={16} /> : <Pause size={16} />}</button>}
        </div>
      </div>
    </section>
  );
}
