"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Box,
  Calculator,
  Check,
  CheckCircle2,
  Clock3,
  HeartHandshake,
  LogIn,
  MapPin,
  Menu,
  MessageCircle,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
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
  { label: "Servicios", href: "#servicios" },
  { label: "Cómo funciona", href: "#proceso" },
  { label: "Tienda", href: STORE_URL },
  { label: "Rastreo", href: "#rastreo" },
];

const services = [
  {
    icon: Box,
    number: "01",
    title: "Paquetería a Cuba",
    description:
      "Organizamos cada envío con atención personalizada y seguimiento durante todo el recorrido.",
  },
  {
    icon: ShoppingBag,
    number: "02",
    title: "Compra desde la tienda",
    description:
      "Elige productos para tu familia y coordina compra y envío desde el mismo lugar.",
  },
  {
    icon: WalletCards,
    number: "03",
    title: "Envío de dinero",
    description:
      "Un proceso claro, cercano y acompañado para ayudar a quienes más quieres.",
  },
];

const categories = [
  { icon: ShoppingBag, label: "Alimentos" },
  { icon: Zap, label: "Electrodomésticos" },
  { icon: Sparkles, label: "Aseo" },
  { icon: PackageCheck, label: "Combos" },
  { icon: HeartHandshake, label: "Familia" },
  { icon: Store, label: "Misceláneas" },
];

const process = [
  { icon: MessageCircle, title: "Nos escribes", text: "Cuéntanos qué deseas enviar o comprar." },
  { icon: PackageCheck, title: "Preparamos", text: "Registramos y organizamos tu operación." },
  { icon: Truck, title: "Enviamos", text: "Tu paquete avanza con estados actualizados." },
  { icon: CheckCircle2, title: "Entregamos", text: "Confirmamos la entrega a tu familia." },
];

