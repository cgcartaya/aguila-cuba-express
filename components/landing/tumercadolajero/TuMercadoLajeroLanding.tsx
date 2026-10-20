import Image from "next/image";
import Link from "next/link";
import { ArrowRight, HeartHandshake, MapPin, MessageCircle, ShoppingBag, Leaf, Users } from "lucide-react";
import LajasBanner from "./LajasBanner";

const whatsapp = "https://wa.me/5354265429?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20TuMercadoLajero.";

export default function TuMercadoLajeroLanding({ logoUrl }: { logoUrl?: string | null }) {
  const logo = logoUrl || "/tumercadolajero/logo.jpeg";
  return (
    <div className="min-h-screen overflow-x-clip bg-[#FAF8F0] text-[#0B1F4D] selection:bg-[#F4B544] selection:text-[#0B1F4D]">
      <header className="relative z-30 border-b border-[#0B1F4D]/10 bg-white">
        <div className="h-1.5 bg-gradient-to-r from-[#0C8ACB] via-[#50A13A] to-[#E55B2D]" />
        <nav aria-label="Navegación principal" className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <a href="#inicio" className="flex min-w-0 items-center gap-2.5">
            <Image src={logo} alt="Logo de Tu Mercado Lajero" width={64} height={64} unoptimized={Boolean(logoUrl)} className="h-12 w-12 shrink-0 rounded-xl object-contain sm:h-16 sm:w-16" />
            <span className="min-w-0"><span className="block text-sm font-black sm:text-xl">Tu Mercado Lajero</span><span className="block text-[10px] font-semibold uppercase tracking-widest text-[#0C8ACB] sm:text-xs">San José de las Lajas · Mayabeque</span></span>
          </a>
          <div className="flex items-center gap-5 text-sm font-bold">
            <a href="#nosotros" className="hidden hover:text-[#0C8ACB] md:block">Nuestra esencia</a>
            <Link href="/login" className="hidden hover:text-[#0C8ACB] sm:block">Iniciar sesión</Link>
            <Link href="/tienda" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#0B1F4D] px-4 text-white transition hover:bg-[#0C8ACB]"><ShoppingBag size={17} /> Tienda</Link>
          </div>
        </nav>
      </header>
      <main>
        <section id="inicio" aria-label="Bienvenido a Tu Mercado Lajero">
          <LajasBanner whatsapp={whatsapp} logoUrl={logoUrl} />
          <div className="bg-[#FFFDF8] px-5 py-7 sm:px-8">
            <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-3">
              {[
                { icon: Leaf, title: "Comercio local", text: "Apoyamos nuestra comunidad", color: "#397D2A" },
                { icon: Users, title: "Atención cercana", text: "Consúltanos por WhatsApp", color: "#0C8ACB" },
                { icon: MapPin, title: "San José de las Lajas, Mayabeque", text: "Nuestra tierra, nuestra gente", color: "#397D2A" },
              ].map(({ icon: Icon, title, text, color }) => (
                <div key={title} className="flex items-center gap-4 sm:border-r sm:border-[#0B1F4D]/10 sm:pr-4 sm:last:border-r-0">
                  <Icon size={32} className="shrink-0" style={{ color }} />
                  <div><h2 className="font-extrabold">{title}</h2><p className="mt-1 text-sm text-[#0B1F4D]/60">{text}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section id="nosotros" className="relative isolate overflow-hidden px-4 py-16 sm:px-8 sm:py-24">
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-20 -z-10 h-40 w-[55%] -rotate-6 rounded-[100%] border-t-[18px] border-[#0C8ACB]/20" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-8 -z-10 h-64 w-64 rounded-full border-[40px] border-[#50A13A]/10" />
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
            <div>
              <div aria-hidden="true" className="mb-6 flex gap-2">{["#0B1F4D", "#0C8ACB", "#F4B544", "#E55B2D"].map((color) => <span key={color} className="h-1.5 w-8 rounded-full" style={{ backgroundColor: color }} />)}</div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#C9471D]">Nuestras raíces</p>
              <h2 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl">Un mercado con<br /><span className="text-[#0C8ACB]">corazón lajero.</span></h2>
              <p className="mt-6 text-base leading-8 text-[#0B1F4D]/70">Nuestra tierra nos inspira. Conectamos a la gente de San José de las Lajas con una forma de comprar más sencilla, cercana y confiable.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#0B1F4D]/15 bg-white px-4 text-sm font-semibold"><MapPin size={19} className="shrink-0 text-[#E55B2D]" /> San José de las Lajas, Mayabeque</span>
                <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#0B1F4D]/15 bg-white px-4 text-sm font-semibold"><HeartHandshake size={19} className="shrink-0 text-[#50A13A]" /> De aquí, para ti</span>
              </div>
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#368D31] px-7 font-bold text-white shadow-lg shadow-[#50A13A]/15 transition hover:bg-[#297025]"><MessageCircle size={23} /> Conversemos <ArrowRight size={19} /></a>
            </div>
            <figure className="relative overflow-hidden rounded-[2rem] border border-white bg-[linear-gradient(135deg,#E4F5FC,#F3FAED)] p-4 shadow-xl shadow-[#0B1F4D]/8 sm:rounded-[2.5rem] sm:p-7">
              <svg aria-hidden="true" viewBox="0 0 800 600" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full fill-none stroke-white/80"><path d="M-80 80 Q180 200 450 0 M-80 120 Q180 240 490 0 M200 600 Q400 340 850 430 M250 650 Q450 390 900 480" strokeWidth="2" /></svg>
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#E4F5FC]">
                <iframe
                  title="Mapa de San José de las Lajas, Mayabeque, Cuba"
                  src="https://maps.google.com/maps?q=San%20Jos%C3%A9%20de%20las%20Lajas%2C%20Mayabeque%2C%20Cuba&amp;z=12&amp;output=embed"
                  width="800"
                  height="600"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full border-0"
                />
              </div>
              <a href="https://www.google.com/maps/search/?api=1&amp;query=San%20Jos%C3%A9%20de%20las%20Lajas%2C%20Mayabeque%2C%20Cuba" target="_blank" rel="noopener noreferrer" className="relative mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-[#0B1F4D] shadow-sm hover:text-[#0C8ACB]"><MapPin size={18} className="text-[#E55B2D]" /> San José de las Lajas · Mayabeque <ArrowRight size={16} /></a>
              <figcaption className="relative mt-4 pb-2 text-sm font-semibold sm:text-base"><span aria-hidden="true" className="mb-3 block h-1.5 w-12 rounded-full bg-[#0C8ACB]" />Aquí están nuestras raíces.</figcaption>
              <svg aria-hidden="true" viewBox="0 0 220 180" className="pointer-events-none absolute -bottom-1 -right-1 h-28 w-36 fill-none sm:h-36 sm:w-44">
                <path d="M70 180 Q120 100 220 90" stroke="#F4B544" strokeWidth="26" />
                <path d="M110 190 Q140 140 230 130" stroke="#0C8ACB" strokeWidth="22" />
                <path d="M150 180 Q170 165 230 160" stroke="#0B1F4D" strokeWidth="18" />
                <path d="M165 100 Q120 70 136 21 Q180 50 165 100" fill="#50A13A" />
                <path d="M175 105 Q170 55 208 35 Q220 80 175 105" fill="#2A7560" />
              </svg>
            </figure>
          </div>
        </section>
        <section className="px-4 pb-16 sm:px-8 sm:pb-24">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-7 rounded-[2rem] bg-[#DFF2F9] p-7 sm:p-12 md:flex-row md:items-center">
            <div><p className="text-xs font-bold uppercase tracking-widest text-[#0C8ACB]">Estamos cerca</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">¿Te ayudamos con tu compra?</h2><p className="mt-3 leading-7 text-[#0B1F4D]/65">Escríbenos y te orientamos personalmente.</p></div>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-14 shrink-0 items-center gap-3 rounded-full bg-[#0B1F4D] px-6 font-bold text-white hover:bg-[#0C8ACB]"><MessageCircle size={22} /> +53 54265429</a>
          </div>
        </section>
      </main>
      <footer className="border-t border-[#0B1F4D]/10 bg-white px-4 py-7 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 text-sm">
          <p className="font-black">Tu Mercado Lajero <span className="mt-1 block text-xs font-normal text-[#0B1F4D]/60">San José de las Lajas, Mayabeque · Cuba</span></p>
          <div className="flex gap-5 font-semibold"><Link href="/login">Iniciar sesión</Link><a href="https://perlamarketplace.com" className="text-[#0C8ACB]">Perla Marketplace</a></div>
        </div>
      </footer>
    </div>
  );
}
