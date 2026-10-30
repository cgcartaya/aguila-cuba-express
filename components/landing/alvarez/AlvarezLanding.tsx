"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Hotel,
  MapPin,
  Menu,
  MessageCircle,
  PackageCheck,
  Plane,
  Search,
  ShieldCheck,
  ShoppingBag,
  TicketCheck,
  WalletCards,
  X,
} from "lucide-react";
import {
  ALVAREZ_ADDRESS,
  ALVAREZ_WHATSAPP_PHONE,
  ALVAREZ_WHATSAPP_URL,
} from "@/components/landing/alvarez/constants";
import PickupPlannerHero from "@/components/pickups/PickupPlannerHero";
import PublicQuoteCalculator from "@/components/portal/PublicQuoteCalculator";
import RemittanceCalculator from "./RemittanceCalculator";

const navigation = [
  { label: "Recogida", href: "#solicitar-recogida" },
  { label: "Envíos", href: "#servicios" },
  { label: "Remesas", href: "#remesas" },
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Viajes", href: "#viajes" },
  { label: "Tienda", href: "/tienda" },
  { label: "Rastrear", href: "#rastreo" },
  { label: "Visítanos", href: "#contacto" },
];

const services = [
  { icon: Plane, title: "Envíos a Cuba", description: "Te orientamos sobre las opciones disponibles para tus paquetes y documentos.", href: "#cotizar" },
  { icon: WalletCards, title: "Remesas", description: "Calcula la comisión y el total de tu remesa con nuestras tarifas actuales.", href: "#remesas" },
  { icon: TicketCheck, title: "Viajes", description: "Orientación para pasajes y reservaciones según disponibilidad.", href: "#viajes" },
  { icon: Hotel, title: "Hoteles y autos", description: "Consulta alternativas para organizar tu estancia desde un solo lugar.", href: "#viajes" },
];

function whatsappHref(message: string) {
  return `${ALVAREZ_WHATSAPP_URL}?text=${encodeURIComponent(message)}`;
}

export default function AlvarezLanding() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#000415] font-sans text-white">
      <Header menuOpen={menuOpen} onToggle={() => setMenuOpen((v) => !v)} />
      <Hero />
      <section id="solicitar-recogida" className="alvarez-pickup relative z-20 -mt-16 scroll-mt-28 px-5 pb-12 sm:px-7 lg:px-10"><div className="mx-auto max-w-[1320px] overflow-hidden rounded-[28px] border border-white/10 bg-[#091D3D] shadow-2xl"><p className="px-6 pt-6 text-xs font-black uppercase tracking-widest text-[#B5BFCD] sm:px-8">Miami · Hialeah y alrededores</p><PickupPlannerHero variant="horizontal" storeSlug="alvarez-travel" storeName="Álvarez Travel" whatsappPhone={ALVAREZ_WHATSAPP_PHONE} /></div></section>
      <ShippingOptions />
      <section id="cotizar" className="scroll-mt-28 bg-[#091D3D] px-5 py-12 sm:px-7 sm:py-16 lg:px-10"><div className="mx-auto max-w-[1320px] lg:max-w-[1040px]"><div className="mb-7"><p className="text-xs font-black uppercase tracking-widest text-[#CA0C28]">Cotización en línea</p><h2 className="mt-3 text-2xl font-black uppercase sm:text-4xl">Cotiza tu envío a Cuba</h2><p className="mt-3 text-[#B5BFCD]">Selecciona los datos de tu envío. Nuestro equipo confirma las tarifas y condiciones disponibles.</p></div><PublicQuoteCalculator embedded /></div></section>
      <RemittanceCalculator />
      <BrandPromise />
      <Services />
      <Process />
      <Tracking />
      <TravelAndStore />
      <Contact />
      <Footer />
    </main>
  );
}

