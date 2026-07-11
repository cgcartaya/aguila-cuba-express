"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Box,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Menu,
  MessageCircle,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  WalletCards,
  X,
} from "lucide-react";

const WHATSAPP_URL = "https://wa.me/13054974891";
const STORE_URL = "/tienda";
const TRACKING_URL = "/rastrear";

const slides = [
  {
    image: "/hero-banner.webp",
    eyebrow: "Envíos a Cuba",
    title: "Tu envío llega más lejos con Águila",
    description:
      "Recogemos, preparamos y enviamos tus paquetes desde Miami hacia Cuba con atención personalizada.",
    primaryLabel: "Entrar a la tienda",
    primaryHref: STORE_URL,
    secondaryLabel: "Rastrear envío",
    secondaryHref: TRACKING_URL,
  },
  {
    image: "/slide-store.webp",
    eyebrow: "Tienda online",
    title: "Compra productos y envíalos directamente a Cuba",
    description:
      "Encuentra tecnología, alimentos, combos y mucho más desde una sola tienda.",
    primaryLabel: "Ver productos",
    primaryHref: STORE_URL,
    secondaryLabel: "Hablar por WhatsApp",
    secondaryHref: WHATSAPP_URL,
  },
  {
    image: "/slide-tracking.webp",
    eyebrow: "Rastreo en línea",
    title: "Consulta el estado de tu envío en segundos",
    description:
      "Revisa el progreso de tu paquete y mantente informado durante todo el proceso.",
    primaryLabel: "Rastrear ahora",
    primaryHref: TRACKING_URL,
    secondaryLabel: "Ir a la tienda",
    secondaryHref: STORE_URL,
  },
];

const links = [
  { label: "Inicio", href: "/" },
  { label: "Servicios", href: "/servicios" },
  { label: "Tienda", href: STORE_URL },
  { label: "Rastrear envío", href: TRACKING_URL },
  { label: "Contacto", href: "/contacto" },
];

const services = [
  {
    icon: Box,
    title: "Envío de paquetes",
    description: "Paquetería segura desde Miami hacia Cuba.",
  },
  {
    icon: ShoppingBag,
    title: "Compras en USA",
    description: "Compra en nuestra tienda y coordina el envío.",
  },
  {
    icon: WalletCards,
    title: "Envío de dinero",
    description: "Atención personalizada para tus familiares.",
  },
  {
    icon: ShieldCheck,
    title: "Seguridad garantizada",
    description: "Seguimiento y cuidado durante todo el proceso.",
  },
];

