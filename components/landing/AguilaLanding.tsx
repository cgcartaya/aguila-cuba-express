"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Box,
  Calculator,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  HeartHandshake,
  MapPin,
  Menu,
  MessageCircle,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  LogIn,
  Smartphone,
  Sparkles,
  Store,
  Truck,
  WalletCards,
  X,
  Zap,
} from "lucide-react";

const WHATSAPP_URL = "https://wa.me/13054974891";
const STORE_URL = "/tienda";
const TRACKING_URL = "/rastrear";

const links = [
  { label: "Inicio", href: "/" },
  { label: "Servicios", href: "/servicios" },
  { label: "Tienda", href: STORE_URL },
  { label: "Rastrear envío", href: TRACKING_URL },
  { label: "Contacto", href: "/contacto" },
];

const slides = [
  {
    image: "/hero-banner.webp",
    eyebrow: "Envíos desde Miami hacia Cuba",
    title: "Más cerca de tu familia, en cada envío",
    description:
      "Paquetes, compras y atención personalizada con seguimiento durante todo el proceso.",
    primaryLabel: "Entrar a la tienda",
    primaryHref: STORE_URL,
    secondaryLabel: "Rastrear envío",
    secondaryHref: TRACKING_URL,
  },
  {
    image: "/slide-store.webp",
    eyebrow: "Compra y envía desde un solo lugar",
    title: "Tu tienda online para ayudar a los tuyos",
    description:
      "Tecnología, alimentos, combos, electrodomésticos y mucho más para enviar directamente a Cuba.",
    primaryLabel: "Ver productos",
    primaryHref: STORE_URL,
    secondaryLabel: "Hablar por WhatsApp",
    secondaryHref: WHATSAPP_URL,
  },
  {
    image: "/slide-tracking.webp",
    eyebrow: "Seguimiento en línea",
    title: "Consulta tu envío en pocos segundos",
    description:
      "Introduce tu código de rastreo y revisa el progreso de tu paquete de forma clara y sencilla.",
    primaryLabel: "Rastrear ahora",
    primaryHref: TRACKING_URL,
    secondaryLabel: "Ir a la tienda",
    secondaryHref: STORE_URL,
  },
];

const services = [
  {
    icon: Box,
    title: "Envío de paquetes",
    description:
      "Recibimos, organizamos y enviamos tus paquetes desde Miami hacia Cuba.",
    tone: "from-red-600 to-red-700",
  },
  {
    icon: ShoppingBag,
    title: "Compras en Estados Unidos",
    description:
      "Compra productos en nuestra tienda y coordina su entrega directamente.",
    tone: "from-blue-700 to-[#071d43]",
  },
  {
    icon: WalletCards,
    title: "Envío de dinero",
    description:
      "Atención personalizada y un proceso sencillo para ayudar a tus familiares.",
    tone: "from-emerald-600 to-green-700",
  },
];

const advantages = [
  "Atención personalizada",
  "Seguimiento de principio a fin",
  "Compra y envío en una misma plataforma",
  "Comunicación directa por WhatsApp",
  "Gestión segura de cada operación",
  "Servicio pensado para familias cubanas",
];

const categories = [
  { icon: ShoppingBag, label: "Alimentos y combos" },
  { icon: Smartphone, label: "Tecnología" },
  { icon: Sparkles, label: "Aseo personal" },
  { icon: PackageCheck, label: "Misceláneas" },
  { icon: Zap, label: "Electrodomésticos" },
  { icon: HeartHandshake, label: "Productos para la familia" },
];