export default function AguilaLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const [weight, setWeight] = useState("10");

  const estimatedTotal = useMemo(() => {
    const pounds = Math.max(0, Number(weight) || 0);
    return pounds * 6;
  }, [weight]);

  const quoteMessage = encodeURIComponent(
    `Hola, quiero cotizar un envío con Águila Cuba Express.\n\nPeso aproximado: ${weight || "0"} lb\nEstimado mostrado: $${estimatedTotal.toFixed(2)}\n\nQuisiera confirmar la tarifa y los detalles.`
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f7f2e9] text-[#13233d]">
      <header className="sticky top-0 z-50 border-b border-[#13233d]/10 bg-[#f7f2e9]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-[#13233d]/10">
              <Image src="/logo.webp" alt="Águila Cuba Express" width={72} height={72} priority className="h-10 w-10 object-contain" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-black tracking-tight sm:text-lg">ÁGUILA <span className="text-[#c9202f]">CUBA EXPRESS</span></p>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.24em] text-[#13233d]/55 sm:text-[10px]">Más cerca de tu familia</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-extrabold lg:flex">
            {links.map((item) => (
              <Link key={item.label} href={item.href} className="transition hover:text-[#c9202f]">{item.label}</Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link href="/login" className="inline-flex items-center gap-2 rounded-full border border-[#13233d]/15 px-4 py-2.5 text-sm font-black transition hover:bg-white"><LogIn size={16} /> Iniciar sesión</Link>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#13233d] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#203759]"><MessageCircle size={17} /> WhatsApp</a>
          </div>

          <button type="button" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#13233d] text-white lg:hidden">
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-[#13233d]/10 bg-[#f7f2e9] px-5 py-4 lg:hidden">
            <nav className="grid gap-2 text-sm font-extrabold">
              {links.map((item) => <Link key={item.label} href={item.href} onClick={() => setMenuOpen(false)} className="rounded-2xl px-4 py-3 hover:bg-white">{item.label}</Link>)}
              <Link href="/login" onClick={() => setMenuOpen(false)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#13233d]/15 px-4 py-3"><LogIn size={17} /> Iniciar sesión</Link>
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#13233d] px-4 py-3 text-white"><MessageCircle size={17} /> Contactar</a>
            </nav>
          </div>
        )}
      </header>

      <section className="relative overflow-hidden border-b border-[#13233d]/10">
        <div className="pointer-events-none absolute -left-24 top-32 h-56 w-56 rounded-full border-[40px] border-[#e2b75b]/20 sm:h-72 sm:w-72 sm:border-[54px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-12 sm:px-6 sm:py-16 lg:min-h-[700px] lg:grid-cols-[1.05fr_.95fr] lg:py-24">
          <div className="min-w-0 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c9202f]/20 bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.17em] text-[#c9202f]">
              <span className="h-2 w-2 rounded-full bg-[#c9202f]" /> Miami · Cuba · Familia
            </div>
            <h1 className="mt-7 max-w-full text-[clamp(2.7rem,12vw,4.25rem)] font-black leading-[.98] tracking-[-0.04em] sm:text-6xl lg:text-[5.3rem]">
              Todo lo que envías
              <span className="mt-1 block max-w-full font-serif italic text-[#c9202f] [overflow-wrap:anywhere]">lleva un pedacito de ti.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base font-semibold leading-7 text-[#13233d]/65 sm:mt-7 sm:text-lg sm:leading-8">
              Paquetes, compras y ayuda para tu familia en Cuba, con una atención cercana y una plataforma para saber siempre qué está pasando.
            </p>
            <div className="mt-8 grid gap-3 sm:mt-9 sm:flex sm:flex-row">
              <a href="#cotizar" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#c9202f] px-7 py-4 text-sm font-black text-white shadow-[0_16px_35px_rgba(201,32,47,.22)] transition hover:-translate-y-0.5"><Calculator size={19} /> Cotizar envío <ArrowRight size={18} /></a>
              <Link href={STORE_URL} className="inline-flex items-center justify-center gap-2 rounded-full border border-[#13233d]/15 bg-white/70 px-7 py-4 text-sm font-black transition hover:bg-white"><Store size={19} /> Visitar la tienda</Link>
            </div>
            <div className="mt-8 grid gap-3 text-sm font-extrabold text-[#13233d]/65 sm:mt-10 sm:flex sm:flex-wrap sm:gap-x-7 sm:gap-y-3">
              {["Rastreo en línea", "Atención por WhatsApp", "Compra y envío juntos"].map((item) => <span key={item} className="inline-flex items-center gap-2"><Check size={16} className="text-[#c9202f]" />{item}</span>)}
            </div>
          </div>

          <div className="relative min-w-0 lg:pl-8">
            <div className="relative mx-auto w-full max-w-[560px] rounded-[2rem] bg-[#c9202f] p-3 shadow-[0_28px_70px_rgba(19,35,61,.18)] sm:p-5 lg:rotate-[1deg] lg:rounded-[3rem]">
              <div className="relative overflow-hidden rounded-[1.55rem] bg-[#13233d] p-5 text-white sm:p-7 lg:rounded-[2.35rem] lg:p-8">
                <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full border-[38px] border-white/[.06]" />
                <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full border-[42px] border-[#e2b75b]/10" />

                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#e2b75b]">Ruta activa</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Miami → Cienfuegos</h2>
                    <p className="mt-2 text-sm font-semibold text-white/55">Compra, envío y rastreo en un solo lugar.</p>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#c9202f] shadow-lg sm:h-14 sm:w-14">
                    <Truck size={24} />
                  </div>
                </div>

                <div className="relative mt-8 rounded-[1.75rem] bg-white/[.07] p-5 ring-1 ring-white/10 sm:p-6">
                  <div className="absolute left-[17%] right-[17%] top-[38px] h-1 rounded-full bg-white/10">
                    <div className="h-full w-[72%] rounded-full bg-[#e2b75b]" />
                  </div>
                  <div className="relative grid grid-cols-3 text-center">
                    <div>
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e2b75b] text-[#13233d] ring-8 ring-[#13233d] sm:h-14 sm:w-14"><ShoppingBag size={21} /></div>
                      <p className="mt-3 text-xs font-black uppercase tracking-[.12em] text-white/45">Compra</p>
                    </div>
                    <div>
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#c9202f] text-white ring-8 ring-[#13233d] sm:h-14 sm:w-14"><PackageCheck size={22} /></div>
                      <p className="mt-3 text-xs font-black uppercase tracking-[.12em] text-white/45">Preparamos</p>
                    </div>
                    <div>
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#13233d] ring-8 ring-[#13233d] sm:h-14 sm:w-14"><MapPin size={22} /></div>
                      <p className="mt-3 text-xs font-black uppercase tracking-[.12em] text-white/45">Entregamos</p>
                    </div>
                  </div>
                </div>

                <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4 text-[#13233d] shadow-lg">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#13233d]/40">Estado actual</p>
                        <p className="mt-1 font-black">En tránsito hacia Cuba</p>
                      </div>
                      <span className="rounded-full bg-[#e2b75b] px-3 py-1 text-[11px] font-black">ACE</span>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-[#e2b75b] p-4 text-[#13233d] shadow-lg">
                    <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#13233d]/50">Todo conectado</p>
                    <p className="mt-1 text-lg font-black">Tienda + Envíos + Rastreo</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mx-auto -mt-3 flex w-[calc(100%-2rem)] max-w-md items-center justify-between gap-4 rounded-2xl border border-[#13233d]/10 bg-[#f7f2e9] px-5 py-4 shadow-xl sm:-mt-5 sm:rounded-3xl lg:absolute lg:-bottom-7 lg:-left-1 lg:w-auto lg:min-w-[310px]">
              <div>
                <p className="text-2xl font-black text-[#13233d]">1 plataforma</p>
                <p className="text-sm font-extrabold text-[#13233d]/60">para comprar, enviar y rastrear</p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#c9202f] text-white"><ArrowRight size={19} /></div>
            </div>
          </div>
        </div>
      </section>

      <section id="servicios" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[.2em] text-[#c9202f]">Lo hacemos sencillo</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Tres maneras de estar más cerca.</h2>
              <p className="mt-5 max-w-md font-semibold leading-7 text-[#13233d]/60">No vendemos solo un servicio. Te acompañamos en todo el proceso para que enviar a Cuba se sienta claro y confiable.</p>
            </div>
            <div className="divide-y divide-[#13233d]/10 border-y border-[#13233d]/10">
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <article key={service.title} className="group grid gap-5 py-7 sm:grid-cols-[70px_1fr_auto] sm:items-center">
                    <span className="text-sm font-black text-[#c9202f]">{service.number}</span>
                    <div className="flex gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f7f2e9] text-[#13233d]"><Icon size={21} /></div>
                      <div><h3 className="text-xl font-black">{service.title}</h3><p className="mt-2 max-w-xl font-medium leading-7 text-[#13233d]/55">{service.description}</p></div>
                    </div>
                    <Link href="/servicios" className="flex h-11 w-11 items-center justify-center rounded-full border border-[#13233d]/15 transition group-hover:bg-[#13233d] group-hover:text-white"><ArrowRight size={18} /></Link>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="proceso" className="bg-[#13233d] py-20 text-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div><p className="text-xs font-black uppercase tracking-[.2em] text-[#e2b75b]">Así funciona</p><h2 className="mt-3 max-w-2xl text-4xl font-black tracking-tight sm:text-5xl">Un camino claro, de tus manos a las de tu familia.</h2></div>
            <p className="max-w-md font-semibold leading-7 text-white/55">Cada etapa queda organizada y visible para que tengas más tranquilidad.</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-4">
            {process.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="relative rounded-[2rem] border border-white/10 bg-white/[.045] p-6">
                  <span className="absolute right-5 top-4 text-5xl font-black text-white/[.05]">0{index + 1}</span>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e2b75b] text-[#13233d]"><Icon size={21} /></div>
                  <h3 className="mt-7 text-xl font-black">{item.title}</h3>
                  <p className="mt-2 font-medium leading-7 text-white/55">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="cotizar" className="py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-6 lg:grid-cols-[.92fr_1.08fr]">
          <div className="rounded-[2.5rem] bg-[#c9202f] p-7 text-white shadow-xl md:p-10">
            <p className="text-xs font-black uppercase tracking-[.2em] text-white/70">Cotización rápida</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">Calcula una referencia.</h2>
            <p className="mt-4 max-w-xl font-semibold leading-7 text-white/75">Introduce el peso aproximado y confirma la tarifa final con nuestro equipo.</p>
            <label className="mt-8 block text-sm font-black">Peso aproximado</label>
            <div className="mt-2 flex items-center rounded-full bg-white p-1 text-[#13233d]">
              <input value={weight} onChange={(event) => setWeight(event.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className="min-w-0 flex-1 bg-transparent px-5 py-3 text-lg font-black outline-none" />
              <span className="pr-5 font-black text-[#13233d]/45">lb</span>
            </div>
            <div className="mt-5 flex items-end justify-between gap-4 rounded-3xl bg-black/10 p-5">
              <div><p className="text-xs font-black uppercase tracking-[.16em] text-white/60">Estimado demostrativo</p><p className="mt-2 text-4xl font-black">${estimatedTotal.toFixed(2)}</p></div>
              <Calculator size={34} className="text-white/30" />
            </div>
            <a href={`${WHATSAPP_URL}?text=${quoteMessage}`} target="_blank" rel="noreferrer" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-4 font-black text-[#c9202f] transition hover:bg-[#fff8f0]"><MessageCircle size={19} /> Confirmar por WhatsApp</a>
          </div>

          <div id="rastreo" className="rounded-[2.5rem] border border-[#13233d]/10 bg-white p-7 shadow-sm md:p-10">
            <p className="text-xs font-black uppercase tracking-[.2em] text-[#c9202f]">Rastreo en línea</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">Tu envío, siempre visible.</h2>
            <p className="mt-4 max-w-xl font-semibold leading-7 text-[#13233d]/55">Escribe el código de rastreo para consultar el estado actualizado.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <input value={trackingCode} onChange={(event) => setTrackingCode(event.target.value.toUpperCase())} placeholder="ACE-XXXXXXXX" className="min-w-0 flex-1 rounded-full border border-[#13233d]/15 bg-[#f7f2e9] px-5 py-4 font-black outline-none focus:border-[#c9202f]" />
              <Link href={trackingCode.trim() ? `${TRACKING_URL}/${encodeURIComponent(trackingCode.trim())}` : TRACKING_URL} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#13233d] px-6 py-4 font-black text-white"><Search size={18} /> Consultar</Link>
            </div>
            <div className="mt-8 space-y-3">
              {[["Recibido", PackageCheck], ["Preparando", Clock3], ["En tránsito", Truck], ["Entregado", CheckCircle2]].map(([label, Icon], index) => (
                <div key={String(label)} className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${index < 2 ? "bg-[#c9202f] text-white" : "bg-[#f7f2e9] text-[#13233d]/45"}`}><Icon size={17} /></div>
                  <div className="h-px flex-1 bg-[#13233d]/10" />
                  <span className="w-24 text-sm font-black">{String(label)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-6 lg:grid-cols-[1.08fr_.92fr] lg:items-center">
          <div className="relative min-h-[500px] overflow-hidden rounded-[1rem_3.5rem_3.5rem_3.5rem] bg-[#13233d]">
            <Image src="/slide-store.webp" alt="Tienda online Águila Cuba Express" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#13233d]/90 via-transparent to-transparent" />
            <div className="absolute bottom-0 p-8 text-white"><p className="text-xs font-black uppercase tracking-[.2em] text-[#e2b75b]">Tienda online</p><p className="mt-3 max-w-lg text-3xl font-black">Compra desde Estados Unidos. Nosotros acercamos el resto.</p></div>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-[#c9202f]">Compra para los tuyos</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Una tienda pensada para enviar cariño.</h2>
            <p className="mt-5 max-w-xl font-semibold leading-7 text-[#13233d]/55">Explora categorías, prepara tu compra y coordina el envío desde la misma plataforma.</p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {categories.map((item) => { const Icon = item.icon; return <div key={item.label} className="flex items-center gap-3 rounded-full border border-[#13233d]/10 bg-[#f7f2e9] px-4 py-3"><Icon size={17} className="text-[#c9202f]" /><span className="text-sm font-black">{item.label}</span></div>; })}
            </div>
            <Link href={STORE_URL} className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#c9202f] px-7 py-4 font-black text-white"><Store size={19} /> Entrar a la tienda <ArrowRight size={18} /></Link>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-6">
        <div className="mx-auto max-w-7xl rounded-[3rem] bg-[#e2b75b] p-8 text-[#13233d] md:p-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div><p className="text-xs font-black uppercase tracking-[.2em]">Estamos cerca</p><h2 className="mt-3 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">Lo importante no es solo que llegue. Es saber que va en buenas manos.</h2></div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#13233d] px-7 py-4 font-black text-white"><MessageCircle size={19} /> Hablar por WhatsApp</a>
              <Link href={TRACKING_URL} className="inline-flex items-center justify-center gap-2 rounded-full border border-[#13233d]/20 bg-white/35 px-7 py-4 font-black"><Search size={19} /> Rastrear envío</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#13233d] text-white">
        <div className="mx-auto grid max-w-7xl gap-9 px-5 py-12 sm:px-6 md:grid-cols-[1.3fr_.7fr_.7fr]">
          <div>
            <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-white"><Image src="/logo.webp" alt="Águila Cuba Express" width={56} height={56} className="h-10 w-10 object-contain" /></div><p className="font-black">ÁGUILA <span className="text-[#ef4b57]">CUBA EXPRESS</span></p></div>
            <p className="mt-5 max-w-md text-sm font-semibold leading-6 text-white/50">Envíos, compras y seguimiento para acercar a las familias entre Miami y Cuba.</p>
          </div>
          <div><p className="font-black">Navegación</p><div className="mt-4 grid gap-2 text-sm font-semibold text-white/50">{links.map((item) => <Link key={item.label} href={item.href}>{item.label}</Link>)}</div></div>
          <div><p className="font-black">Contacto</p><div className="mt-4 space-y-3 text-sm font-semibold text-white/50"><p className="flex items-center gap-2"><MapPin size={16} /> Miami, Florida</p><a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2"><MessageCircle size={16} /> WhatsApp</a><p className="flex items-center gap-2"><ShieldCheck size={16} /> Atención personalizada</p></div></div>
        </div>
        <div className="border-t border-white/10 px-5 py-5 text-center text-xs font-semibold text-white/35">© {new Date().getFullYear()} Águila Cuba Express. Todos los derechos reservados.</div>
      </footer>
    </main>
  );
}
