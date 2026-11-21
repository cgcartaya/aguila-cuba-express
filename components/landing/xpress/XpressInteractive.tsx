"use client";

import { useEffect, useRef, useState } from "react";
import { Calculator, ChevronLeft, ChevronRight, Clock, House, PackageSearch, Pause, Play, ShieldCheck } from "lucide-react";
import { transportRates, xpress, xpressWhatsApp } from "./content";
import styles from "./xpress.module.css";

const slides = [
  { title: "Tus envíos a Cuba, más rápidos, seguros y confiables.", description: "", image: xpress.hero, href: "#cotizador", action: "Cotizar envío ahora" },
  { title: "Cajas marítimas de precio fijo", description: "Cinco tamaños desde $45. Consulta el precio según el tamaño y la cantidad de cajas.", image: "/xpress/boxes.webp", href: "#cajas", action: "Ver tamaños y precios" },
  { title: "Frutas frescas y congelados", description: "Servicio Express prioritario con preparación y conservación refrigerada.", image: "/xpress/fresh.webp", href: "#frutas", action: "Ver servicio prioritario" },
  { title: "Compra en línea. Recibe con Xpress.", description: "Consulta cómo recibir compras de Amazon, Walmart y otras tiendas.", image: "/xpress/locker.webp", href: "#casillero", action: "Ver casillero virtual" },
];

export function XpressHero({ logoUrl }: { logoUrl?: string | null }) {
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
    const timer = window.setInterval(() => setActive((index) => (index + 1) % slides.length), 7500);
    return () => window.clearInterval(timer);
  }, [rotating, active]);

  function select(index: number) {
    setPaused(true);
    setActive((index + slides.length) % slides.length);
  }

  const slide = slides[active];
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={slide.image} className={styles.heroPhoto} src={slide.image} alt="" fetchPriority={active === 0 ? "high" : "auto"} />
      <div className={styles.heroInside}>
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.heroLogo} src={logoUrl} alt={xpress.name} />
        )}
        <div className={styles.heroCopy} aria-live={rotating ? "off" : "polite"}>
          <h1 className={styles.visuallyHidden}>Tus envíos a Cuba, más rápidos, seguros y confiables.</h1>
          <p className={styles.heroTitle} aria-hidden={active === 0 ? true : undefined}>{slide.title}</p>
          {active === 0 ? (
            <ul className={styles.benefits}>
              <li><Clock aria-hidden /> Express en La Habana en 24–48 h</li>
              <li><ShieldCheck aria-hidden /> Seguridad y seguimiento</li>
              <li><House aria-hidden /> Entrega a domicilio en Cuba</li>
            </ul>
          ) : <p className={styles.heroDescription}>{slide.description}</p>}
          <div className={styles.actions}>
            <a className={styles.primary} href={slide.href}><Calculator size={19} aria-hidden />{slide.action}</a>
            <a className={styles.outline} href="#rastreo"><PackageSearch size={19} aria-hidden />Rastrear paquete</a>
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

export function XpressQuoteInquiry() {
  const [service, setService] = useState("");
  return (
    <div className={styles.quote}>
      <h2><Calculator aria-hidden /> Cotiza tu envío</h2>
      <div className={styles.quoteBody}>
        <label htmlFor="xpress-service">Modalidad de envío</label>
        <select id="xpress-service" value={service} onChange={(event) => setService(event.target.value)}>
          <option value="">Selecciona la modalidad</option>
          {transportRates.map(({ name }) => <option key={name}>{name}</option>)}
          <option>Cajas marítimas</option>
          <option>Frutas y congelados</option>
        </select>
        <p>Indícanos el municipio de entrega y el peso o la cantidad para confirmar el precio.</p>
        <a className={styles.primary} href={xpressWhatsApp(service ? `Hola, quisiera cotizar: ${service}.` : "Hola, quisiera cotizar un envío a Cuba.")}>
          Solicitar cotización
        </a>
      </div>
    </div>
  );
}