export default function AguilaLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [trackingCode, setTrackingCode] = useState("");
  const [weight, setWeight] = useState("10");

  const slide = slides[activeSlide];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 7000);

    return () => window.clearInterval(interval);
  }, []);

  const estimatedTotal = useMemo(() => {
    const pounds = Math.max(0, Number(weight) || 0);
    return pounds * 6;
  }, [weight]);

  const quoteMessage = encodeURIComponent(
    `Hola, quiero cotizar un envío con Águila Cuba Express.\n\nPeso aproximado: ${weight || "0"} lb\nTotal estimado mostrado: $${estimatedTotal.toFixed(2)}\n\nQuisiera confirmar la tarifa y los detalles del envío.`
  );

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#061a3a]/95 text-white shadow-lg backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
              <Image
                src="/logo.webp"
                alt="Águila Cuba Express"
                width={72}
                height={72}
                priority
                className="h-10 w-10 object-contain"
              />
            </div>

            <div className="min-w-0">
              <p className="truncate text-base font-black tracking-tight sm:text-lg">
                ÁGUILA <span className="text-red-500">CUBA EXPRESS</span>
              </p>
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-blue-200 sm:text-[10px]">
                Envíos, compras y seguimiento
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold lg:flex">
            {links.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`transition hover:text-red-300 ${
                  item.href === STORE_URL
                    ? "rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/15"
                    : "text-white/85"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Link
  href="/admin/login"
  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-extrabold text-white transition hover:bg-white/20"
>
  <LogIn size={15} />
  Iniciar sesión
</Link>

          <div className="hidden items-center gap-3 lg:flex">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-black shadow-lg transition hover:bg-emerald-400"
            >
              <MessageCircle size={17} />
              WhatsApp
            </a>

            <Link
              href={STORE_URL}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black shadow-lg transition hover:bg-red-500"
            >
              <Store size={17} />
              Ver tienda
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 lg:hidden"
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-white/10 bg-[#04142e] px-4 py-4 lg:hidden">
            <nav className="mx-auto grid max-w-7xl gap-2 text-sm font-bold">
              {links.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-xl px-4 py-3 ${
                    item.href === STORE_URL
                      ? "bg-red-600 text-center text-white"
                      : "hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3"
              >
                <MessageCircle size={17} />
                Contactar por WhatsApp
              </a>
            </nav>
          </div>
        )}
      </header>

      <section className="relative isolate overflow-hidden bg-[#071d43] text-white">
        {slides.map((item, index) => (
          <Image
            key={item.image}
            src={item.image}
            alt={item.eyebrow}
            fill
            priority={index === 0}
            className={`object-cover object-center transition-opacity duration-700 ${
              index === activeSlide ? "opacity-55" : "opacity-0"
            }`}
          />
        ))}

        <div className="absolute inset-0 bg-gradient-to-r from-[#061631] via-[#061631]/92 to-[#061631]/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#061631] via-transparent to-transparent" />

        <div className="relative mx-auto grid min-h-[720px] max-w-7xl items-center gap-10 px-5 py-20 sm:px-6 lg:grid-cols-[1.05fr_.95fr]">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-blue-100 backdrop-blur">
              <ShieldCheck size={16} />
              {slide.eyebrow}
            </div>

            <h1 className="mt-6 text-5xl font-black leading-[0.94] tracking-tight sm:text-6xl lg:text-7xl">
              {slide.title}
            </h1>

            <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-blue-100/85 sm:text-xl">
              {slide.description}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={slide.primaryHref}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 py-4 text-base font-black shadow-xl shadow-red-950/30 transition hover:-translate-y-0.5 hover:bg-red-500"
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
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-base font-black backdrop-blur transition hover:bg-white/15"
                >
                  <MessageCircle size={20} />
                  {slide.secondaryLabel}
                </a>
              ) : (
                <Link
                  href={slide.secondaryHref}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-base font-black backdrop-blur transition hover:bg-white/15"
                >
                  <Search size={20} />
                  {slide.secondaryLabel}
                </Link>
              )}
            </div>

            <div className="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Miami", "Punto de salida"],
                ["Toda Cuba", "Cobertura"],
                ["En línea", "Seguimiento"],
                ["WhatsApp", "Atención directa"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"
                >
                  <p className="text-xl font-black">{value}</p>
                  <p className="mt-1 text-xs font-bold text-blue-200">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="mx-auto max-w-md rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
              <div className="rounded-[1.5rem] bg-white p-5 text-slate-950">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
                      Acceso rápido
                    </p>
                    <p className="mt-1 text-xl font-black">
                      Todo en una plataforma
                    </p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                    <Box size={22} />
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {[
                    ["Comprar productos", STORE_URL, ShoppingBag],
                    ["Rastrear un envío", TRACKING_URL, Search],
                    ["Ver nuestros servicios", "/servicios", Truck],
                    ["Contactar al equipo", "/contacto", MessageCircle],
                  ].map(([label, href, Icon]) => (
                    <Link
                      key={String(label)}
                      href={String(href)}
                      className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 transition hover:bg-blue-50"
                    >
                      <span className="flex items-center gap-3 font-bold text-slate-700">
                        <Icon size={18} className="text-blue-700" />
                        {String(label)}
                      </span>
                      <ArrowRight size={17} className="text-slate-400" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setActiveSlide(
              (current) => (current - 1 + slides.length) % slides.length
            )
          }
          aria-label="Banner anterior"
          className="absolute left-4 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#062446] shadow-lg sm:flex"
        >
          <ChevronLeft size={26} />
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveSlide((current) => (current + 1) % slides.length)
          }
          aria-label="Siguiente banner"
          className="absolute right-4 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#062446] shadow-lg sm:flex"
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
                  ? "w-9 bg-red-500"
                  : "w-2.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6">
        <SectionTitle
          eyebrow="Nuestros servicios"
          title="Todo lo que necesitas para enviar a Cuba"
          description="Una experiencia clara, segura y acompañada desde el primer contacto."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <article
                key={service.title}
                className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className={`bg-gradient-to-br ${service.tone} p-6 text-white`}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                    <Icon size={24} />
                  </div>
                  <h3 className="mt-5 text-2xl font-black">{service.title}</h3>
                </div>
                <div className="p-6">
                  <p className="font-medium leading-7 text-slate-600">
                    {service.description}
                  </p>
                  <Link
                    href="/servicios"
                    className="mt-5 inline-flex items-center gap-2 font-black text-blue-700"
                  >
                    Ver detalles
                    <ArrowRight size={17} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-[#071d43] py-20 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-white/10 p-6 backdrop-blur md:p-8">
            <SectionTitle
              dark
              eyebrow="Cotización rápida"
              title="Calcula una referencia"
              description="Obtén una estimación inicial y confirma la tarifa directamente con nuestro equipo."
            />

            <div className="mt-7">
              <label className="text-sm font-bold text-blue-100">
                Peso aproximado
              </label>
              <div className="mt-2 flex items-center rounded-2xl bg-white p-1 text-slate-950">
                <input
                  value={weight}
                  onChange={(event) =>
                    setWeight(event.target.value.replace(/[^\d.]/g, ""))
                  }
                  className="min-w-0 flex-1 bg-transparent px-4 py-3 text-lg font-black outline-none"
                  inputMode="decimal"
                />
                <span className="pr-4 font-bold text-slate-500">lb</span>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-white/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-200">
                Estimación demostrativa
              </p>
              <p className="mt-2 text-4xl font-black">
                ${estimatedTotal.toFixed(2)}
              </p>
              <p className="mt-2 text-sm font-medium text-blue-100/75">
                La tarifa final puede variar según el destino y el tipo de
                artículo.
              </p>
            </div>

            <a
              href={`${WHATSAPP_URL}?text=${quoteMessage}`}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-4 font-black transition hover:bg-emerald-400"
            >
              <MessageCircle size={19} />
              Confirmar por WhatsApp
            </a>
          </div>

          <div
            id="rastreo"
            className="rounded-[2rem] border border-white/10 bg-white p-6 text-slate-950 shadow-2xl md:p-8"
          >
            <SectionTitle
              eyebrow="Rastreo en línea"
              title="¿Dónde está tu envío?"
              description="Introduce tu código y revisa el estado actualizado."
            />

            <div className="mt-7">
              <label className="text-sm font-bold text-slate-700">
                Código de rastreo
              </label>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <input
                  value={trackingCode}
                  onChange={(event) =>
                    setTrackingCode(event.target.value.toUpperCase())
                  }
                  placeholder="ACE-XXXXXXXX"
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-4 font-bold outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
                <Link
                  href={
                    trackingCode.trim()
                      ? `${TRACKING_URL}/${encodeURIComponent(
                          trackingCode.trim()
                        )}`
                      : TRACKING_URL
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#071d43] px-6 py-4 font-black text-white"
                >
                  <Search size={19} />
                  Consultar
                </Link>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              {[
                ["Recibido", PackageCheck],
                ["Preparando", Clock3],
                ["En tránsito", Truck],
                ["Entregado", CheckCircle2],
              ].map(([label, Icon]) => (
                <div
                  key={String(label)}
                  className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                    <Icon size={18} />
                  </div>
                  <span className="text-sm font-bold text-slate-700">
                    {String(label)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <div>
            <SectionTitle
              eyebrow="Tienda online"
              title="Compra productos para tu familia"
              description="Explora nuestras categorías y prepara tu compra sin salir de la plataforma."
            />

            <div className="mt-8 grid grid-cols-2 gap-3">
              {categories.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                      <Icon size={19} />
                    </div>
                    <p className="mt-3 text-sm font-black text-slate-800">
                      {item.label}
                    </p>
                  </div>
                );
              })}
            </div>

            <Link
              href={STORE_URL}
              className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-red-600 px-6 py-4 font-black text-white shadow-lg"
            >
              <Store size={19} />
              Entrar a la tienda
              <ArrowRight size={18} />
            </Link>
          </div>

          <div className="relative min-h-[480px] overflow-hidden rounded-[2.5rem] border border-slate-200 bg-slate-100 shadow-xl">
            <Image
              src="/slide-store.webp"
              alt="Tienda online Águila Cuba Express"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#061631]/90 via-transparent to-transparent" />
            <div className="absolute bottom-0 p-7 text-white">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-red-300">
                Compra desde Estados Unidos
              </p>
              <p className="mt-2 text-3xl font-black">
                Nosotros nos encargamos del resto
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <SectionTitle
            centered
            eyebrow="¿Por qué elegirnos?"
            title="Una experiencia pensada para darte tranquilidad"
            description="Cada herramienta está diseñada para hacer más sencillo comprar, enviar y mantenerte informado."
          />

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {advantages.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={18} />
                </div>
                <p className="pt-1 font-bold text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-6">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-red-600 to-red-700 p-7 text-white shadow-xl md:p-10">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-red-100">
                Estamos para ayudarte
              </p>
              <h2 className="mt-2 max-w-3xl text-3xl font-black md:text-4xl">
                Compra, envía o rastrea desde una sola plataforma
              </h2>
              <p className="mt-3 max-w-2xl font-medium text-red-100">
                Visita nuestra tienda o comunícate directamente con el equipo
                de Águila Cuba Express.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={STORE_URL}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 font-black text-red-700"
              >
                <Store size={19} />
                Ver tienda
              </Link>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-4 font-black"
              >
                <MessageCircle size={19} />
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#04142e] text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-6 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/logo.webp"
                alt="Águila Cuba Express"
                width={56}
                height={56}
                className="h-12 w-12 object-contain"
              />
              <p className="font-black">
                ÁGUILA <span className="text-red-500">CUBA EXPRESS</span>
              </p>
            </div>
            <p className="mt-4 max-w-sm text-sm font-medium leading-6 text-blue-100/70">
              Soluciones de envío, tienda online y seguimiento para conectar a
              las familias con Cuba.
            </p>
          </div>

          <div>
            <p className="font-black">Enlaces</p>
            <div className="mt-4 grid gap-2 text-sm font-semibold text-blue-100/70">
              {links.map((item) => (
                <Link key={item.label} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="font-black">Contacto</p>
            <div className="mt-4 space-y-3 text-sm font-semibold text-blue-100/70">
              <p className="flex items-center gap-2">
                <MapPin size={17} />
                Miami, Florida
              </p>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2"
              >
                <MessageCircle size={17} />
                WhatsApp
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 px-5 py-5 text-center text-xs font-semibold text-blue-100/50">
          © {new Date().getFullYear()} Águila Cuba Express. Todos los derechos
          reservados.
        </div>
      </footer>
    </main>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
  dark = false,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  dark?: boolean;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : ""}>
      <p
        className={`text-xs font-black uppercase tracking-[0.18em] ${
          dark ? "text-blue-200" : "text-blue-700"
        }`}
      >
        {eyebrow}
      </p>
      <h2
        className={`mt-2 text-3xl font-black tracking-tight md:text-4xl ${
          dark ? "text-white" : "text-slate-950"
        }`}
      >
        {title}
      </h2>
      <p
        className={`mt-3 max-w-2xl font-medium leading-7 ${
          centered ? "mx-auto" : ""
        } ${dark ? "text-blue-100/75" : "text-slate-500"}`}
      >
        {description}
      </p>
    </div>
  );
}
