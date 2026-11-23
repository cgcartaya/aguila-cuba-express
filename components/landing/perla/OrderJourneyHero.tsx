"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  ClipboardCheck,
  Layers3,
  PackageCheck,
  Pause,
  Play,
  ShoppingBag,
  Truck,
  UtensilsCrossed,
} from "lucide-react";
import styles from "./order-journey-hero.module.css";

const steps = [
  {
    label: "Tienda online",
    status: "Compra realizada",
    detail: "El cliente elige y confirma su compra.",
    icon: ShoppingBag,
  },
  {
    label: "Panel de Perla",
    status: "Pedido confirmado",
    detail: "Tu equipo organiza las órdenes y el inventario.",
    icon: ClipboardCheck,
  },
  {
    label: "Seguimiento",
    status: "Pedido en camino",
    detail: "El cliente conoce el estado de su entrega.",
    icon: Truck,
  },
] as const;

export default function OrderJourneyHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setReducedMotion(media.matches);
      if (media.matches) setIsPlaying(false);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!sectionRef.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.15 },
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isPlaying || !isVisible || reducedMotion) return;
    const timer = window.setInterval(() => setActiveStep((step) => (step + 1) % steps.length), 2700);
    return () => window.clearInterval(timer);
  }, [isPlaying, isVisible, reducedMotion]);

  function chooseStep(index: number) {
    setActiveStep(index);
    setIsPlaying(false);
  }

  function togglePlayback() {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    setReducedMotion(false);
    setIsPlaying(true);
  }

  return (
    <section ref={sectionRef} className={styles.hero} aria-labelledby="perla-hero-title">
      <div className={styles.visual} aria-hidden="true">
        <Image
          className={styles.photo}
          src="/perla/order-journey.webp"
          alt=""
          fill
          priority
          sizes="100vw"
        />
        <div className={styles.shade} />
        <div className={styles.gridTexture} />
      </div>

      <div className={styles.inner}>
        <div className={styles.intro}>
          <div className={styles.eyebrow}><span className={styles.sparkle} /> Una plataforma. Tu negocio conectado.</div>
          <h1 id="perla-hero-title">
            Todo tu negocio.
            <span>Una sola plataforma.</span>
          </h1>
          <p>
            Crea tu presencia online, vende, administra pedidos y conecta tus operaciones
            con las herramientas que tu negocio necesita.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/demo">
              Solicitar una demo <ArrowUpRight size={19} aria-hidden="true" />
            </Link>
            <a className={styles.secondary} href="#demos">
              <Play size={17} fill="currentColor" aria-hidden="true" /> Explorar ejemplos
            </a>
          </div>
          <div className={styles.capabilities} aria-label="Soluciones de Perla">
            <span><ShoppingBag size={15} aria-hidden="true" /> Tiendas</span>
            <span><Truck size={15} aria-hidden="true" /> Envíos</span>
            <span><UtensilsCrossed size={15} aria-hidden="true" /> Restaurantes</span>
            <span><Layers3 size={15} aria-hidden="true" /> Multiempresa</span>
          </div>
        </div>

        <div className={styles.journey}>
          <div className={styles.journeyHeader}>
            <div>
              <span className={styles.journeyKicker}><span /> VISTA INTERACTIVA</span>
              <h2>De una venta a una entrega, <em>todo conectado.</em></h2>
              <p>Ejemplo ilustrativo: selecciona cada paso para conocer el proceso.</p>
            </div>
            <button
              type="button"
              className={styles.playback}
              onClick={togglePlayback}
              aria-label={isPlaying ? "Pausar recorrido automático" : "Reproducir recorrido automático"}
              aria-pressed={isPlaying}
            >
              {isPlaying ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
              <span>{isPlaying ? "Pausar" : "Reproducir"}</span>
            </button>
          </div>

          <div className={styles.cards} role="group" aria-label="Recorrido ilustrativo de un pedido">
            {steps.map(({ label, status, detail, icon: Icon }, index) => (
              <button
                key={label}
                type="button"
                className={styles.card}
                data-active={activeStep === index}
                aria-pressed={activeStep === index}
                onClick={() => chooseStep(index)}
              >
                <span className={styles.cardTop}>
                  <span className={styles.cardIcon}><Icon size={19} aria-hidden="true" /></span>
                  <span className={styles.stepNumber}>0{index + 1}</span>
                </span>
                <span className={styles.cardTitle}>{label}</span>
                <span className={styles.cardStatus}><Check size={13} aria-hidden="true" /> {status}</span>
                <span className={styles.cardDetail}>{detail}</span>
                <span className={styles.cardProgress} aria-hidden="true"><i /></span>
                {index < steps.length - 1 && (
                  <span className={styles.connector} aria-hidden="true"><ChevronRight size={17} /></span>
                )}
              </button>
            ))}
          </div>
          <div className={styles.journeyBottom}>
            <span><PackageCheck size={15} aria-hidden="true" /> Demostración visual · Sin datos reales</span>
            <a href="#modulos">Descubre todos los módulos <ArrowRight size={16} aria-hidden="true" /></a>
          </div>
        </div>
      </div>
    </section>
  );
}
