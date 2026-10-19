import Image from "next/image";
import Link from "next/link";
import { ArrowRight, HeartHandshake, MapPin, MessageCircle, ShoppingBag, Leaf, Store, Users } from "lucide-react";
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
            <span className="min-w-0"><span className="block text-sm font-black sm:text-xl">Tu Mercado Lajero</span><span className="block text-[10px] font-semibold uppercase tracking-widest text-[#0C8ACB] sm:text-xs">Lajas · Cienfuegos</span></span>
          </a>
          <div className="flex items-center gap-5 text-sm font-bold">
            <a href="#nosotros" className="hidden hover:text-[#0C8ACB] md:block">Nuestra esencia</a>
            <Link href="/login" className="hidden hover:text-[#0C8ACB] sm:block">Iniciar sesión</Link>
            <Link href="/tienda" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#0B1F4D] px-4 text-white transition hover:bg-[#0C8ACB]"><ShoppingBag size={17} /> Tienda</Link>
          </div>
        </nav>
      </header>
      <main>
        <section id="inicio" className="relative isolate overflow-hidden bg-[#FFFDF8] px-4 pb-8 pt-8 sm:px-8 sm:pb-12 sm:pt-12">
          <div className="mx-auto max-w-7xl">
            <div className="grid items-center gap-8 lg:grid-cols-[0.85fr_1.3fr] lg:gap-12">
              <div className="min-w-0">
                <p className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#397D2A] sm:text-xs"><Leaf size={21} className="shrink-0" /> Hecho en Lajas, pensado para ti</p>
                <h1 className="text-[2.65rem] font-black leading-[1.04] tracking-[-0.04em] sm:text-6xl xl:text-7xl">Tu mercado.<br /><span className="text-[#0C8ACB]">Tu gente.</span><br />Más cerca.</h1>
                <p className="mt-5 max-w-md text-base leading-7 text-[#0B1F4D]/70 sm:mt-7 sm:text-lg sm:leading-8">Descubre una forma sencilla de comprar, con la cercanía y confianza de nuestra tierra.</p>
                <div className="mt-6 flex flex-wrap gap-3 sm:mt-8">
                  <Link href="/tienda" className="inline-flex min-h-14 flex-1 items-center justify-center gap-3 whitespace-nowrap rounded-2xl bg-[#E55B2D] px-5 font-bold text-white shadow-lg shadow-[#E55B2D]/15 transition hover:bg-[#C9471D] sm:flex-none">Explorar la tienda <ArrowRight size={20} /></Link>
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl border border-[#50A13A] bg-white px-5 font-bold text-[#397D2A] transition hover:bg-[#EFF8EC] sm:flex-none"><MessageCircle size={22} /> WhatsApp</a>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-medium text-[#0B1F4D]/65 sm:mt-7 sm:text-sm">
                  <span className="inline-flex items-center gap-2"><Store size={19} /> Comercio local</span><span aria-hidden="true">·</span><span className="inline-flex items-center gap-2"><HeartHandshake size={19} /> Atención cercana</span>
                </div>
              </div>
              <LajasBanner />
            </div>
            <div className="relative mt-10 grid gap-6 border-t border-[#0B1F4D]/10 pt-7 sm:mt-12 sm:grid-cols-3 sm:gap-5 sm:pt-8">
              {[
                { icon: ShoppingBag, title: "Compra a tu ritmo", text: "Explora nuestra tienda cuando quieras.", color: "#0C8ACB", background: "#E5F4FB" },
                { icon: Leaf, title: "Con identidad local", text: "Una experiencia con corazón lajero.", color: "#397D2A", background: "#EAF4E4" },
                { icon: Users, title: "Estamos para ayudarte", text: "Consúltanos por WhatsApp cuando lo necesites.", color: "#B16D00", background: "#FFF3D7" },
              ].map(({ icon: Icon, title, text, color, background }) => (
                <div key={title} className="flex items-start gap-4 sm:border-r sm:border-[#0B1F4D]/10 sm:pr-4 sm:last:border-r-0">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full" style={{ color, backgroundColor: background }}><Icon size={27} /></span>
                  <div><h2 className="text-base font-extrabold">{title}</h2><p className="mt-1 max-w-xs text-sm leading-6 text-[#0B1F4D]/65">{text}</p></div>
                </div>
              ))}
            </div>
          </div>
          <svg aria-hidden="true" viewBox="0 0 240 180" className="pointer-events-none absolute -bottom-10 -right-12 -z-10 h-40 w-56 fill-none opacity-30 sm:h-52 sm:w-72">
            <path d="M20 180 Q70 40 240 40" stroke="#0C8ACB" strokeWidth="25" /><path d="M90 200 Q140 110 260 110" stroke="#F4B544" strokeWidth="27" /><path d="M40 140 Q25 75 80 60 Q90 100 40 140" fill="#50A13A" />
          </svg>
        </section>
        <section id="nosotros" className="relative isolate overflow-hidden px-4 py-16 sm:px-8 sm:py-24">
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-20 -z-10 h-40 w-[55%] -rotate-6 rounded-[100%] border-t-[18px] border-[#0C8ACB]/20" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-8 -z-10 h-64 w-64 rounded-full border-[40px] border-[#50A13A]/10" />
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
            <div>
              <div aria-hidden="true" className="mb-6 flex gap-2">{["#0B1F4D", "#0C8ACB", "#F4B544", "#E55B2D"].map((color) => <span key={color} className="h-1.5 w-8 rounded-full" style={{ backgroundColor: color }} />)}</div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#C9471D]">Nuestras raíces</p>
              <h2 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl">Un mercado con<br /><span className="text-[#0C8ACB]">corazón lajero.</span></h2>
              <p className="mt-6 text-base leading-8 text-[#0B1F4D]/70">Nuestra tierra nos inspira. Conectamos a la gente de Lajas con una forma de comprar más sencilla, cercana y confiable.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#0B1F4D]/15 bg-white px-4 text-sm font-semibold"><MapPin size={19} className="shrink-0 text-[#E55B2D]" /> Lajas, Cienfuegos</span>
                <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#0B1F4D]/15 bg-white px-4 text-sm font-semibold"><HeartHandshake size={19} className="shrink-0 text-[#50A13A]" /> De aquí, para ti</span>
              </div>
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#368D31] px-7 font-bold text-white shadow-lg shadow-[#50A13A]/15 transition hover:bg-[#297025]"><MessageCircle size={23} /> Conversemos <ArrowRight size={19} /></a>
            </div>
            <figure className="relative overflow-hidden rounded-[2rem] border border-white bg-[linear-gradient(135deg,#E4F5FC,#F3FAED)] p-4 shadow-xl shadow-[#0B1F4D]/8 sm:rounded-[2.5rem] sm:p-7">
              <svg aria-hidden="true" viewBox="0 0 800 600" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full fill-none stroke-white/80"><path d="M-80 80 Q180 200 450 0 M-80 120 Q180 240 490 0 M200 600 Q400 340 850 430 M250 650 Q450 390 900 480" strokeWidth="2" /></svg>
              <div className="relative aspect-[800/566] w-full">
                <Image src="/tumercadolajero/mapa-lajas.jpg" alt="Mapa de la provincia de Cienfuegos con el municipio de Lajas destacado en verde en la zona noreste" fill sizes="(max-width: 1023px) 100vw, 55vw" className="object-contain mix-blend-multiply" />
                <div aria-hidden="true" className="absolute left-[59%] top-[18%] -translate-x-1/2">
                  <MapPin size={38} fill="#E55B2D" stroke="white" strokeWidth={1.8} className="drop-shadow-md sm:h-12 sm:w-12" />
                </div>
                <div className="absolute right-0 top-[3%] rounded-2xl border border-[#0C8ACB]/10 bg-white/95 px-3 py-2 shadow-md sm:px-5 sm:py-3">
                  <p className="text-sm font-black sm:text-xl">Lajas</p>
                  <p className="mt-0.5 text-[10px] text-[#0B1F4D]/65 sm:text-sm">Cienfuegos · Cuba</p>
                </div>
              </div>
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
          <p className="font-black">Tu Mercado Lajero <span className="mt-1 block text-xs font-normal text-[#0B1F4D]/60">Lajas, Cienfuegos · Cuba</span></p>
          <div className="flex gap-5 font-semibold"><Link href="/login">Iniciar sesión</Link><a href="https://perlamarketplace.com" className="text-[#0C8ACB]">Perla Marketplace</a></div>
        </div>
      </footer>
    </div>
  );
}
