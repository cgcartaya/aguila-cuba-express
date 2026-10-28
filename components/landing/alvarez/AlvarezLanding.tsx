"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Car,
  Check,
  ChevronDown,
  Clock3,
  Hotel,
  Languages,
  MapPin,
  Menu,
  MessageCircle,
  PackageCheck,
  Plane,
  Search,
  Send,
  ShieldCheck,
  TicketCheck,
  WalletCards,
  X,
} from "lucide-react";

import {
  ALVAREZ_ADDRESS,
  ALVAREZ_WHATSAPP_URL,
} from "@/components/landing/alvarez/constants";
import PublicQuoteCalculator from "@/components/portal/PublicQuoteCalculator";

const navigation = [
  { label: "Envíos", href: "#servicios" },
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Viajes", href: "#viajes" },
  { label: "Rastrear", href: "#rastreo" },
  { label: "Visítanos", href: "#contacto" },
];

const services = [
  {
    icon: Plane,
    title: "Envíos aéreos",
    description: "Paquetes y documentos con atención personalizada.",
    href: "#cotizar",
  },
  {
    icon: WalletCards,
    title: "Remesas",
    description: "Ayuda para tu familia con entrega coordinada.",
    href: ALVAREZ_WHATSAPP_URL,
  },
  {
    icon: TicketCheck,
    title: "Viajes",
    description: "Pasajes y reservaciones sin complicaciones.",
    href: "#viajes",
  },
  {
    icon: Hotel,
    title: "Hoteles y autos",
    description: "Organiza tu estancia desde un solo lugar.",
    href: "#viajes",
  },
];

function whatsappHref(message: string) {
  return `${ALVAREZ_WHATSAPP_URL}?text=${encodeURIComponent(message)}`;
}

export default function AlvarezLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [quoteRequest, setQuoteRequest] = useState<{ key: number; mode: string; weight: string; destination: string } | null>(null);

  function openQuote(mode: string, weight: string, destination: string) {
    const params = new URLSearchParams(window.location.search);
    params.set("transport", mode);
    params.set("weight", weight);
    params.set("country", destination);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}#cotizador-completo`);
    setQuoteRequest({ key: Date.now(), mode, weight, destination });
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => document.getElementById("cotizador-completo")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    });
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f5ef] text-[#020b20]">
      <Header menuOpen={menuOpen} onToggleMenu={() => setMenuOpen((value) => !value)} />
      <Hero />
      <QuickQuote onOpen={openQuote} />
      {quoteRequest && <InlineQuote key={quoteRequest.key} onClose={() => setQuoteRequest(null)} />}
      <OperationalStrip />
      <Services />
      <Process />
      <Tracking />
      <TravelAndLocal />
      <Footer />
    </main>
  );
}

