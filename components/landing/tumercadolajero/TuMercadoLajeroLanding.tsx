import Image from "next/image";
import Link from "next/link";
import { ArrowRight, HeartHandshake, MapPin, MessageCircle, ShoppingBag, Sparkles } from "lucide-react";
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
        <section id="inicio" className="relative isolate bg-[#0B1F4D] px-4 pb-12 pt-7 text-white sm:px-8 sm:pb-20 sm:pt-12">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -left-32 -top-40 h-96 w-96 rounded-full border-[60px] border-[#0C8ACB]/20" />
            <div className="absolute -bottom-48 -right-32 h-[32rem] w-[32rem] rounded-full border-[70px] border-[#50A13A]/15" />
          </div>
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-8 lg:flex-row lg:items-end">
              <div>
                <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#F4B544]"><Sparkles size={15} /> De nuestra tierra, para nuestra gente</p>
                <h1 className="text-balance text-[2.25rem] font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">Lajas se vive.<br className="sm:hidden" /> <span className="text-[#8ADAEF]">Y ahora se compra online.</span></h1>
              </div>
              <p className="max-w-sm text-sm leading-6 text-white/70 sm:text-base">Tu mercado de siempre, más cerca.<br />Descubre, elige y cuenta con nosotros.</p>
            </div>
            <div className="grid items-stretch gap-5 lg:grid-cols-[1.5fr_0.8fr] lg:gap-7">
              <LajasBanner />
              <div className="flex flex-col justify-center rounded-[2rem] bg-[#FFFDF8] p-6 text-[#0B1F4D] sm:p-9">
                <div className="flex items-center gap-4">
                  <Image src={logo} alt="Tu Mercado Lajero" width={92} height={92} unoptimized={Boolean(logoUrl)} className="h-20 w-20 shrink-0 rounded-2xl bg-white object-contain" />
                  <div><p className="text-xs font-bold uppercase tracking-widest text-[#50A13A]">Con identidad local</p><p className="mt-1 text-xl font-black">Tu Mercado Lajero</p></div>
                </div>
                <div className="my-6 flex gap-1" aria-hidden="true">{["#0C8ACB", "#50A13A", "#F4B544", "#E55B2D"].map((color) => <span key={color} className="h-1.5 w-10 rounded-full" style={{ backgroundColor: color }} />)}</div>
                <h2 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">Lo que necesitas,<br />a un clic de ti.</h2>
                <p className="mt-4 text-sm leading-7 text-[#0B1F4D]/65 sm:text-base">Explora nuestra tienda y consulta tus dudas con atención directa por WhatsApp.</p>
                <Link href="/tienda" className="mt-6 inline-flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-[#E55B2D] px-5 font-bold text-white shadow-lg shadow-[#E55B2D]/15 transition hover:bg-[#C9471D]">Explorar la tienda <ArrowRight size={20} /></Link>
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#50A13A]/30 bg-[#EFF8EC] px-4 font-bold text-[#397D2A] hover:bg-[#E0F0D9]"><MessageCircle size={20} /> Hablemos por WhatsApp</a>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-xs font-semibold text-white/75 sm:justify-start sm:text-sm">
              <span className="flex items-center gap-2"><ShoppingBag size={17} className="text-[#8ADAEF]" /> Compra desde donde estés</span>
              <span className="flex items-center gap-2"><HeartHandshake size={17} className="text-[#A4E687]" /> Atención cercana</span>
              <span className="flex items-center gap-2"><MapPin size={17} className="text-[#F4B544]" /> Lajas, Cienfuegos</span>
            </div>
          </div>
        </section>
        <section id="nosotros" className="px-4 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9471D]">Nuestra esencia</p>
              <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">Un mercado con<br /><span className="text-[#0C8ACB]">corazón lajero.</span></h2>
              <p className="mt-5 text-base leading-8 text-[#0B1F4D]/65">Nos inspiran nuestras calles, nuestros lugares y nuestra gente. Acercamos la tienda a tu día a día con una forma de comprar sencilla y un trato humano.</p>
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-11 items-center gap-2 font-bold text-[#397D2A]">Conversemos <ArrowRight size={18} /></a>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-5">
              <figure className="relative min-h-72 overflow-hidden rounded-[2rem] bg-[#DCEBF0] sm:min-h-96">
                <Image src="/tumercadolajero/parque-iglesia.jpeg" alt="Parque y gazebo de Lajas" fill sizes="(max-width: 1023px) 50vw, 30vw" className="object-cover object-[center_58%]" />
              </figure>
              <div className="flex flex-col gap-3 sm:gap-5">
                <article className="flex flex-1 flex-col justify-center rounded-[2rem] bg-[#50A13A] p-5 text-white sm:p-7"><HeartHandshake size={28} /><h3 className="mt-4 text-xl font-black sm:text-2xl">De aquí,<br />para ti.</h3></article>
                <article className="flex flex-1 flex-col justify-center rounded-[2rem] bg-[#F4B544] p-5 sm:p-7"><ShoppingBag size={28} /><h3 className="mt-4 text-xl font-black sm:text-2xl">Tu tienda.<br />A tu ritmo.</h3></article>
              </div>
            </div>
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
