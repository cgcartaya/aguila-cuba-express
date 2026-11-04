"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { slides } from "./content";
import s from "./wfcargo.module.css";
export default function PromotionSlider() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  useEffect(() => {
    if (
      paused ||
      hover ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const timer = setInterval(() => {
      if (!document.hidden) setActive((i) => (i + 1) % slides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [paused, hover]);
  return (
    <section
      id="inicio"
      className={s.hero}
      aria-label="Promociones de WF Cargo"
      aria-roledescription="carrusel"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocusCapture={() => setPaused(true)}
    >
      <div className={s.heroStage}>
        {slides.map((item, index) => (
          <div
            key={item.image}
            className={`${s.heroGrid} ${s.heroSlide} ${index === active ? s.heroSlideActive : ""}`}
            aria-hidden={index !== active}
            inert={index !== active}
          >
            <div className={s.heroCopy}>
              <p className={s.eyebrow}>{item.tag}</p>
              <h1>{item.title}</h1>
              <p>{item.description}</p>
              <div className={s.actions}>
                <a className={s.button} href={item.href}>
                  {item.label}
                  <ArrowRight size={19} />
                </a>
                <a className={s.outline} href="#recogida">
                  Solicitar recogida
                </a>
              </div>
              <span className={s.heroNote}>
                Dos sucursales · Atención personalizada
              </span>
            </div>
            <div className={`${s.heroImage} ${s.photo}`}>
              <Image
                src={item.image}
                alt={item.alt}
                fill
                sizes="(max-width: 760px) 100vw, 52vw"
                className={s.cover}
                preload={index === 0}
                loading={index === 0 ? undefined : "eager"}
              />
            </div>
          </div>
        ))}
      </div>
      <div className={s.sliderControls}>
        <div className={s.dots}>
          {slides.map((item, i) => (
            <button
              key={item.image}
              aria-label={`Ver promoción: ${item.tag}`}
              aria-pressed={i === active}
              className={i === active ? s.dotActive : ""}
              onClick={() => {
                setActive(i);
                setPaused(true);
              }}
            />
          ))}
        </div>
        <span>
          {String(active + 1).padStart(2, "0")} /{" "}
          {String(slides.length).padStart(2, "0")}
        </span>
        <button
          aria-label="Promoción anterior"
          onClick={() => {
            setActive((active + slides.length - 1) % slides.length);
            setPaused(true);
          }}
        >
          <ArrowLeft size={19} />
        </button>
        <button
          aria-label={paused ? "Reproducir promociones" : "Pausar promociones"}
          onClick={() => setPaused(!paused)}
        >
          {paused ? <Play size={17} /> : <Pause size={17} />}
        </button>
        <button
          aria-label="Siguiente promoción"
          onClick={() => {
            setActive((active + 1) % slides.length);
            setPaused(true);
          }}
        >
          <ArrowRight size={19} />
        </button>
      </div>
    </section>
  );
}