function Header({ menuOpen, onToggle }: { menuOpen: boolean; onToggle: () => void }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#000415]/95 shadow-xl shadow-black/20 backdrop-blur-xl">
      <div className="mx-auto flex h-[92px] max-w-[1440px] items-center justify-between px-5 sm:px-7 lg:px-10">
        <Link href="/" aria-label="Álvarez Travel - Inicio" className="relative block h-[72px] w-[168px] shrink-0 sm:w-[190px]">
          <Image src="/alvarez/logo.png" alt="Álvarez Travel" fill priority sizes="190px" className="object-contain" />
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-bold text-white/75 xl:flex">
          {navigation.map((item) => <a key={item.href} href={item.href} className="transition hover:text-white">{item.label}</a>)}
        </nav>
        <div className="flex items-center gap-2">
          <a href={whatsappHref("Hola, quisiera información sobre sus servicios.")} target="_blank" rel="noreferrer" className="hidden min-h-11 items-center gap-2 rounded-xl bg-[#CA0C28] px-5 text-sm font-black transition hover:brightness-110 sm:inline-flex">
            <MessageCircle size={18} /> Escríbenos
          </a>
          <button type="button" onClick={onToggle} aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} className="grid h-11 w-11 place-items-center rounded-xl border border-white/20 xl:hidden">{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </div>
      {menuOpen && (
        <div className="border-t border-white/10 bg-[#091D3D] px-5 pb-6 pt-3 xl:hidden">
          <nav className="grid gap-1">{navigation.map((item) => <a key={item.href} href={item.href} onClick={onToggle} className="rounded-xl px-4 py-3.5 font-bold text-white/90 hover:bg-white/10">{item.label}</a>)}</nav>
          <a href={whatsappHref("Hola, quisiera información sobre sus servicios.")} target="_blank" rel="noreferrer" className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#CA0C28] px-5 font-black"><MessageCircle size={18} /> Escríbenos</a>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section className="alvarez-live-map relative isolate overflow-hidden bg-[#000415]">
      <div className="alvarez-hero-background absolute inset-0 z-0">
        <Image src="/alvarez/hero-map-background.webp" alt="Conexión visual entre Miami y La Habana" fill priority sizes="100vw" className="object-cover object-center opacity-65" />
      </div>
      <div className="alvarez-water-shimmer absolute inset-0 z-[1]" aria-hidden="true" />
      <div className="alvarez-map-glow absolute inset-0 z-[1]" aria-hidden="true" />
      <svg className="alvarez-route-layer absolute inset-0 z-[2] h-full w-full" viewBox="0 0 1680 945" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="alvarezRouteAir" x1="780" y1="415" x2="1055" y2="260" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ff2440" />
            <stop offset=".46" stopColor="#f7f9ff" />
            <stop offset="1" stopColor="#3b9dff" />
          </linearGradient>
          <linearGradient id="alvarezRouteCuba" x1="780" y1="415" x2="805" y2="515" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2c94ff" />
            <stop offset=".55" stopColor="#f8fbff" />
            <stop offset="1" stopColor="#ff2440" />
          </linearGradient>
          <filter id="alvarezRouteGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <path className="alvarez-route-base" d="M780 415 C850 340 931 287 1055 260" stroke="url(#alvarezRouteAir)" />
        <path className="alvarez-route-travel alvarez-route-travel-air" d="M780 415 C850 340 931 287 1055 260" stroke="url(#alvarezRouteAir)" />
        <path className="alvarez-route-base" d="M780 415 C870 438 902 490 805 515" stroke="url(#alvarezRouteCuba)" />
        <path className="alvarez-route-travel alvarez-route-travel-cuba" d="M780 415 C870 438 902 490 805 515" stroke="url(#alvarezRouteCuba)" />
        <g className="alvarez-map-point alvarez-map-point-miami" transform="translate(780 415)" filter="url(#alvarezRouteGlow)">
          <circle className="alvarez-point-wave" r="14" /><circle className="alvarez-point-core" r="8" />
        </g>
        <g className="alvarez-map-point alvarez-map-point-cuba" transform="translate(805 515)" filter="url(#alvarezRouteGlow)">
          <circle className="alvarez-point-wave" r="14" /><circle className="alvarez-point-core" r="8" />
        </g>
      </svg>
      <div className="alvarez-plane-layer absolute z-[3]" aria-hidden="true">
        <Image src="/alvarez/hero-plane.webp" alt="" fill priority sizes="(max-width: 768px) 260px, 480px" className="object-contain" />
      </div>
      <div className="absolute inset-0 z-[4] bg-[linear-gradient(90deg,#000415_0%,rgba(0,4,21,.97)_25%,rgba(0,4,21,.78)_48%,rgba(0,4,21,.25)_78%,rgba(0,4,21,.35)_100%)]" />
      <div className="absolute inset-0 z-[5] opacity-40 [background-image:radial-gradient(circle_at_15%_20%,rgba(7,64,154,.35),transparent_28%),radial-gradient(circle_at_82%_75%,rgba(202,12,40,.18),transparent_25%)]" />
      <div className="relative z-10 mx-auto flex min-h-[680px] max-w-[1440px] items-center px-5 pb-28 pt-16 sm:px-7 lg:px-10">
        <div className="max-w-[720px]">
          <p className="alvarez-hero-reveal flex items-center gap-3 text-xs font-black uppercase tracking-[.22em] text-[#B5BFCD] [animation-delay:80ms]"><span className="h-[3px] w-9 bg-[#CA0C28]" /> La nueva era</p>
          <h1 className="alvarez-hero-reveal mt-7 text-5xl font-black uppercase leading-[.94] tracking-[-.04em] [animation-delay:170ms] sm:text-7xl lg:text-[5.3rem]">Conectamos <span className="block text-white">dos orillas.</span></h1>
          <p className="alvarez-hero-reveal mt-6 max-w-xl text-xl font-semibold leading-8 text-white/82 [animation-delay:270ms]">Una conexión clara, humana y confiable entre Estados Unidos y Cuba.</p>
          <p className="alvarez-hero-reveal mt-3 text-lg italic text-[#B5BFCD] [animation-delay:350ms]">De aquí pa&apos; Cuba sin cuento</p>
          <div className="alvarez-hero-reveal mt-8 flex flex-col gap-3 [animation-delay:430ms] sm:flex-row">
            <a href="#cotizar" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#CA0C28] px-7 font-black uppercase tracking-wide shadow-xl shadow-black/30 transition hover:-translate-y-0.5 hover:brightness-110">Consulta tus opciones <ArrowRight size={19} /></a>
            <Link href="/tienda" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border border-white/25 bg-[#091D3D]/80 px-7 font-black transition hover:bg-[#091D3D]"><ShoppingBag size={19} /> Ver tienda</Link>
          </div>
          <div className="alvarez-hero-reveal mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-white/70 [animation-delay:520ms]">
            <span className="flex items-center gap-2"><Check className="text-[#B5BFCD]" size={17} /> Información clara</span>
            <span className="flex items-center gap-2"><Check className="text-[#B5BFCD]" size={17} /> Atención cercana</span>
            <span className="flex items-center gap-2"><Check className="text-[#B5BFCD]" size={17} /> Condiciones confirmadas</span>
          </div>
        </div>
      </div>
    </section>
  );
}

const shippingOffers = [
  { name: "Envío Express", image: "/alvarez/shipping-express.webp", details: "Menos de 20 lb: $6 USD/lb. Desde 20 lb: $4 USD/lb para todo el peso. La Habana: 24 horas. Demás provincias: 5–6 días." },
  { name: "Envío Regular", image: "/alvarez/shipping-regular.webp", details: "$3 USD/lb a cualquier peso. Entrega en 7–12 días en todas las provincias, incluida La Habana." },
];

function ShippingOptions() {
  const [selected, setSelected] = useState<(typeof shippingOffers)[number] | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!selected) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [selected]);

  function requestInfo() {
    if (!selected) return;
    const photoUrl = new URL(selected.image, window.location.origin).href;
    const message = `Hola, quisiera información sobre esta oferta de Álvarez Travel: ${selected.name}.\n${selected.details}\nPostal de la oferta: ${photoUrl}`;
    window.open(whatsappHref(message), "_blank", "noopener,noreferrer");
  }

  return (
    <section className="bg-[#000415] px-5 py-14 sm:px-7 lg:px-10">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-8 flex justify-center">
          <a href="#cotizar" className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-[#CA0C28] px-8 text-lg font-black transition hover:bg-[#a80920] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            Cotizar mi envío <ArrowRight size={21} />
          </a>
        </div>
        <div className="mx-auto grid max-w-[1100px] gap-6 md:grid-cols-2">
          {shippingOffers.map((offer) => (
            <button key={offer.name} type="button" onClick={() => setSelected(offer)} aria-label={`Ampliar oferta: ${offer.name}`} className="rounded-2xl transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              <Image src={offer.image} alt={`${offer.name}. ${offer.details}`} width={1024} height={1536} sizes="(max-width: 767px) calc(100vw - 40px), 538px" className="h-auto w-full rounded-2xl" />
            </button>
          ))}
        </div>
      </div>
      <dialog ref={dialogRef} onCancel={() => setSelected(null)} onClose={() => setSelected(null)} onClick={(event) => { if (event.target === event.currentTarget) setSelected(null); }} aria-labelledby="alvarez-offer-title" className="fixed inset-0 m-auto max-h-[95dvh] w-[calc(100%-24px)] max-w-3xl overflow-y-auto rounded-2xl border border-white/15 bg-[#091D3D] p-0 text-white shadow-2xl backdrop:bg-black/85">
        {selected && <>
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-[#091D3D] px-4 py-3">
            <h2 id="alvarez-offer-title" className="text-lg font-bold">{selected.name}</h2>
            <button autoFocus type="button" onClick={() => setSelected(null)} aria-label="Cerrar oferta" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/20"><X size={24} /></button>
          </div>
          <Image src={selected.image} alt={`${selected.name}. ${selected.details}`} width={1024} height={1536} sizes="(max-width: 767px) calc(100vw - 24px), 768px" className="h-auto w-full" />
          <div className="sticky bottom-0 border-t border-white/10 bg-[#091D3D] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button type="button" onClick={requestInfo} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#CA0C28] px-4 font-bold hover:bg-[#a80920]"><MessageCircle size={21} /> Pedir información sobre esta oferta</button>
          </div>
        </>}
      </dialog>
    </section>
  );
}

function BrandPromise() {
  return <section className="border-y border-white/10 bg-[#000415] px-5 py-12 sm:px-7 lg:px-10"><div className="mx-auto grid max-w-[1320px] gap-6 md:grid-cols-4">{[["Cercanía","Hablamos claro, en un lenguaje familiar."],["Confianza","Información precisa y procesos transparentes."],["Energía","Una atención ágil, activa y resolutiva."],["Identidad","Raíces cubanas y mirada hacia adelante."]].map(([a,b],i)=><div key={a} className="border-l-2 border-[#07409A] pl-5"><span className="text-xs font-black text-[#CA0C28]">0{i+1}</span><h3 className="mt-2 text-xl font-black uppercase">{a}</h3><p className="mt-2 text-sm leading-6 text-[#B5BFCD]">{b}</p></div>)}</div></section>;
}

function Services() {
  return <section id="servicios" className="bg-[#091D3D] px-5 py-20 sm:px-7 lg:px-10"><div className="mx-auto max-w-[1320px]"><SectionTitle eyebrow="Servicio y conexión" title="Todo empieza por entender qué necesitas." text="Te orientamos con información clara y confirmamos las condiciones antes de gestionar cada servicio."/><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{services.map(({icon:Icon,...s})=><a key={s.title} href={s.href} className="group rounded-2xl border border-white/10 bg-[#000415] p-6 transition hover:-translate-y-1 hover:border-[#07409A]"><span className="grid h-12 w-12 place-items-center rounded-xl bg-[#07409A]/25 text-[#B5BFCD]"><Icon size={23}/></span><h3 className="mt-6 text-xl font-black uppercase">{s.title}</h3><p className="mt-3 min-h-20 text-sm leading-6 text-[#B5BFCD]">{s.description}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-white">Consultar <ArrowRight size={16} className="transition group-hover:translate-x-1"/></span></a>)}</div></div></section>;
}

function Process() {
  const steps=[[MessageCircle,"Cuéntanos qué necesitas","Escríbenos o utiliza el cotizador para iniciar la consulta."],[ShieldCheck,"Confirmamos las condiciones","Revisamos opciones, requisitos, precio y disponibilidad antes de continuar."],[PackageCheck,"Gestionamos contigo","Te acompañamos durante el proceso con información clara y trato directo."]];
  return <section id="como-funciona" className="bg-[#000415] px-5 py-20 sm:px-7 lg:px-10"><div className="mx-auto max-w-[1320px]"><SectionTitle eyebrow="Cómo funciona" title="Claro desde el primer paso." text="Sin promesas genéricas: cada servicio se confirma según las condiciones operativas disponibles."/><div className="mt-12 grid gap-5 md:grid-cols-3">{steps.map(([I,t,d],i)=>{const Icon=I as typeof MessageCircle;return <div key={String(t)} className="relative rounded-2xl border border-white/10 bg-[#091D3D] p-7"><span className="absolute right-6 top-5 text-5xl font-black text-white/5">0{i+1}</span><Icon className="text-[#CA0C28]" size={28}/><h3 className="mt-6 text-xl font-black uppercase">{String(t)}</h3><p className="mt-3 text-sm leading-6 text-[#B5BFCD]">{String(d)}</p></div>})}</div></div></section>;
}

function Tracking() {
  return <section id="rastreo" className="border-y border-white/10 bg-[#091D3D] px-5 py-20 sm:px-7 lg:px-10"><div className="mx-auto grid max-w-[1320px] gap-10 lg:grid-cols-[1fr_.8fr] lg:items-center"><div><SectionTitle eyebrow="Seguimiento" title="Información útil, sin complicaciones." text="Consulta el estado de tu envío desde la plataforma. Si necesitas ayuda, nuestro equipo puede orientarte."/><div className="mt-7 flex flex-col gap-3 sm:flex-row"><Link href="/rastreo" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-[#CA0C28] px-6 font-black uppercase"><Search size={18}/> Rastrear envío</Link><a href={whatsappHref("Hola, necesito orientación con el seguimiento de un envío.")} target="_blank" rel="noreferrer" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl border border-white/15 px-6 font-black"><MessageCircle size={18}/> Pedir ayuda</a></div></div><div className="rounded-3xl border border-white/10 bg-[#000415] p-7"><div className="flex items-center gap-4"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#07409A]/25"><PackageCheck className="text-[#B5BFCD]"/></div><div><p className="text-xs font-black uppercase tracking-widest text-[#CA0C28]">Álvarez Travel</p><h3 className="text-xl font-black">Tu conexión a Cuba</h3></div></div><div className="mt-7 h-1 rounded-full bg-gradient-to-r from-[#CA0C28] via-white to-[#07409A]"/><p className="mt-5 text-sm leading-6 text-[#B5BFCD]">Mantén a mano tu referencia de envío para consultar el estado y recibir orientación.</p></div></div></section>;
}

function TravelAndStore() {
  return <section id="viajes" className="bg-[#000415] px-5 py-20 sm:px-7 lg:px-10"><div className="mx-auto grid max-w-[1320px] gap-5 lg:grid-cols-2"><div className="relative min-h-[430px] overflow-hidden rounded-3xl border border-white/10"><Image src="/alvarez/interior.jpg" alt="Atención en Álvarez Travel" fill sizes="(max-width:1024px) 100vw,50vw" className="object-cover opacity-55"/><div className="absolute inset-0 bg-gradient-to-t from-[#000415] via-[#000415]/45 to-transparent"/><div className="absolute inset-x-0 bottom-0 p-7 sm:p-9"><p className="text-xs font-black uppercase tracking-[.18em] text-[#CA0C28]">Viajes y servicios</p><h2 className="mt-3 text-3xl font-black uppercase">Te orientamos antes de reservar.</h2><p className="mt-3 max-w-lg text-[#B5BFCD]">Consulta opciones de viajes, hoteles y autos. Disponibilidad, precio y condiciones se confirman con el equipo.</p><a href={whatsappHref("Hola, quisiera consultar opciones de viajes, hoteles o autos.")} target="_blank" rel="noreferrer" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#CA0C28] px-6 font-black"><MessageCircle size={18}/> Consultar opciones</a></div></div><div className="flex min-h-[430px] flex-col justify-between rounded-3xl border border-white/10 bg-[#091D3D] p-7 sm:p-9"><div><span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#07409A]/25"><ShoppingBag className="text-[#B5BFCD]"/></span><p className="mt-8 text-xs font-black uppercase tracking-[.18em] text-[#CA0C28]">Tienda Álvarez</p><h2 className="mt-3 text-3xl font-black uppercase">Productos y combos en línea.</h2><p className="mt-4 leading-7 text-[#B5BFCD]">Explora el catálogo de la tienda. Los productos marcados como demo son demostrativos y se sustituirán por la oferta comercial confirmada.</p></div><Link href="/tienda" className="mt-8 inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-white px-6 font-black uppercase text-[#000415]">Entrar a la tienda <ArrowRight size={18}/></Link></div></div></section>;
}

function Contact() {
  return <section id="contacto" className="border-t border-white/10 bg-[#091D3D] px-5 py-20 sm:px-7 lg:px-10"><div className="mx-auto grid max-w-[1320px] gap-8 lg:grid-cols-[1fr_.8fr]"><div><SectionTitle eyebrow="Atención cercana" title="Estamos para orientarte." text="Confirma con nuestro equipo antes de enviar, reservar o realizar una gestión."/><div className="mt-7 flex flex-col gap-3 sm:flex-row"><a href={whatsappHref("Hola, quisiera información sobre sus servicios.")} target="_blank" rel="noreferrer" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-[#CA0C28] px-6 font-black"><MessageCircle size={18}/> Escríbenos</a><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ALVAREZ_ADDRESS)}`} target="_blank" rel="noreferrer" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl border border-white/15 px-6 font-black"><MapPin size={18}/> Cómo llegar</a></div></div><div className="rounded-3xl border border-white/10 bg-[#000415] p-7"><p className="text-xs font-black uppercase tracking-widest text-[#CA0C28]">Visítanos</p><h3 className="mt-3 text-2xl font-black uppercase">Álvarez Travel</h3><p className="mt-4 flex items-start gap-3 leading-7 text-[#B5BFCD]"><MapPin className="mt-1 shrink-0" size={18}/>{ALVAREZ_ADDRESS}</p><p className="mt-5 text-sm leading-6 text-white/60">Para horarios, tarifas, plazos y disponibilidad actual, confirma directamente con nuestro equipo.</p></div></div></section>;
}

function SectionTitle({eyebrow,title,text}:{eyebrow:string;title:string;text:string}) {
  return <div className="max-w-3xl"><p className="text-xs font-black uppercase tracking-[.2em] text-[#CA0C28]">{eyebrow}</p><h2 className="mt-3 text-3xl font-black uppercase leading-tight tracking-[-.025em] sm:text-5xl">{title}</h2><p className="mt-4 max-w-2xl text-base leading-7 text-[#B5BFCD]">{text}</p></div>;
}

function Footer() {
  return <footer className="bg-[#000415] px-5 py-10 sm:px-7 lg:px-10"><div className="mx-auto flex max-w-[1320px] flex-col gap-7 border-t border-white/10 pt-8 md:flex-row md:items-center md:justify-between"><div className="flex items-center gap-5"><div className="relative h-20 w-40"><Image src="/alvarez/logo.png" alt="Álvarez Travel" fill sizes="160px" className="object-contain"/></div><div className="hidden h-10 w-px bg-white/10 sm:block"/><p className="hidden max-w-xs text-sm text-[#B5BFCD] sm:block">Una identidad que une movimiento, cercanía y orgullo cultural.</p></div><div className="text-sm text-white/55"><p className="font-bold text-white">ÁLVAREZ TRAVEL · LA NUEVA ERA</p><p className="mt-1">De aquí pa&apos; Cuba sin cuento</p></div></div><div className="mx-auto mt-8 h-1 max-w-[1320px] rounded-full bg-gradient-to-r from-[#CA0C28] via-white to-[#07409A]"/></footer>;
}
