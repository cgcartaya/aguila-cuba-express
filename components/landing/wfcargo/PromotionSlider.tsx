"use client";
import { wfCopy, type WfLocale } from "./Language";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { englishSlides, slides as spanishSlides } from "./content";
import s from "./wfcargo.module.css";
export default function PromotionSlider({ locale }: { locale: WfLocale }) {
  const t = wfCopy(locale);
  const slides = locale === "en" ? englishSlides : spanishSlides;
  const slideCount = slides.length;
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
      if (!document.hidden) setActive((i) => (i + 1) % slideCount);
    }, 7000);
    return () => clearInterval(timer);
  }, [paused, hover, slideCount]);
  return (
    <section
      id="inicio"
      className={s.hero}
      aria-label={t("Promociones de WF Cargo", "WF Cargo promotions")}
      aria-roledescription={t("carrusel", "carousel")}
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
                  {t("Solicitar recogida", "Request a pickup")}
                </a>
              </div>
              <span className={s.heroNote}>
                {t("Dos sucursales · Atención personalizada", "Two locations · Personalized service")}
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
              aria-label={`${t("Ver promoción", "View promotion")}: ${item.tag}`}
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
          aria-label={t("Promoción anterior", "Previous promotion")}
          onClick={() => {
            setActive((active + slides.length - 1) % slides.length);
            setPaused(true);
          }}
        >
          <ArrowLeft size={19} />
        </button>
        <button
          aria-label={paused ? t("Reproducir promociones", "Play promotions") : t("Pausar promociones", "Pause promotions")}
          onClick={() => setPaused(!paused)}
        >
          {paused ? <Play size={17} /> : <Pause size={17} />}
        </button>
        <button
          aria-label={t("Siguiente promoción", "Next promotion")}
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