export default function AguilaLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  const slide = slides[activeSlide];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 7000);

    return () => window.clearInterval(interval);
  }, []);

  const goNext = () => {
    setActiveSlide((current) => (current + 1) % slides.length);
  };

  const goPrevious = () => {
    setActiveSlide(
      (current) => (current - 1 + slides.length) % slides.length
    );
  };

  return (
    <main className="min-h-screen bg-white text-slate-950">
      {/* =====================================================
          HEADER
      ====================================================== */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#041c35]/95 text-white shadow-lg backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <Image
              src="/logo.webp"
              alt="Águila Cuba Express"
              width={72}
              height={72}
              priority
              className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14"
            />

            <div className="min-w-0">
              <p className="truncate text-sm font-black leading-none sm:text-lg">
                ÁGUILA <span className="text-red-500">CUBA EXPRESS</span>
              </p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.28em] text-white/65 sm:text-[11px]">
                Envíos a Cuba
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold lg:flex">
            {links.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`transition hover:text-red-400 ${
                  item.href === STORE_URL
                    ? "rounded-full bg-white/10 px-4 py-2 text-white ring-1 ring-white/15"
                    : "text-white/85"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black transition hover:bg-white/15"
            >
              <MessageCircle size={18} />
              WhatsApp
            </a>

            <Link
              href={STORE_URL}
              className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-950/25 transition hover:bg-red-500"
            >
              <Store size={18} />
              Ir a la tienda
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 lg:hidden"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-white/10 bg-[#03172d] px-4 py-4 lg:hidden">
            <nav className="mx-auto grid max-w-7xl gap-2">
              {links.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-2xl px-4 py-3 text-sm font-black ${
                    item.href === STORE_URL
                      ? "bg-red-600 text-white"
                      : "text-white/85 hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </Link>
              ))}

              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-green-500 px-4 py-3 text-sm font-black"
              >
                <MessageCircle size={18} />
                Contactar por WhatsApp
              </a>
            </nav>
          </div>
        )}
      </header>

      {/* =====================================================
          HERO
      ====================================================== */}
      <section className="relative isolate min-h-[680px] overflow-hidden bg-slate-100">
        {slides.map((item, index) => (
          <Image
            key={item.image}
            src={item.image}
            alt={item.eyebrow}
            fill
            priority={index === 0}
            className={`object-cover object-center transition-opacity duration-700 ${
              index === activeSlide ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}

        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-white/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-white/55 via-transparent to-transparent" />

        <div className="relative z-10 mx-auto flex min-h-[680px] max-w-7xl items-center px-5 py-20 sm:px-6">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-red-600 ring-1 ring-red-100">
              <PackageCheck size={16} />
              {slide.eyebrow}
            </div>

            <h1 className="max-w-2xl text-4xl font-black leading-[0.98] tracking-tight text-[#062446] sm:text-6xl lg:text-7xl">
              {slide.title}
            </h1>

            <p className="mt-6 max-w-xl text-base font-semibold leading-7 text-slate-600 sm:text-xl">
              {slide.description}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={slide.primaryHref}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-7 py-4 text-base font-black text-white shadow-xl shadow-red-950/20 transition hover:-translate-y-0.5 hover:bg-red-500"
              >
                <ShoppingBag size={20} />
                {slide.primaryLabel}
                <ArrowRight size={18} />
              </Link>

              {slide.secondaryHref.startsWith("http") ? (
                <a
                  href={slide.secondaryHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#062446] px-7 py-4 text-base font-black text-white shadow-lg transition hover:-translate-y-0.5"
                >
                  <MessageCircle size={20} />
                  {slide.secondaryLabel}
                </a>
              ) : (
                <Link
                  href={slide.secondaryHref}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#062446] px-7 py-4 text-base font-black text-white shadow-lg transition hover:-translate-y-0.5"
                >
                  <Search size={20} />
                  {slide.secondaryLabel}
                </Link>
              )}
            </div>

            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
              {[
                ["Recogida", "En todo Miami"],
                ["Atención", "Personalizada"],
                ["Seguimiento", "De principio a fin"],
              ].map(([title, text]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur"
                >
                  <p className="text-xs font-black uppercase tracking-wide text-red-600">
                    {title}
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#062446]">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={goPrevious}
          aria-label="Banner anterior"
          className="absolute left-4 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#062446] shadow-lg transition hover:bg-white sm:flex"
        >
          <ChevronLeft size={26} />
        </button>

        <button
          type="button"
          onClick={goNext}
          aria-label="Siguiente banner"
          className="absolute right-4 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#062446] shadow-lg transition hover:bg-white sm:flex"
        >
          <ChevronRight size={26} />
        </button>

        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {slides.map((item, index) => (
            <button
              type="button"
              key={item.image}
              onClick={() => setActiveSlide(index)}
              aria-label={`Mostrar banner ${index + 1}`}
              className={`h-2.5 rounded-full transition-all ${
                index === activeSlide
                  ? "w-9 bg-red-600"
                  : "w-2.5 bg-[#062446]/25"
              }`}
            />
          ))}
        </div>
      </section>

      {/* =====================================================
          STORE QUICK ACCESS
      ====================================================== */}
      <section className="relative z-20 -mt-8 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#062446] shadow-2xl">
          <div className="grid items-center gap-6 p-6 text-white md:grid-cols-[1fr_auto] md:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-600">
                <Store size={28} />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-red-300">
                  Acceso rápido
                </p>
                <h2 className="mt-1 text-2xl font-black sm:text-3xl">
                  Encuentra lo que necesitas en nuestra tienda
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/70">
                  Productos, combos y categorías organizadas para comprar de forma rápida y sencilla.
                </p>
              </div>
            </div>

            <Link
              href={STORE_URL}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-7 py-4 font-black text-white shadow-lg shadow-black/20 transition hover:bg-red-500 md:w-auto"
            >
              Abrir tienda online
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================
          OPERATION CARDS
      ====================================================== */}
      <section className="bg-slate-50 px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600">
              <Truck size={24} />
            </div>

            <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-red-600">
              Recogida a domicilio
            </p>

            <h3 className="mt-3 text-3xl font-black text-[#062446]">
              Recogemos tu paquete en todo Miami
            </h3>

            <p className="mt-4 leading-7 text-slate-600">
              Coordina la recogida directamente desde tu casa. Nosotros preparamos el envío y te acompañamos durante el proceso.
            </p>

            <a
              href={`${WHATSAPP_URL}?text=Hola,%20quiero%20solicitar%20recogida%20a%20domicilio%20para%20un%20paquete.`}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-green-500 px-6 py-3.5 font-black text-white transition hover:bg-green-600"
            >
              <MessageCircle size={19} />
              Solicitar recogida
            </a>
          </article>

          <article className="rounded-[2rem] bg-[#062446] p-7 text-white shadow-xl sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <Clock3 size={24} />
            </div>

            <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-red-300">
              Próxima salida
            </p>

            <h3 className="mt-3 text-3xl font-black">Salida hacia Cuba</h3>

            <div className="mt-6 rounded-3xl bg-white/10 p-6 ring-1 ring-white/10">
              <p className="text-sm font-bold text-white/60">Día de salida</p>
              <p className="mt-1 text-4xl font-black">Viernes</p>
              <p className="mt-2 text-sm font-medium text-white/65">
                Recibimos paquetes hasta el jueves.
              </p>
            </div>

            <a
              href={`${WHATSAPP_URL}?text=Hola,%20quiero%20información%20sobre%20la%20próxima%20salida%20hacia%20Cuba.`}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-red-600 px-6 py-3.5 font-black text-white transition hover:bg-red-500"
            >
              Consultar salida
              <ArrowRight size={18} />
            </a>
          </article>
        </div>
      </section>

      {/* =====================================================
          STORE FEATURE
      ====================================================== */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[2.25rem] bg-[#041c35] shadow-2xl lg:grid-cols-2">
          <div className="flex flex-col justify-center p-8 text-white sm:p-12">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300">
              Tienda online
            </p>

            <h3 className="mt-4 text-4xl font-black leading-tight">
              Compra hoy y nosotros coordinamos el envío a Cuba
            </h3>

            <p className="mt-5 max-w-xl text-base font-medium leading-7 text-white/70">
              Explora categorías, revisa productos disponibles y realiza tu pedido desde cualquier dispositivo.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={STORE_URL}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-7 py-4 font-black text-white transition hover:bg-red-500"
              >
                <ShoppingBag size={20} />
                Comprar ahora
              </Link>

              <Link
                href={TRACKING_URL}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-7 py-4 font-black text-white ring-1 ring-white/15 transition hover:bg-white/15"
              >
                <Search size={20} />
                Rastrear envío
              </Link>
            </div>
          </div>

          <div className="relative min-h-[360px]">
            <Image
              src="/services-boxes.webp"
              alt="Tienda Águila Cuba Express"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* =====================================================
          SERVICES
      ====================================================== */}
      <section className="bg-slate-50 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-red-600">
              Lo que hacemos
            </p>
            <h3 className="mt-3 text-3xl font-black text-[#062446] sm:text-4xl">
              Servicios pensados para ayudarte
            </h3>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => {
              const Icon = service.icon;

              return (
                <article
                  key={service.title}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#062446]">
                    <Icon size={24} />
                  </div>

                  <h4 className="mt-5 text-lg font-black text-[#062446]">
                    {service.title}
                  </h4>

                  <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                    {service.description}
                  </p>
                </article>
              );
            })}
          </div>

          <div className="mt-8 text-center">
            <Link
              href={STORE_URL}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#062446] px-7 py-4 font-black text-white transition hover:bg-[#0a315c]"
            >
              Ver productos disponibles
              <ArrowRight size={19} />
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================
          LOCATION
      ====================================================== */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-red-600">
              Ubicación
            </p>

            <h3 className="mt-3 text-3xl font-black text-[#062446] sm:text-4xl">
              Visítanos en North Miami
            </h3>

            <p className="mt-3 text-base font-medium text-slate-600">
              2150 Sans Souci Blvd, North Miami, FL 33181
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <iframe
                title="Ubicación de Águila Cuba Express"
                src="https://www.google.com/maps?q=2150%20Sans%20Souci%20Blvd%20North%20Miami%20FL%2033181&output=embed"
                className="h-[420px] w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <MapPin size={24} />
              </div>

              <h4 className="mt-5 text-2xl font-black text-[#062446]">
                Águila Cuba Express
              </h4>

              <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
                Estamos en North Miami y también ofrecemos recogida a domicilio en todo Miami.
              </p>

              <div className="mt-6 space-y-3 text-sm font-bold text-[#062446]">
                <p>2150 Sans Souci Blvd</p>
                <p>North Miami, FL 33181</p>
                <p>Envíos a Cuba</p>
                <p>Recogida a domicilio</p>
              </div>

              <div className="mt-7 grid gap-3">
                <a
                  href="https://www.google.com/maps/search/?api=1&query=2150%20Sans%20Souci%20Blvd%20North%20Miami%20FL%2033181"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#062446] px-6 py-3.5 font-black text-white"
                >
                  <MapPin size={19} />
                  Cómo llegar
                </a>

                <Link
                  href={STORE_URL}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 py-3.5 font-black text-white"
                >
                  <Store size={19} />
                  Ir a la tienda
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          FINAL CTA
      ====================================================== */}
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-red-600 px-6 py-10 text-center text-white shadow-xl sm:px-10">
          <h3 className="text-3xl font-black sm:text-4xl">
            Todo lo que necesitas, más fácil de encontrar
          </h3>

          <p className="mx-auto mt-3 max-w-2xl text-base font-medium text-white/80">
            Entra a la tienda, revisa las categorías y coordina tu pedido con nuestro equipo.
          </p>

          <Link
            href={STORE_URL}
            className="mt-7 inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 font-black text-red-600 shadow-lg transition hover:-translate-y-0.5"
          >
            Entrar a la tienda
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* =====================================================
          FOOTER
      ====================================================== */}
      <footer className="bg-[#03172d] px-4 py-12 text-white sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4">
          <div>
            <h4 className="text-xl font-black">ÁGUILA CUBA EXPRESS</h4>
            <p className="mt-3 text-sm font-medium leading-6 text-white/65">
              Envíos a Cuba rápidos, seguros y confiables.
            </p>
          </div>

          <div>
            <h5 className="font-black">Servicios</h5>
            <div className="mt-3 space-y-2 text-sm text-white/65">
              <p>Paquetería</p>
              <p>Compras en USA</p>
              <p>Envío de dinero</p>
            </div>
          </div>

          <div>
            <h5 className="font-black">Navegación</h5>
            <div className="mt-3 flex flex-col gap-2 text-sm text-white/65">
              {links.slice(1).map((item) => (
                <Link key={item.label} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h5 className="font-black">Contacto</h5>
            <p className="mt-3 text-sm text-white/65">
              2150 Sans Souci Blvd
            </p>
            <p className="text-sm text-white/65">
              North Miami, FL 33181
            </p>

            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-green-500 px-5 py-3 text-sm font-black"
            >
              <MessageCircle size={18} />
              WhatsApp
            </a>
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-t border-white/10 pt-6 text-center text-xs font-medium text-white/45 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p>© 2026 Águila Cuba Express. Todos los derechos reservados.</p>
          <Link href={STORE_URL} className="font-black text-white/75">
            Visitar tienda online
          </Link>
        </div>
      </footer>

      {/* =====================================================
          MOBILE STORE CTA
      ====================================================== */}
      <Link
        href={STORE_URL}
        className="fixed bottom-4 left-4 right-4 z-40 flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-4 font-black text-white shadow-2xl shadow-red-950/35 lg:hidden"
      >
        <ShoppingBag size={20} />
        Entrar a la tienda
        <ArrowRight size={18} />
      </Link>
    </main>
  );
}
