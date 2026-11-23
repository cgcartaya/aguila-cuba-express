"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ClipboardList, ShoppingBag, Truck } from "lucide-react";
import styles from "./order-journey-hero.module.css";

const steps = [
  { label: "Tienda online", status: "Compra realizada", icon: ShoppingBag },
  { label: "Panel de Perla", status: "Pedido confirmado", icon: ClipboardList },
  { label: "Seguimiento", status: "En camino", icon: Truck },
];

export default function OrderJourneyHero() {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timers: number[] = [];

    function stop() {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.length = 0;
    }

    function syncMotion() {
      stop();
      if (preference.matches || selectedStep !== null) return;
      timers.push(window.setTimeout(() => setActiveStep(1), 1400));
      timers.push(window.setTimeout(() => setActiveStep(2), 2800));
    }

    syncMotion();
    preference.addEventListener("change", syncMotion);
    return () => {
      stop();
      preference.removeEventListener("change", syncMotion);
    };
  }, [selectedStep]);

  const currentStep = selectedStep ?? activeStep;

  return (
    <section className={styles.hero} aria-labelledby="perla-hero-title">
      <div className={styles.intro}>
        <h1 id="perla-hero-title">
          De la tienda online <em>a la puerta de tu cliente.</em>
        </h1>
        <p>Crea tu tienda y gestiona tus pedidos, inventario y envíos con Perla.</p>
        <div className={styles.actions}>
          <Link className={styles.primary} href="/demo">
            Solicitar demo <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
          <a className={styles.secondary} href="#demos">Ver tiendas reales</a>
        </div>
      </div>

      <div className={styles.scene} data-step={currentStep}>
        <Image
          className={styles.photo}
          src="/perla/order-journey.webp"
          alt=""
          fill
          sizes="100vw"
          loading="eager"
        />
        <div className={styles.shade} aria-hidden="true" />
        <div className={styles.route} aria-hidden="true"><span /></div>
        <div className={styles.cards} role="group" aria-label="Ejemplo del recorrido del pedido 1204">
          {steps.map(({ label, status, icon: Icon }, index) => (
            <button
              key={label}
              className={styles.card}
              type="button"
              aria-pressed={currentStep === index}
              onClick={() => setSelectedStep(index)}
            >
              <span className={styles.icon}><Icon size={20} aria-hidden="true" /></span>
              <span className={styles.details}>
                <span>{label}</span>
                <strong>{status}</strong>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