function Header({ menuOpen, onToggleMenu }: { menuOpen: boolean; onToggleMenu: () => void }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#020b20]/95 text-white shadow-lg shadow-black/10 backdrop-blur-xl">
      <div className="mx-auto flex h-[86px] max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10">
        <Link href="/" aria-label="Alvarez Travel - Inicio" className="relative block h-[70px] w-[150px] shrink-0 sm:w-[180px]">
          <Image src="/alvarez/logo.png" alt="Alvarez Travel" fill priority sizes="180px" className="object-contain" />
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-bold text-white/75 lg:flex">
          {navigation.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-white">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button type="button" aria-label="Cambiar idioma" className="hidden h-11 items-center gap-2 rounded-full border border-white/20 px-4 text-xs font-black sm:flex">
            <Languages size={16} /> ES <span className="text-white/40">EN</span>
          </button>
          <a
            href={whatsappHref("Hola, quiero información sobre los servicios de Alvarez Travel.")}
            target="_blank"
            rel="noreferrer"
            className="hidden min-h-11 items-center gap-2 rounded-full bg-[#ef0712] px-5 text-sm font-black shadow-lg shadow-red-950/25 transition hover:bg-[#ff1822] sm:inline-flex"
          >
            <MessageCircle size={18} /> Hablar por WhatsApp
          </a>
          <button type="button" onClick={onToggleMenu} aria-expanded={menuOpen} aria-controls="alvarez-mobile-nav" aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} className="grid h-11 w-11 place-items-center rounded-full border border-white/20 lg:hidden">
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="alvarez-mobile-nav" className="border-t border-white/10 bg-[#020b20] px-5 pb-6 pt-3 lg:hidden">
          <nav className="grid gap-1">
            {navigation.map((item) => (
              <a key={item.href} href={item.href} onClick={onToggleMenu} className="rounded-xl px-4 py-3.5 font-bold text-white/85 hover:bg-white/10">
                {item.label}
              </a>
            ))}
          </nav>
          <a href={ALVAREZ_WHATSAPP_URL} target="_blank" rel="noreferrer" className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#ef0712] px-5 font-black">
            <MessageCircle size={19} /> Hablar por WhatsApp
          </a>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section className="alvarez-hero relative isolate overflow-hidden bg-[#020b20] text-white">
      <div className="alvarez-hero-bg absolute inset-0 -z-20">
        <Image
          src="/alvarez/hero-route.webp"
          alt="Ruta visual entre Hialeah y La Habana"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[59%_center] opacity-90"
        />
      </div>

      <div className="pointer-events-none absolute inset-0 -z-[15] overflow-hidden" aria-hidden="true">
        <span className="alvarez-route-glow alvarez-route-glow-blue" />
        <span className="alvarez-route-glow alvarez-route-glow-red" />

        <span className="alvarez-location-pulse alvarez-location-pulse-miami">
          <i />
        </span>
        <span className="alvarez-location-pulse alvarez-location-pulse-cuba">
          <i />
        </span>

        <span className="alvarez-plane-float">
          <Plane size={31} strokeWidth={1.8} />
        </span>
      </div>

      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#020b20_0%,rgba(2,11,32,.96)_16%,rgba(2,11,32,.76)_38%,rgba(2,11,32,.18)_64%,rgba(2,11,32,.08)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-[#020b20] to-transparent" />

      <div className="mx-auto flex min-h-[700px] max-w-[1440px] items-center px-5 pb-28 pt-16 sm:px-6 lg:px-10 lg:pb-32 lg:pt-20">
        <div className="max-w-3xl">
          <p className="alvarez-hero-enter alvarez-hero-enter-1 flex items-center gap-3 text-xs font-black uppercase tracking-[.24em] text-white/75 sm:text-sm">
            <span className="h-0.5 w-8 bg-[#ef0712]" /> Agencia de envíos y viajes · Hialeah
          </p>
          <h1 className="alvarez-hero-enter alvarez-hero-enter-2 mt-7 max-w-3xl text-5xl font-black leading-[.96] tracking-[-.055em] sm:text-7xl lg:text-[5.6rem]">
            De aquí pa&apos; Cuba, <span className="block text-[#f20b18]">sin cuento.</span>
          </h1>
          <p className="alvarez-hero-enter alvarez-hero-enter-3 mt-7 max-w-xl text-lg font-medium leading-8 text-white/78 sm:text-xl">
            Envíos rápidos, viajes y atención cercana para mantener a tu familia más cerca.
          </p>
          <div className="alvarez-hero-enter alvarez-hero-enter-4 mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#cotizar" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#ef0712] px-7 font-black shadow-xl shadow-red-950/30 transition hover:-translate-y-0.5 hover:bg-[#ff1822]">
              Cotizar mi envío <ArrowRight size={19} />
            </a>
            <a href="#rastreo" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-white/35 bg-black/20 px-7 font-black backdrop-blur transition hover:bg-white/10">
              <Search size={19} /> Rastrear paquete
            </a>
          </div>
          <div className="alvarez-hero-enter alvarez-hero-enter-5 mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-white/75">
            <span className="flex items-center gap-2"><Check className="text-emerald-400" size={18} /> Atención en Hialeah</span>
            <span className="flex items-center gap-2"><Check className="text-emerald-400" size={18} /> Entrega coordinada</span>
            <span className="flex items-center gap-2"><Check className="text-emerald-400" size={18} /> Seguimiento online</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .alvarez-hero-bg {
          transform: scale(1.015);
          animation: alvarezHeroDrift 18s ease-in-out infinite alternate;
          will-change: transform;
        }

        .alvarez-route-glow {
          position: absolute;
          width: 34%;
          height: 3px;
          border-radius: 999px;
          opacity: 0;
          filter: blur(.2px);
          transform-origin: left center;
          animation: alvarezRouteTravel 5.8s ease-in-out infinite;
        }

        .alvarez-route-glow-blue {
          left: 58%;
          top: 35%;
          background: linear-gradient(90deg, transparent, rgba(80, 176, 255, .2), rgba(121, 205, 255, .95), transparent);
          transform: rotate(11deg);
          box-shadow: 0 0 16px rgba(45, 152, 255, .8);
        }

        .alvarez-route-glow-red {
          left: 59%;
          top: 38%;
          background: linear-gradient(90deg, transparent, rgba(255, 55, 70, .15), rgba(255, 70, 82, .9), transparent);
          transform: rotate(8deg);
          box-shadow: 0 0 14px rgba(239, 7, 18, .7);
          animation-delay: 1.25s;
        }

        .alvarez-location-pulse {
          position: absolute;
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: white;
          box-shadow: 0 0 18px rgba(255, 255, 255, .9);
        }

        .alvarez-location-pulse i {
          position: absolute;
          inset: -8px;
          border: 2px solid rgba(255, 255, 255, .75);
          border-radius: inherit;
          animation: alvarezPulse 2.8s ease-out infinite;
        }

        .alvarez-location-pulse-miami {
          left: 59%;
          top: 33%;
          background: #5bb8ff;
          box-shadow: 0 0 20px rgba(91, 184, 255, .95);
        }

        .alvarez-location-pulse-cuba {
          right: 15%;
          top: 47%;
          background: #ff3140;
          box-shadow: 0 0 20px rgba(255, 49, 64, .95);
        }

        .alvarez-location-pulse-cuba i {
          animation-delay: .7s;
        }

        .alvarez-plane-float {
          position: absolute;
          right: 26%;
          top: 28%;
          color: rgba(255, 255, 255, .88);
          filter: drop-shadow(0 5px 12px rgba(0, 0, 0, .35));
          transform: rotate(14deg);
          animation: alvarezPlaneFloat 7s ease-in-out infinite;
        }

        .alvarez-hero-enter {
          opacity: 0;
          transform: translateY(14px);
          animation: alvarezHeroEnter .75s cubic-bezier(.22,.8,.22,1) forwards;
        }

        .alvarez-hero-enter-1 { animation-delay: .08s; }
        .alvarez-hero-enter-2 { animation-delay: .18s; }
        .alvarez-hero-enter-3 { animation-delay: .30s; }
        .alvarez-hero-enter-4 { animation-delay: .42s; }
        .alvarez-hero-enter-5 { animation-delay: .54s; }

        @keyframes alvarezHeroDrift {
          0% { transform: scale(1.015) translate3d(0, 0, 0); }
          100% { transform: scale(1.045) translate3d(-.55%, -.35%, 0); }
        }

        @keyframes alvarezRouteTravel {
          0%, 15% { opacity: 0; clip-path: inset(0 100% 0 0); }
          35% { opacity: .95; }
          72% { opacity: .65; clip-path: inset(0 0 0 0); }
          100% { opacity: 0; clip-path: inset(0 0 0 100%); }
        }

        @keyframes alvarezPulse {
          0% { transform: scale(.45); opacity: .8; }
          70%, 100% { transform: scale(2.15); opacity: 0; }
        }

        @keyframes alvarezPlaneFloat {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(14deg); }
          50% { transform: translate3d(11px, -8px, 0) rotate(17deg); }
        }

        @keyframes alvarezHeroEnter {
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 767px) {
          .alvarez-route-glow,
          .alvarez-location-pulse,
          .alvarez-plane-float {
            opacity: .55;
            transform: scale(.8);
          }

          .alvarez-route-glow-blue {
            left: 58%;
            top: 31%;
          }

          .alvarez-route-glow-red {
            left: 58%;
            top: 34%;
          }

          .alvarez-location-pulse-miami {
            left: 61%;
            top: 30%;
          }

          .alvarez-location-pulse-cuba {
            right: 7%;
            top: 43%;
          }

          .alvarez-plane-float {
            right: 18%;
            top: 25%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .alvarez-hero-bg,
          .alvarez-route-glow,
          .alvarez-location-pulse i,
          .alvarez-plane-float,
          .alvarez-hero-enter {
            animation: none !important;
          }

          .alvarez-hero-enter {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </section>
  );
}

function QuickQuote({ onOpen }: { onOpen: (mode: string, weight: string, destination: string) => void }) {
  const [mode, setMode] = useState("air");
  const [weight, setWeight] = useState("10");
  const [destination, setDestination] = useState("Cuba");

  function submit(event: FormEvent) {
    event.preventDefault();
    onOpen(mode, weight, destination);
  }

  return (
    <section id="cotizar" className="relative z-20 -mt-16 px-5 pb-8 sm:px-6 lg:px-10">
      <form onSubmit={submit} className="mx-auto grid max-w-[1320px] gap-4 rounded-[2rem] border border-slate-200 bg-[#fffdf8] p-5 text-[#020b20] shadow-2xl shadow-slate-950/15 sm:p-7 lg:grid-cols-[.9fr_1fr_1fr_1fr_auto] lg:items-end">
        <div className="lg:pb-1">
          <p className="text-xs font-black uppercase tracking-[.18em] text-[#ef0712]">Estimado personalizado</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Cotiza aquí mismo</h2>
          <p className="mt-1 text-sm font-medium leading-5 text-slate-500">Sin salir de la página.</p>
        </div>
        <SelectField icon={<Plane size={19} />} label="Tipo de envío" value={mode} onChange={setMode} options={[{ value: "air", label: "Aéreo" }, { value: "sea", label: "Marítimo" }]} />
        <SelectField icon={<PackageCheck size={19} />} label="Peso estimado" value={weight} onChange={setWeight} options={[{ value: "10", label: "10 lb" }, { value: "20", label: "20 lb" }, { value: "50", label: "50 lb" }, { value: "100", label: "100 lb" }]} />
        <SelectField icon={<MapPin size={19} />} label="Destino" value={destination} onChange={setDestination} options={[{ value: "Cuba", label: "Cuba" }]} />
        <button className="flex min-h-[66px] items-center justify-center gap-2 rounded-2xl bg-[#ef0712] px-6 font-black whitespace-nowrap text-white transition hover:bg-[#ff1822]">
          Continuar aquí <ArrowRight size={19} />
        </button>
      </form>
    </section>
  );
}

function InlineQuote({ onClose }: { onClose: () => void }) {
  return (
    <section id="cotizador-completo" className="scroll-mt-24 bg-[#eef3fb] px-5 py-14 sm:px-6 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-blue-700">Cotización en línea</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Completa tu estimado sin salir de Álvarez Travel.</h2>
          </div>
          <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-full border border-slate-300 bg-white px-5 text-sm font-black text-slate-700">
            <X size={17} /> Cerrar cotizador
          </button>
        </div>
        <PublicQuoteCalculator embedded />
      </div>
    </section>
  );
}

function SelectField({ icon, label, value, onChange, options }: { icon: React.ReactNode; label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="relative flex min-h-[66px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
      <span className="text-blue-700">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold text-slate-400">{label}</span>
        <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full appearance-none bg-transparent pr-7 text-sm font-black outline-none">
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </span>
      <ChevronDown className="pointer-events-none absolute right-4 text-slate-400" size={17} />
    </label>
  );
}

function OperationalStrip() {
  return (
    <section className="border-y border-white/10 bg-[#031128] text-white">
      <div className="mx-auto grid max-w-[1440px] divide-y divide-white/10 px-5 sm:grid-cols-2 sm:divide-x sm:divide-y-0 sm:px-6 lg:grid-cols-4 lg:px-10">
        <Status icon={CalendarDays} label="Salidas" value="Consulta la próxima" />
        <Status icon={Clock3} label="Entrega típica" value="24–72 horas" />
        <Status icon={MapPin} label="Ruta principal" value="Hialeah → La Habana" />
        <Status icon={ShieldCheck} label="Atención" value="Local y por WhatsApp" active />
      </div>
      <div className="h-2 bg-[repeating-linear-gradient(135deg,#ef0712_0_12px,#fff_12px_24px,#174ca0_24px_36px,#fff_36px_48px)]" />
    </section>
  );
}

function Status({ icon: Icon, label, value, active = false }: { icon: typeof Clock3; label: string; value: string; active?: boolean }) {
  return (
    <div className="flex min-h-24 items-center gap-4 px-4 py-5 sm:px-6">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-500/15 text-blue-300"><Icon size={22} /></span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-xs font-bold text-white/50">{active && <i className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_14px_#34d399]" />} {label}</span>
        <strong className="mt-1 block text-sm sm:text-base">{value}</strong>
      </span>
    </div>
  );
}

function Services() {
  return (
    <section id="servicios" className="px-5 py-20 sm:px-6 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-[1320px]">
        <SectionHeading eyebrow="Servicios" title={<>Todo lo que necesitas, <span className="text-[#ef0712]">en un solo lugar.</span></>} text="Resuelve el envío y también organiza lo que viene después, con atención directa desde Hialeah." />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => {
            const Icon = service.icon;
            const external = service.href.startsWith("http");
            return (
              <a key={service.title} href={service.href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="group rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl">
                <span className="grid h-13 w-13 place-items-center rounded-2xl bg-blue-50 text-blue-700 transition group-hover:bg-[#031128] group-hover:text-white"><Icon size={25} /></span>
                <h3 className="mt-6 text-xl font-black">{service.title}</h3>
                <p className="mt-2 min-h-12 text-sm font-medium leading-6 text-slate-500">{service.description}</p>
                <span className="mt-6 flex items-center gap-2 text-sm font-black text-[#ef0712]">Conocer más <ArrowRight size={17} /></span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Process() {
  const steps = [
    { number: "01", title: "Cotiza", text: "Indica qué envías, cuánto pesa y hacia dónde va." },
    { number: "02", title: "Confirma", text: "La agencia revisa los datos y confirma el servicio contigo." },
    { number: "03", title: "Rastrea", text: "Consulta el progreso con tu código de seguimiento." },
  ];
  return (
    <section id="como-funciona" className="bg-white px-5 py-20 sm:px-6 lg:px-10 lg:py-28">
      <div className="mx-auto grid max-w-[1320px] items-center gap-12 lg:grid-cols-[.9fr_1.1fr]">
        <div className="relative min-h-[460px] overflow-hidden rounded-[2.5rem] shadow-2xl">
          <Image src="/alvarez/storefront.jpg" alt="Local de Alvarez Travel en Hialeah" fill sizes="(max-width:1023px) 100vw, 45vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020b20] via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-7 text-white sm:p-9">
            <p className="text-xs font-black uppercase tracking-[.2em] text-blue-200">Atención presencial</p>
            <h3 className="mt-2 text-3xl font-black">Una agencia real, cerca de ti.</h3>
            <p className="mt-2 max-w-md text-white/75">Visítanos en Hialeah o completa el proceso desde tu teléfono.</p>
          </div>
        </div>
        <div>
          <SectionHeading eyebrow="Cómo funciona" title={<>Tres pasos. <span className="text-[#ef0712]">Ni uno más.</span></>} text="Una experiencia más clara para el cliente y menos preguntas repetidas para la agencia." />
          <div className="mt-9 space-y-4">
            {steps.map((step) => (
              <article key={step.number} className="flex gap-5 rounded-3xl border border-slate-200 bg-[#f8f5ef] p-5 sm:p-6">
                <span className="grid h-13 w-13 shrink-0 place-items-center rounded-2xl bg-[#031128] font-black text-white">{step.number}</span>
                <div><h3 className="text-xl font-black">{step.title}</h3><p className="mt-1 font-medium leading-7 text-slate-500">{step.text}</p></div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Tracking() {
  const [code, setCode] = useState("");
  const trackingHref = useMemo(() => code.trim() ? `/rastrear/${encodeURIComponent(code.trim())}` : "/rastrear", [code]);
  return (
    <section id="rastreo" className="relative isolate overflow-hidden bg-[#020b20] px-5 py-20 text-white sm:px-6 lg:px-10 lg:py-28">
      <Image src="/alvarez/hero-route.webp" alt="" fill sizes="100vw" className="-z-20 object-cover object-center opacity-25" />
      <div className="absolute inset-0 -z-10 bg-[#020b20]/75" />
      <div className="mx-auto grid max-w-[1320px] items-center gap-12 lg:grid-cols-[1fr_.9fr]">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-300">Seguimiento online</p>
          <h2 className="mt-4 max-w-xl text-4xl font-black tracking-tight sm:text-5xl">Tu envío, <span className="text-[#f20b18]">siempre visible.</span></h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-white/68">Ingresa tu código y consulta el estado de tu paquete sin tener que llamar a la agencia.</p>
          <div className="mt-10 grid grid-cols-3 gap-2 sm:gap-4">
            {[{ icon: PackageCheck, label: "Recibido" }, { icon: Plane, label: "En tránsito" }, { icon: MapPin, label: "Entregado" }].map(({ icon: Icon, label }, index) => (
              <div key={label} className="relative text-center">
                {index < 2 && <span className="absolute left-[65%] top-6 h-0.5 w-[70%] bg-gradient-to-r from-blue-400 to-white/20" />}
                <span className={`relative mx-auto grid h-12 w-12 place-items-center rounded-full border ${index === 1 ? "border-blue-300 bg-blue-500 shadow-[0_0_24px_rgba(59,130,246,.55)]" : "border-white/30 bg-white/10"}`}><Icon size={21} /></span>
                <strong className="mt-3 block text-xs sm:text-sm">{label}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-xl sm:p-7">
          <label className="text-sm font-black">Código de rastreo</label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Ej. código de tu recibo" className="min-h-14 min-w-0 flex-1 rounded-2xl border border-white/20 bg-white px-5 font-bold text-[#020b20] outline-none placeholder:font-medium placeholder:text-slate-400 focus:ring-4 focus:ring-blue-500/25" />
            <Link href={trackingHref} className="inline-flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#ef0712] px-6 font-black transition hover:bg-[#ff1822]">Rastrear <ArrowRight size={18} /></Link>
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm text-white/60"><ShieldCheck size={17} /> Consulta segura; tus datos personales permanecen protegidos.</p>
        </div>
      </div>
    </section>
  );
}

function TravelAndLocal() {
  return (
    <section id="viajes" className="px-5 py-20 sm:px-6 lg:px-10 lg:py-28">
      <div className="mx-auto grid max-w-[1320px] gap-5 lg:grid-cols-2">
        <article className="rounded-[2.5rem] bg-[#031128] p-7 text-white sm:p-10">
          <span className="grid h-13 w-13 place-items-center rounded-2xl bg-blue-500/20 text-blue-300"><Send size={25} /></span>
          <p className="mt-7 text-xs font-black uppercase tracking-[.2em] text-blue-300">Viajes</p>
          <h2 className="mt-3 text-4xl font-black">Y cuando te toque ir en persona.</h2>
          <p className="mt-4 max-w-xl text-lg leading-8 text-white/65">Pasajes, hoteles y renta de autos. Alvarez Travel te ayuda a organizarlo todo.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {[{ icon: Plane, label: "Pasajes" }, { icon: Hotel, label: "Hoteles" }, { icon: Car, label: "Renta de autos" }].map(({ icon: Icon, label }) => <div key={label} className="rounded-2xl bg-white/8 p-4"><Icon className="text-blue-300" /><b className="mt-3 block">{label}</b></div>)}
          </div>
          <a href={whatsappHref("Hola, quiero información para organizar un viaje.")} target="_blank" rel="noreferrer" className="mt-7 inline-flex min-h-13 items-center gap-2 rounded-full bg-[#ef0712] px-6 font-black"><MessageCircle size={18} /> Consultar mi viaje</a>
        </article>

        <article id="contacto" className="relative min-h-[500px] overflow-hidden rounded-[2.5rem] text-white">
          <Image src="/alvarez/interior.jpg" alt="Interior del local de Alvarez Travel" fill sizes="(max-width:1023px) 100vw, 50vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020b20] via-[#020b20]/35 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-7 sm:p-10">
            <p className="text-xs font-black uppercase tracking-[.2em] text-blue-200">Visítanos en Hialeah</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">Puedes venir a ver quién atiende tu envío.</h2>
            <p className="mt-4 flex items-start gap-2 font-bold text-white/80"><MapPin className="mt-0.5 shrink-0" size={20} /> {ALVAREZ_ADDRESS}</p>
            <a href="https://www.google.com/maps/search/?api=1&query=1805+E+4th+Ave+Hialeah+FL+33010" target="_blank" rel="noreferrer" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 font-black text-[#020b20]">Cómo llegar <ArrowRight size={18} /></a>
          </div>
        </article>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#010714] px-5 py-12 text-white sm:px-6 lg:px-10">
      <div className="mx-auto grid max-w-[1320px] gap-10 lg:grid-cols-[1fr_auto_auto]">
        <div><div className="relative h-24 w-52"><Image src="/alvarez/logo.png" alt="Alvarez Travel" fill sizes="208px" className="object-contain object-left" /></div><p className="mt-3 max-w-md text-sm leading-6 text-white/55">Conectando familias entre Hialeah y Cuba con atención cercana.</p></div>
        <div><p className="font-black">Horario</p><p className="mt-3 text-sm leading-7 text-white/60">Lunes–Viernes · 9:00 AM–5:00 PM<br />Sábado–Domingo · 9:30 AM–2:00 PM</p></div>
        <div><p className="font-black">Contacto</p><a href={ALVAREZ_WHATSAPP_URL} className="mt-3 flex items-center gap-2 text-sm font-bold text-white/70"><MessageCircle size={17} /> (305) 509-0981</a><p className="mt-2 flex items-start gap-2 text-sm text-white/60"><Building2 className="mt-0.5 shrink-0" size={17} /> {ALVAREZ_ADDRESS}</p></div>
      </div>
      <div className="mx-auto mt-10 flex max-w-[1320px] flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/35 sm:flex-row sm:justify-between"><p>© {new Date().getFullYear()} Alvarez Travel</p><p>Experiencia digital desarrollada con Perla Marketplace</p></div>
    </footer>
  );
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: React.ReactNode; text: string }) {
  return <div className="max-w-3xl"><p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">{eyebrow}</p><h2 className="mt-3 text-4xl font-black tracking-[-.04em] sm:text-5xl">{title}</h2><p className="mt-4 max-w-2xl text-lg font-medium leading-8 text-slate-500">{text}</p></div>;
}

