"use client";

import Image from "next/image";
import Link from "next/link";
import ShippingAnimatedShowcase from "../ShippingAnimatedShowcase";
import PublicQuoteCalculator from "@/components/portal/PublicQuoteCalculator";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BatteryCharging,
  Box,
  Calculator,
  CheckCircle2,
  Clock3,
  HeartHandshake,
  MapPin,
  LogIn,
  Menu,
  MessageCircle,
  PackageCheck,
  Plane,
  Search,
  ShieldCheck,
  Ship,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  Truck,
  WalletCards,
  X,
  Zap,
} from "lucide-react";

const WHATSAPP_PHONE = "18032623676";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_PHONE}`;
const STORE_URL = "/tienda";
const TRACKING_URL = "/rastrear";

const services = [
  {
    id: "express",
    icon: Zap,
    name: "Envío express",
    price: 7,
    color: "red",
    time: "La Habana: 48 horas",
    detail: "Provincias: 72 horas a 5 días",
    note: "Rápido, seguro y confiable",
  },
  {
    id: "air",
    icon: Plane,
    name: "Envío aéreo",
    price: 3.99,
    color: "blue",
    time: "Entrega en toda Cuba",
    detail: "7 a 15 días",
    note: "Seguro y eficiente",
  },
  {
    id: "sea",
    icon: Ship,
    name: "Envío marítimo",
    price: 2.99,
    color: "green",
    time: "Entrega en toda Cuba",
    detail: "25 a 30 días",
    note: "Económico y confiable",
  },
] as const;

const sendables = [
  { icon: ShoppingBag, label: "Ropa y calzado" },
  { icon: PackageCheck, label: "Alimentos" },
  { icon: HeartHandshake, label: "Medicamentos" },
  { icon: Sparkles, label: "Aseo personal" },
  { icon: Smartphone, label: "Electrónica" },
  { icon: BatteryCharging, label: "Estaciones de energía" },
];

const advantages = [
  "Atención personalizada",
  "Seguridad y confianza",
  "Seguimiento del envío",
  "Recogida a domicilio",
  "Entrega en toda Cuba",
  "Atención por WhatsApp",
];

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function YoyoLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [serviceId, setServiceId] = useState<(typeof services)[number]["id"]>(
    "air"
  );
  const [weight, setWeight] = useState("10");
  const [pickup, setPickup] = useState(false);
  const [province, setProvince] = useState("La Habana");
  const [trackingCode, setTrackingCode] = useState("");

  const selectedService = services.find((item) => item.id === serviceId)!;
  const quote = useMemo(() => {
    const pounds = Math.max(0, Number(weight) || 0);
    const shipping = pounds * selectedService.price;
    const pickupFee = pickup ? 20 : 0;
    return { pounds, shipping, pickupFee, total: shipping + pickupFee };
  }, [pickup, selectedService.price, weight]);

  const quoteMessage = encodeURIComponent(
    `Hola, quiero cotizar un envío con YOYO Envíos.\n\nServicio: ${selectedService.name}\nDestino: ${province}\nPeso: ${quote.pounds} lb\nRecogida: ${pickup ? "Sí" : "No"}\nTotal estimado: ${money(quote.total)}`
  );

  return (
    <main className="min-h-screen bg-[#f6f8fc] text-slate-950">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#061a3a]/95 text-white shadow-lg backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative h-12 w-16 overflow-hidden rounded-xl bg-white shadow-sm">
              <Image
                src="/yoyo/logo-yoyo.jpg"
                alt="YOYO Envíos"
                fill
                priority
                className="object-cover object-left"
              />
            </div>
            <div>
              <p className="text-lg font-black tracking-tight">YOYO ENVÍOS</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-200">
                Llevamos tus sueños a Cuba
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold lg:flex">
            <a href="#servicios" className="hover:text-red-300">Servicios</a>
            <a href="#cotizar" className="hover:text-red-300">Cotizar</a>
            <a href="#rastreo" className="hover:text-red-300">Rastreo</a>
            <a href="#recogida" className="hover:text-red-300">Recogida</a>
            <Link href={STORE_URL} className="hover:text-red-300">Tienda</Link>
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link href="/login" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-black transition hover:bg-white/20">
              <LogIn size={17} /> Iniciar sesión
            </Link>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-black shadow-lg transition hover:bg-emerald-400"
            >
              <MessageCircle size={17} /> WhatsApp
            </a>
            <Link
              href={STORE_URL}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black transition hover:bg-red-500"
            >
              <Store size={17} /> Ver tienda
            </Link>
          </div>

          <button
            type="button"
            aria-label="Abrir menú"
            onClick={() => setMenuOpen((value) => !value)}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 lg:hidden"
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-white/10 bg-[#04142e] px-4 py-4 lg:hidden">
            <div className="grid gap-2 text-sm font-bold">
              {[
                ["Servicios", "#servicios"],
                ["Cotizar", "#cotizar"],
                ["Rastreo", "#rastreo"],
                ["Recogida", "#recogida"],
              ].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-4 py-3 hover:bg-white/10"
                >
                  {label}
                </a>
              ))}
              <Link href="/login" onClick={() => setMenuOpen(false)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3">
                <LogIn size={17} /> Iniciar sesión
              </Link>
              <Link href={STORE_URL} className="rounded-xl bg-red-600 px-4 py-3 text-center">
                Entrar a la tienda
              </Link>
            </div>
          </div>
        )}
      </header>

      <section className="relative isolate overflow-hidden bg-[#06152f] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_42%,rgba(37,99,235,0.3),transparent_34%),radial-gradient(circle_at_30%_24%,rgba(220,38,38,0.18),transparent_28%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:46px_46px]" />
        <div className="relative mx-auto grid min-h-[760px] max-w-7xl items-center gap-14 px-5 py-20 sm:px-6 lg:grid-cols-[.92fr_1.08fr] lg:py-24">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/25 bg-blue-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-blue-100"><span className="h-2 w-2 animate-pulse rounded-full bg-red-400" /> Seguridad, confianza y responsabilidad</div>
            <h1 className="mt-8 text-5xl font-black leading-[.96] tracking-[-0.04em] sm:text-6xl lg:text-7xl">Todo para tus<span className="mt-2 block bg-gradient-to-r from-red-400 via-red-300 to-blue-300 bg-clip-text text-transparent">envíos a Cuba.</span></h1>
            <p className="mt-7 max-w-xl text-base font-semibold leading-8 text-blue-100/75 sm:text-lg">Recogemos, empacamos y entregamos tus envíos con una operación profesional, rastreo online y atención personalizada.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href="#cotizar" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 px-7 py-4 text-sm font-black shadow-[0_18px_48px_rgba(220,38,38,.3)] transition hover:-translate-y-0.5"><Calculator size={20} /> Cotizar mi envío <ArrowRight size={18} /></a>
              <a href="#rastreo" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.05] px-7 py-4 text-sm font-black backdrop-blur transition hover:bg-white/[0.1]"><Search size={20} /> Rastrear paquete</a>
            </div>
            <div className="mt-9 grid max-w-xl grid-cols-2 gap-4 text-sm font-bold text-blue-100/80 sm:grid-cols-4">
              {["Express 48 h", "Aéreo", "Marítimo", "Toda Cuba"].map((item) => <div key={item} className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/10 text-[11px] text-emerald-300">✓</span>{item}</div>)}
            </div>
          </div>
          <div className="relative z-10"><ShippingAnimatedShowcase agencyName="YOYO Envíos" trackingPrefix="YOYO" accentClassName="from-red-600 to-red-500" accentSoftClassName="bg-red-500/15 text-red-200" /></div>
        </div>
      </section>

      <section id="servicios" className="mx-auto max-w-7xl px-5 py-20 sm:px-6">
        <SectionTitle eyebrow="Servicios" title="Elige cómo quieres enviar" description="Tres opciones claras para combinar rapidez, seguridad y economía." />
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {services.map((service) => {
            const Icon = service.icon;
            const styles = service.color === "red"
              ? "from-red-600 to-red-700"
              : service.color === "green"
                ? "from-emerald-600 to-green-700"
                : "from-blue-700 to-[#071d43]";
            return (
              <article key={service.id} className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                <div className={`bg-gradient-to-br ${styles} p-6 text-white`}>
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Icon size={24} /></div>
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black">TARIFA CONFIGURABLE</span>
                  </div>
                  <p className="mt-6 text-lg font-black">{service.name}</p>
                  <p className="mt-2 text-2xl font-black">Consulta el precio actual</p>
                </div>
                <div className="space-y-3 p-6">
                  <InfoRow icon={<Clock3 size={18} />} text={service.time} />
                  <InfoRow icon={<Truck size={18} />} text={service.detail} />
                  <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">{service.note}</div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="cotizar" className="bg-[#071d43] px-5 py-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-9 text-center text-white">
            <SectionTitle dark eyebrow="Cotización conectada" title="Calcula tu envío con nuestras tarifas actuales" description="Los precios, mínimos, destinos y tiempos se actualizan directamente desde la administración de YOYO Envíos." />
          </div>
          <PublicQuoteCalculator embedded />
        </div>
      </section>

      <section id="rastreo" className="mx-auto max-w-7xl px-5 py-20 sm:px-6">
        <div className="grid overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-950 to-[#0a3474] text-white shadow-2xl lg:grid-cols-[1fr_.8fr]">
          <div className="p-8 sm:p-12">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10"><Search size={27} /></div>
            <h2 className="mt-6 text-4xl font-black">Rastrea tu envío</h2>
            <p className="mt-3 max-w-xl font-semibold leading-7 text-blue-100/80">Consulta el estado de tu paquete y sigue cada etapa hasta la entrega.</p>
            <form action={trackingCode ? `${TRACKING_URL}/${trackingCode}` : TRACKING_URL} className="mt-7 flex flex-col gap-3 sm:flex-row">
              <input value={trackingCode} onChange={(event) => setTrackingCode(event.target.value.toUpperCase())} placeholder="Ej. ACE-12345678" className="min-w-0 flex-1 rounded-2xl border border-white/15 bg-white px-5 py-4 font-black text-slate-950 outline-none" />
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 py-4 font-black"><Search size={18} /> Consultar</button>
            </form>
          </div>
          <div className="grid grid-cols-2 gap-3 bg-white/5 p-8 sm:p-12">
            {["Recibido", "Preparando", "En tránsito", "En Cuba", "En reparto", "Entregado"].map((item, index) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <CheckCircle2 size={20} className={index < 3 ? "text-emerald-400" : "text-blue-300"} />
                <p className="mt-3 text-sm font-black">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="recogida" className="bg-white px-5 py-20 sm:px-6">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2">
          <div className="relative min-h-[480px] overflow-hidden rounded-[2.5rem] bg-slate-200 shadow-xl">
            <Image src="/yoyo/flyer-yoyo.jpg" alt="Servicios YOYO Envíos" fill className="object-cover object-center" />
          </div>
          <div>
            <SectionTitle eyebrow="Recogida a domicilio" title="Nosotros vamos por tu paquete" description="Servicio disponible en Carolina del Sur y zonas aledañas." />
            <div className="mt-7 space-y-4">
              {["Pesamos tu paquete", "Sellamos tu caja", "Entregamos comprobante", "Preparamos el envío", "Lo dejamos listo para Cuba"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 font-bold text-slate-700"><CheckCircle2 className="text-red-600" size={20} /> {item}</div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <div className="rounded-2xl bg-red-50 px-5 py-4"><p className="text-xs font-black uppercase text-red-600">Cargo por recogida</p><p className="mt-1 text-3xl font-black text-red-700">$20</p></div>
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl bg-[#071d43] px-6 py-4 font-black text-white"><Truck size={20} /> Programar recogida</a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6">
        <SectionTitle eyebrow="Productos permitidos" title="¿Qué puedes enviar?" description="Consulta con nuestro equipo cualquier artículo especial antes de empacarlo." />
        <div className="mt-9 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {sendables.map(({ icon: Icon, label }) => (
            <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Icon size={23} /></div>
              <p className="mt-4 text-sm font-black text-slate-700">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#071d43] px-5 py-20 text-white sm:px-6">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[.85fr_1.15fr]">
          <div className="relative min-h-[400px] overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/10">
            <Image src="/yoyo/tienda-yoyo.jpg" alt="Tienda física YOYO Envíos" fill className="object-cover" />
          </div>
          <div>
            <SectionTitle dark eyebrow="Tienda y misceláneas" title="Compra y envía desde un solo lugar" description="Productos para el hogar, alimentos, equipos eléctricos, accesorios y mucho más." />
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {["Alimentos", "Aseo", "Electrodomésticos", "Equipos electrónicos", "Estaciones de energía", "Combos y misceláneas"].map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 font-bold"><CheckCircle2 size={18} className="text-emerald-400" /> {item}</div>)}
            </div>
            <Link href={STORE_URL} className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-red-600 px-6 py-4 font-black transition hover:bg-red-500"><Store size={20} /> Entrar a la tienda <ArrowRight size={18} /></Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionTitle eyebrow="Por qué elegirnos" title="Más que un envío, una conexión" description="Un servicio cercano para conectar familias y llevar esperanza a Cuba." />
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {advantages.map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 font-bold text-slate-700"><CheckCircle2 size={19} className="text-emerald-600" /> {item}</div>)}
            </div>
          </div>
          <div className="rounded-[2.5rem] bg-slate-950 p-8 text-white sm:p-10">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-400">Métodos de pago</p>
            <h3 className="mt-2 text-3xl font-black">Paga como prefieras</h3>
            <div className="mt-7 grid gap-3">
              {["Efectivo", "Zelle", "Tarjeta de crédito", "Factura o comprobante"].map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-4 font-black"><WalletCards size={20} className="text-blue-300" /> {item}</div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-red-600 px-5 py-16 text-white sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 text-center lg:flex-row lg:text-left">
          <div><p className="text-sm font-black uppercase tracking-[0.16em] text-red-100">Cotización gratis</p><h2 className="mt-2 text-4xl font-black">Escríbenos hoy mismo</h2><p className="mt-2 font-semibold text-red-100">Estamos listos para ayudarte con tu próximo envío.</p></div>
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 rounded-2xl bg-white px-7 py-4 text-lg font-black text-emerald-700 shadow-xl"><MessageCircle size={23} /> (803) 262-3676</a>
        </div>
      </section>

      <footer className="bg-[#04142e] px-5 py-12 text-white sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-3">
          <div><p className="text-2xl font-black">YOYO ENVÍOS</p><p className="mt-3 max-w-sm text-sm font-semibold leading-6 text-blue-100/70">Conectamos familias y llevamos esperanza a Cuba con seguridad, confianza y responsabilidad.</p></div>
          <div><p className="font-black">Contacto</p><div className="mt-4 space-y-3 text-sm font-semibold text-blue-100/75"><p className="flex items-center gap-2"><MapPin size={16} /> Hopkins, South Carolina</p><p className="flex items-center gap-2"><MessageCircle size={16} /> (803) 262-3676</p><p className="flex items-center gap-2"><Clock3 size={16} /> Abierto todos los días</p></div></div>
          <div><p className="font-black">Síguenos</p><div className="mt-4 flex gap-3"><SocialIcon label="Facebook"><span className="text-sm font-black">f</span></SocialIcon><SocialIcon label="Instagram"><span className="text-xs font-black">IG</span></SocialIcon><SocialIcon label="WhatsApp"><MessageCircle size={20} /></SocialIcon></div></div>
        </div>
        <div className="mx-auto mt-10 max-w-7xl border-t border-white/10 pt-6 text-center text-xs font-semibold text-white/45">© 2026 YOYO Envíos. Demostración digital desarrollada sobre Perla Marketplace.</div>
      </footer>
    </main>
  );
}

function SectionTitle({ eyebrow, title, description, dark = false }: { eyebrow: string; title: string; description: string; dark?: boolean }) {
  return <div><p className={`text-xs font-black uppercase tracking-[0.18em] ${dark ? "text-blue-300" : "text-blue-700"}`}>{eyebrow}</p><h2 className={`mt-2 text-4xl font-black tracking-tight sm:text-5xl ${dark ? "text-white" : "text-[#071d43]"}`}>{title}</h2><p className={`mt-4 max-w-2xl text-base font-semibold leading-7 ${dark ? "text-blue-100/70" : "text-slate-500"}`}>{description}</p></div>;
}
function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="flex items-center gap-3 font-bold text-slate-600"><span className="text-blue-700">{icon}</span>{text}</div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="space-y-2"><span className="text-sm font-black text-blue-100">{label}</span>{children}</label>; }
function QuoteRow({ label, value }: { label: string; value: number }) { return <div className="flex justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3"><span className="font-bold text-slate-500">{label}</span><span className="font-black">{money(value)}</span></div>; }
function SocialIcon({ label, children }: { label: string; children: React.ReactNode }) { return <a href={WHATSAPP_URL} aria-label={label} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/20">{children}</a>; }
