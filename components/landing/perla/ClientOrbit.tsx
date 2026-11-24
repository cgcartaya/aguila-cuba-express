"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type TouchEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Globe2, Pause, Play, Sparkles } from "lucide-react";
import type { PerlaClient } from "@/lib/services/perla-showcase";
import { layoutClients } from "./client-layout";
import styles from "./client-orbit.module.css";

type ShowcaseClient = ReturnType<typeof layoutClients>["featured"][number];

function distance(index: number, active: number, count: number) {
  const forward = (index - active + count) % count;
  const backward = (active - index + count) % count;
  return forward <= backward ? forward : -backward;
}

export default function ClientOrbit({ clients }: { clients: PerlaClient[] }) {
  // The server already restricts this list to active stores with an enabled public showcase.
  const { featured, remaining } = layoutClients(clients);
  const items: ShowcaseClient[] = [...featured, ...remaining];
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(true);
  const container = useRef<HTMLElement>(null);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setReduced(media.matches);
      if (media.matches) setPlaying(false);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!container.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || reduced || !visible || items.length <= 1) return;
    const interval = window.setInterval(() => setActive(prev => (prev + 1) % items.length), 4700);
    return () => window.clearInterval(interval);
  }, [playing, reduced, visible, items.length]);

  if (!items.length) {
    return (
      <section id="clientes" className={styles.section}>
        <div className={styles.heading}><h2>Negocios que crecen con <span>Perla</span></h2>
          <p>Descubre cómo Perla puede acompañar a tu negocio.</p></div>
        <Link className={styles.cta} href="/demo">Solicitar demo <ArrowUpRight size={18} aria-hidden="true" /></Link>
      </section>
    );
  }

  function select(index: number) {
    setActive((index + items.length) % items.length);
  }

  function onKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") { event.preventDefault(); select(active - 1); }
    if (event.key === "ArrowRight") { event.preventDefault(); select(active + 1); }
  }

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchX.current = event.touches[0]?.clientX ?? null;
  }

  function onTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const end = event.changedTouches[0]?.clientX;
    if (touchX.current === null || end === undefined) return;
    const delta = touchX.current - end;
    touchX.current = null;
    if (Math.abs(delta) > 42) select(active + (delta > 0 ? 1 : -1));
  }

  const current = items[active];
  return (
    <section id="clientes" ref={container} className={styles.section}
      aria-labelledby="orbit-title">
      <div className={styles.heading}>
        <p className={styles.eyebrow}>PERLA MARKETPLACE · NUESTROS CLIENTES</p>
        <h2 id="orbit-title">Negocios que crecen con <span>Perla</span></h2>
        <p>Conoce las marcas que forman parte de nuestra plataforma.</p>
      </div>

      <div className={styles.stage} onKeyDown={onKeys} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        role="group" aria-roledescription="carrusel" aria-label="Negocios de Perla">
        <div className={styles.world} aria-hidden="true">
          <div className={styles.worldGlow}/>
          <div className={styles.globe}><div className={styles.meridians}/></div>
          <div className={styles.orbitRing}/>
          <div className={styles.orbitRingBack}/>
        </div>

        <div className={styles.cards}>
          {items.map((item, index) => {
            const offset = distance(index, active, items.length);
            const abs = Math.abs(offset);
            const displayed = abs <= 2 || (items.length <= 6 && abs <= 3);
            const isFront = offset === 0;
            // Cards are positioned around a shallow elliptical 3D orbit; far-away items are inert.
            const position = {
              "--offset": offset,
              "--abs": abs,
              "--depth": isFront ? 5 : Math.max(1, 4 - abs),
              "--x": `${offset * 68}%`,
              "--scale": isFront ? 1 : abs === 1 ? .79 : .62,
              "--angle": `${-offset * 12}deg`,
            } as CSSProperties;

            return (
              <article key={item.id} className={styles.orbitCard} style={position}
                data-front={isFront} data-hidden={!displayed}
                aria-hidden={!displayed} inert={!displayed ? true : undefined}>
                <div className={styles.cardTop}>
                  <span className={styles.monogram} aria-hidden="true">{item.displayName.charAt(0)}</span>
                  <h3>{item.displayName}</h3>
                  {isFront && <span className={styles.focusTag}>En foco</span>}
                </div>
                <div className={styles.screenshot}>
                  {item.preview ? (
                    <Image src={item.preview} alt={`Imagen de presentación de ${item.displayName}`} fill
                      className={item.previewIsLogo ? styles.logoPreview : undefined}
                      sizes="(max-width: 680px) 82vw, (max-width: 1100px) 50vw, 420px"
                      priority={index===0} />
                  ) : (
                    <div className={styles.noScreenshot}>
                      {item.logo ? (
                        <Image src={item.logo} alt="" fill className={styles.logoPreview} sizes="(max-width: 680px) 75vw, 350px" />
                      ) : <Globe2 size={35} aria-hidden="true" />}
                      <strong>{item.displayName}</strong>
                      <span>Negocio en Perla</span>
                    </div>
                  )}
                </div>
                <div className={styles.cardBottom}>
                  {isFront ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className={styles.visit}>
                      Visitar sitio <ArrowUpRight size={17} aria-hidden="true" />
                    </a>
                  ) : (
                    <button type="button" className={styles.bringForward} onClick={() => select(index)}
                      aria-label={`Mostrar ${item.displayName} al frente`} tabIndex={displayed ? 0 : -1}>
                      Ver negocio <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className={styles.navigation}>
        <button type="button" onClick={() => select(active - 1)}
          aria-label="Negocio anterior"><ArrowLeft size={20} aria-hidden="true" /></button>
        <span className={styles.counter} aria-live="off">{active + 1} / {items.length} · {current.displayName}</span>
        <button type="button" onClick={() => select(active + 1)}
          aria-label="Siguiente negocio"><ArrowRight size={20} aria-hidden="true" /></button>
        <button type="button" className={styles.playButton}
          onClick={() => setPlaying(value => !value)}
          aria-label={playing ? "Pausar rotación" : "Reproducir rotación"}
          aria-pressed={playing}>
          {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
        </button>
      </div>
      <div className={styles.callout}>
        <Sparkles size={23} aria-hidden="true" />
        <strong>Tu negocio también puede estar aquí</strong>
        <Link href="/demo">Solicitar demo <ArrowUpRight size={17} aria-hidden="true" /></Link>
      </div>
    </section>
  );
}
