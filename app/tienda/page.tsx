"use client";

import Image from "next/image";
import { useState } from "react";

const slides = [
  {
    image: "/hero-banner.png",
    label: "Envíos a Cuba",
    title: "ENVÍOS A CUBA",
    subtitle: "Tu puente confiable entre Miami y Cuba.",
    buttonText: "📦 Rastrear envío",
    buttonHref: "/rastrear",
  },
  {
    image: "/slide-store.png",
    label: "Compras en USA",
    title: "COMPRAS EN USA",
    subtitle: "Tú eliges, nosotros compramos y lo enviamos a Cuba.",
    buttonText: "🛒 Ir a la tienda",
    buttonHref: "/tienda",
  },
  {
    image: "/slide-tracking.png",
    label: "Rastreo en línea",
    title: "RASTREA TU ENVÍO",
    subtitle: "Consulta el estado de tu paquete en tiempo real.",
    buttonText: "🔎 Rastrear ahora",
    buttonHref: "/rastrear",
  },
];

const links = [
  ["INICIO", "/"],
  ["SERVICIOS", "/servicios"],
  ["TIENDA", "/tienda"],
  ["RASTREAR ENVÍO", "/rastrear"],
  ["CONTACTO", "/contacto"],
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  const slide = slides[activeSlide];

  const siguienteSlide = () => {
    setActiveSlide((actual) => (actual + 1) % slides.length);
  };

  const anteriorSlide = () => {
    setActiveSlide((actual) => (actual - 1 + slides.length) % slides.length);
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-50 bg-[#062446] text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
          <a href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Águila Cuba Express"
              width={70}
              height={70}
              className="h-14 w-14 object-contain md:h-16 md:w-16"
            />

            <div>
              <h1 className="text-lg font-black leading-tight md:text-2xl">
                ÁGUILA <span className="text-red-500">CUBA EXPRESS</span>
              </h1>
              <p className="text-[10px] tracking-[0.28em] md:text-sm">
                ENVÍOS A CUBA
              </p>
            </div>
          </a>

          <nav className="hidden gap-8 font-bold lg:flex">
            {links.map(([label, href]) => (
              <a key={label} href={href} className="hover:text-red-400">
                {label}
              </a>
            ))}
          </nav>

          <a
            href="https://wa.me/13054974891"
            target="_blank"
            className="hidden rounded-xl bg-green-500 px-6 py-3 font-bold lg:block"
          >
            WhatsApp
          </a>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg border border-white/20 px-3 py-2 text-2xl lg:hidden"
          >
            ☰
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-white/10 bg-[#03172d] px-6 py-4 lg:hidden">
            <nav className="flex flex-col gap-4 font-bold">
              {links.map(([label, href]) => (
                <a key={label} href={href} onClick={() => setMenuOpen(false)}>
                  {label}
                </a>
              ))}

              <a
                href="https://wa.me/13054974891"
                target="_blank"
                className="rounded-xl bg-green-500 px-5 py-3 text-center"
              >
                WhatsApp
              </a>
            </nav>
          </div>
        )}
      </header>

      <section className="relative min-h-[560px] overflow-hidden md:min-h-[690px]">
        {slides.map((item, index) => (
          <Image
            key={item.image}
            src={item.image}
            alt={item.label}
            fill
            priority={index === 0}
            className={`object-cover object-center transition-opacity duration-700 ${
              activeSlide === index ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}

        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/75 to-white/5" />

        <div className="relative z-10 mx-auto flex min-h-[560px] max-w-7xl items-center px-6 md:min-h-[690px]">
          <div className="max-w-xl">
            <p className="mb-4 font-black uppercase tracking-[0.35em] text-red-600">
              {slide.label}
            </p>

            <h2 className="text-4xl font-black leading-none text-[#062446] sm:text-5xl md:text-7xl">
              {slide.title}
            </h2>

            <p className="mt-6 text-xl font-bold text-[#062446] md:text-2xl">
              {slide.subtitle}
            </p>

            <div className="mt-6 grid gap-2 text-base font-semibold text-[#062446] md:text-lg">
              <p>✅ Paquetería segura</p>
              <p>✅ Compras y entregas coordinadas</p>
              <p>✅ Rastreo de envíos</p>
              <p>✅ Atención personalizada</p>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a
                href={slide.buttonHref}
                className="rounded-xl bg-red-600 px-8 py-4 text-center font-bold text-white shadow-lg"
              >
                {slide.buttonText}
              </a>

              <a
                href="https://wa.me/13054974891"
                target="_blank"
                className="rounded-xl bg-[#062446] px-8 py-4 text-center font-bold text-white shadow-lg"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </div>

        <button
          onClick={anteriorSlide}
          className="absolute left-4 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-3xl font-black text-[#062446] shadow-lg"
        >
          ‹
        </button>

        <button
          onClick={siguienteSlide}
          className="absolute right-4 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-3xl font-black text-[#062446] shadow-lg"
        >
          ›
        </button>

        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-3">
          {slides.map((item, index) => (
            <button
              key={item.image}
              onClick={() => setActiveSlide(index)}
              className={`h-3 w-8 rounded-full transition ${
                activeSlide === index ? "bg-red-600" : "bg-white/70"
              }`}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <h3 className="text-center text-3xl font-black text-[#062446]">
          ACCESOS RÁPIDOS
        </h3>

        <div className="mx-auto mt-3 h-1 w-20 rounded bg-red-600" />

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["🛒", "Tienda Online", "Compra productos para enviar a Cuba.", "/tienda"],
            ["🔎", "Rastrear Envío", "Consulta el estado de tu paquete.", "/rastrear"],
            ["💬", "WhatsApp", "Habla directamente con nosotros.", "https://wa.me/13054974891"],
          ].map(([icon, title, text, href]) => (
            <a
              key={title}
              href={href}
              target={title === "WhatsApp" ? "_blank" : undefined}
              className="rounded-3xl border bg-white p-8 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[#062446] text-4xl text-white">
                {icon}
              </div>

              <h4 className="mt-5 text-xl font-black text-[#062446]">
                {title}
              </h4>

              <p className="mt-2 text-slate-600">{text}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid items-center overflow-hidden rounded-[2rem] bg-[#062446] md:grid-cols-2">
          <div className="p-8 text-white md:p-12">
            <p className="font-black uppercase tracking-[0.35em] text-red-400">
              Tienda Online
            </p>

            <h3 className="mt-4 text-4xl font-black">
              Compra productos y nosotros los enviamos a Cuba
            </h3>

            <p className="mt-4 text-lg text-white/80">
              Selecciona productos, consulta disponibilidad y coordina la entrega
              con Águila Cuba Express.
            </p>

            <a
              href="/tienda"
              className="mt-8 inline-block rounded-xl bg-red-600 px-8 py-4 font-bold text-white"
            >
              Ir a la tienda
            </a>
          </div>

          <Image
            src="/services-boxes.png"
            alt="Tienda Águila Cuba Express"
            width={800}
            height={500}
            className="h-full w-full object-cover"
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <h3 className="text-center text-3xl font-black text-[#062446]">
          NUESTROS SERVICIOS
        </h3>

        <div className="mx-auto mt-3 h-1 w-20 rounded bg-red-600" />

        <div className="mt-10 grid gap-6 md:grid-cols-4">
          {[
            ["📦", "Envío de paquetes", "Envíos seguros y rápidos a toda Cuba."],
            ["🛍️", "Compras en USA", "Compramos por ti y lo enviamos a Cuba."],
            ["💸", "Envío de dinero", "Envía dinero a tus familiares de forma rápida."],
            ["🛡️", "Seguridad garantizada", "Tu envío protegido de principio a fin."],
          ].map(([icon, title, text]) => (
            <div key={title} className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="mb-4 text-4xl">{icon}</div>
              <h4 className="font-black text-[#062446]">{title}</h4>
              <p className="mt-2 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#062446]">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-6 py-12 md:grid-cols-2">
          <div className="text-white">
            <h3 className="text-3xl font-black">RASTREA TU ENVÍO</h3>
            <p className="mt-3 text-lg text-white/80">
              Ingresa tu código de rastreo y conoce el estado de tu paquete.
            </p>
          </div>

          <div className="flex overflow-hidden rounded-xl bg-white">
            <input
              placeholder="Ingresa tu código de rastreo"
              className="w-full px-5 py-4 outline-none"
            />
            <a
              href="/rastrear"
              className="bg-red-600 px-8 py-4 font-bold text-white"
            >
              Rastrear
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-[#03172d] px-6 py-10 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4">
          <div>
            <h4 className="text-xl font-black">ÁGUILA CUBA EXPRESS</h4>
            <p className="mt-3 text-white/70">
              Envíos a Cuba rápidos, seguros y confiables.
            </p>
          </div>

          <div>
            <h5 className="font-bold">Servicios</h5>
            <p className="mt-3 text-white/70">Paquetería</p>
            <p className="text-white/70">Compras en USA</p>
            <p className="text-white/70">Envío de dinero</p>
          </div>

          <div>
            <h5 className="font-bold">Navegación</h5>
            <div className="mt-3 flex flex-col gap-2 text-white/70">
              <a href="/servicios">Servicios</a>
              <a href="/tienda">Tienda</a>
              <a href="/rastrear">Rastrear</a>
              <a href="/contacto">Contacto</a>
            </div>
          </div>

          <div>
            <h5 className="font-bold">Contacto</h5>
            <p className="mt-3 text-white/70">📍 Miami, Florida</p>
            <a
              href="https://wa.me/13054974891"
              target="_blank"
              className="mt-4 inline-block rounded-xl bg-green-500 px-5 py-3 font-bold"
            >
              WhatsApp
            </a>
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-7xl border-t border-white/10 pt-6 text-center text-sm text-white/50">
          © 2026 Águila Cuba Express. Todos los derechos reservados.
        </div>
      </footer>
    </main>
  );
}