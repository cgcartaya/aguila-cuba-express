import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MessageCircle, Wine } from "lucide-react";

const whatsappHref = "https://wa.me/5358731040?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20Bar%201820.";

export default function Bar1820Landing({ logoUrl, menuHref }: { logoUrl?: string | null; menuHref?: string }) {
  return (
    <div className="min-h-screen bg-[#1D1F1E] text-[#FEFAEF] selection:bg-[#D4A54F] selection:text-[#1D1F1E]">
      <header className="border-b border-white/10">
        <nav aria-label="Navegación principal" className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <a href="#inicio" className="flex items-center gap-3">
            <Image src={logoUrl || "/bar1820/logo.webp"} alt="Logo de Bar 1820" width={56} height={56} unoptimized className="rounded-full" />
            <span className="font-serif text-xl tracking-wide">BAR <span className="text-[#D4A54F]">1820</span></span>
          </a>
          <div className="flex w-full flex-wrap items-center justify-end gap-3 text-sm sm:w-auto sm:gap-5">
            <Link href="/login" className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full bg-[#D4A54F] px-4 py-2 font-semibold text-[#1D1F1E] transition hover:bg-[#e6bc72] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4A54F]">Iniciar sesión</Link>
            {menuHref && <Link href={menuHref} className="hidden hover:text-[#D4A54F] sm:block">Nuestro menú</Link>}
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="rounded-full border border-[#D4A54F]/60 px-4 py-2 text-[#D4A54F] hover:bg-[#D4A54F] hover:text-[#1D1F1E]">Contáctanos</a>
          </div>
        </nav>
      </header>
      <main>
        <section id="inicio" className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-24">
          <div>
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.24em] text-[#D4A54F]">Raíces cubanas · Historia azucarera</p>
            <h1 className="font-serif text-6xl leading-none sm:text-8xl">Bar <span className="text-[#D4A54F]">1820</span></h1>
            <p className="mt-7 max-w-lg font-serif text-3xl leading-tight sm:text-4xl">Un lugar con historia.<br />Un momento para compartir.</p>
            <p className="mt-6 max-w-md text-base leading-7 text-[#FEFAEF]/70">Donde antes hubo un central de caña, hoy hay un espacio para encontrarnos. Madera, luces y el encanto de un bar con identidad propia.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              {menuHref && <Link href={menuHref} className="inline-flex items-center gap-3 rounded-full bg-[#D4A54F] px-6 py-3.5 font-semibold text-[#1D1F1E] hover:bg-[#e6bc72]">Explorar el menú <ArrowUpRight size={18} /></Link>}
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 rounded-full border border-white/25 px-6 py-3.5 hover:border-[#D4A54F]"><MessageCircle size={18} /> WhatsApp</a>
            </div>
          </div>
          <figure className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-t-[5rem] rounded-b-3xl border border-[#D4A54F]/30 sm:rounded-t-[7rem]">
              <Image src="/bar1820/interior.webp" alt="Interior de Bar 1820, con barra de madera, banquetas y luces de colores" fill preload sizes="(max-width: 1023px) 100vw, 55vw" className="object-cover" />
            </div>
            <figcaption className="mt-4 flex items-center justify-between gap-3 text-xs uppercase tracking-widest text-[#FEFAEF]/50"><span>Nuestro espacio</span><span className="text-[#D4A54F]">Bar 1820 · Cuba</span></figcaption>
          </figure>
        </section>
        <section className="border-y border-[#D4A54F]/20 bg-[#252825]">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-[1fr_1.5fr] md:gap-16">
            <div><Wine className="mb-4 text-[#D4A54F]" size={28} /><h2 className="font-serif text-3xl">Del central al encuentro.</h2></div>
            <p className="max-w-2xl text-lg leading-8 text-[#FEFAEF]/70">Nuestra identidad nace del lugar que nos acoge: un antiguo central azucarero en Cuba. La caña y la silueta del central viven en nuestro emblema, como un homenaje a esas raíces.</p>
          </div>
        </section>
        <section id="contacto" className="mx-auto max-w-3xl px-5 py-16 text-center sm:py-24">
          <p className="text-xs uppercase tracking-[0.24em] text-[#D4A54F]">Hablemos</p>
          <h2 className="mt-4 font-serif text-4xl sm:text-5xl">Tu próximo encuentro<br />empieza aquí.</h2>
          <p className="mx-auto mt-5 max-w-md leading-7 text-[#FEFAEF]/70">Escríbenos para conocer nuestras propuestas, consultar el horario o saber cómo llegar.</p>
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#D4A54F] px-7 py-4 font-semibold text-[#1D1F1E] hover:bg-[#e6bc72]"><MessageCircle size={20} /> +53 58731040</a>
        </section>
      </main>
      <footer className="border-t border-white/10 px-5 py-6"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-sm text-[#FEFAEF]/50"><span>Bar 1820 · Cuba</span><a href="https://perlamarketplace.com" className="hover:text-[#D4A54F]">En Perla Marketplace</a></div></footer>
    </div>
  );
}
