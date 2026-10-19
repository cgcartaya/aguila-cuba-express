import Image from "next/image";
import Link from "next/link";
import LajasBanner from "./LajasBanner";
import {
  ArrowRight,
  HeartHandshake,
  MapPin,
  MessageCircle,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

const WHATSAPP_HREF =
  "https://wa.me/5354265429?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20TuMercadoLajero.";

const highlights = [
  {
    icon: ShoppingBag,
    title: "Compra fácil",
    description: "Encuentra lo que necesitas desde cualquier lugar.",
  },
  {
    icon: HeartHandshake,
    title: "Comercio local",
    description: "Una vitrina digital hecha para nuestra comunidad.",
  },
  {
    icon: MessageCircle,
    title: "Atención cercana",
    description: "Estamos disponibles para ayudarte por WhatsApp.",
  },
];

export default function TuMercadoLajeroLanding({
  logoUrl,
}: {
  logoUrl?: string | null;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FFFDF8] text-[#0B1F4D] selection:bg-[#E55B2D] selection:text-white">
      <header className="sticky top-0 z-50 border-b border-[#0C8ACB]/20 bg-[#FFFDF8]/95 backdrop-blur-xl">
        <div aria-hidden="true" className="h-1.5 bg-gradient-to-r from-[#0C8ACB] via-[#50A13A] to-[#E55B2D]" />
        <nav
          aria-label="Navegación principal"
          className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8"
        >
          <a href="#inicio" className="flex min-w-0 items-center gap-3">
            <Image
              src={logoUrl || "/tumercadolajero/logo.jpeg"}
              alt="Logo de Tu Mercado Lajero"
              width={56}
              height={56}
              unoptimized={Boolean(logoUrl)}
              className="h-12 w-12 shrink-0 rounded-2xl object-cover shadow-sm sm:h-14 sm:w-14"
            />
            <div className="min-w-0 leading-tight">
              <span className="block truncate text-base font-black tracking-tight sm:text-lg">
                Tu Mercado Lajero
              </span>
              <span className="block truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0C8ACB] sm:text-xs">
                San José de las Lajas
              </span>
            </div>
          </a>

          <div className="hidden items-center gap-7 text-sm font-semibold lg:flex">
            <a href="#esencia" className="transition hover:text-[#E55B2D]">
              Nuestra esencia
            </a>
            <a href="#lajas" className="transition hover:text-[#E55B2D]">
              Lajas
            </a>
            <Link href="/login" className="transition hover:text-[#E55B2D]">
              Iniciar sesión
            </Link>
          </div>

          <Link
            href="/tienda"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#0B1F4D] px-4 text-sm font-bold text-white shadow-lg shadow-[#0B1F4D]/15 transition hover:-translate-y-0.5 hover:bg-[#15346F] sm:px-5"
          >
            <ShoppingBag size={17} />
            <span className="hidden sm:inline">Ver tienda</span>
            <span className="sm:hidden">Tienda</span>
          </Link>
        </nav>
      </header>

      <main>
        <section
          id="inicio"
          className="relative isolate overflow-hidden bg-[linear-gradient(135deg,#EFF8EC_0%,#FFFDF8_45%,#E2F3FC_100%)] px-4 pb-12 pt-7 sm:px-8 sm:pb-20 sm:pt-12 lg:pt-16"
        >
          <div className="absolute -left-24 top-20 -z-10 h-72 w-72 rounded-full bg-[#50A13A]/10 blur-3xl" />
          <div className="absolute -right-24 top-0 -z-10 h-96 w-96 rounded-full bg-[#0C8ACB]/12 blur-3xl" />

          <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#E55B2D]/20 bg-[#E55B2D]/8 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.15em] text-[#C9471D]">
                <Sparkles size={15} /> El mercado digital de nuestra gente
              </div>
              <h1 className="text-balance text-[2.6rem] font-black leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                Todo Lajas,
                <span className="mt-2 block text-[#0C8ACB]">más cerca de ti.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#0B1F4D]/70 sm:text-xl">
                Un espacio online para descubrir productos, apoyar el comercio
                local y comprar con atención cercana desde Lajas, Cienfuegos.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/tienda"
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#E55B2D] px-7 font-bold text-white shadow-xl shadow-[#E55B2D]/20 transition hover:-translate-y-0.5 hover:bg-[#C9471D]"
                >
                  Explorar la tienda <ArrowRight size={20} />
                </Link>
                <a
                  href={WHATSAPP_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full border-2 border-[#0B1F4D]/12 bg-white px-7 font-bold transition hover:border-[#50A13A] hover:text-[#397D2A]"
                >
                  <MessageCircle size={20} /> Escríbenos
                </a>
              </div>
              <div className="mt-7 flex items-center gap-3 text-sm font-semibold text-[#0B1F4D]/60">
                <ShieldCheck className="text-[#50A13A]" size={21} />
                Una experiencia local, clara y confiable.
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-2xl lg:max-w-none">
              <LajasBanner />

              <div className="mx-auto mt-4 flex w-fit max-w-full items-center gap-3 rounded-3xl border border-[#50A13A]/20 bg-white/95 p-3 pr-5 shadow-lg sm:p-4 sm:pr-6">
                <Image
                  src={logoUrl || "/tumercadolajero/logo.jpeg"}
                  alt="Tu Mercado Lajero"
                  width={70}
                  height={70}
                  unoptimized={Boolean(logoUrl)}
                  className="h-14 w-14 rounded-2xl object-cover sm:h-[70px] sm:w-[70px]"
                />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#50A13A]">
                    De aquí, para ti
                  </p>
                  <p className="mt-1 font-black">Tu Mercado Lajero</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#0B1F4D]/8 bg-white">
          <div className="mx-auto grid max-w-7xl divide-y divide-[#0B1F4D]/8 px-4 sm:px-8 md:grid-cols-3 md:divide-x md:divide-y-0">
            {highlights.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-4 py-7 md:px-7 md:first:pl-0 md:last:pr-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0C8ACB]/10 text-[#0C8ACB]">
                  <Icon size={22} />
                </div>
                <div>
                  <h2 className="font-extrabold">{title}</h2>
                  <p className="mt-1 text-sm leading-6 text-[#0B1F4D]/60">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="esencia" className="relative border-t-4 border-[#F4B544] bg-[linear-gradient(160deg,#FFFDF8_50%,#EFF8EC_100%)] px-4 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#E55B2D]">
                Nuestra esencia
              </p>
              <h2 className="mt-4 text-balance text-4xl font-black tracking-[-0.035em] sm:text-5xl">
                Un mercado con identidad lajera.
              </h2>
              <p className="mt-6 text-lg leading-8 text-[#0B1F4D]/68">
                Nacemos para conectar a nuestra gente con productos y comercios
                de confianza. Una experiencia moderna que conserva el trato
                humano y el orgullo por nuestras raíces.
              </p>
              <Link
                href="/tienda"
                className="mt-8 inline-flex items-center gap-2 font-extrabold text-[#0C8ACB] transition hover:gap-3 hover:text-[#0872AA]"
              >
                Conoce la tienda <ArrowRight size={19} />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <article className="rounded-[2rem] bg-[#0B1F4D] p-7 text-white sm:row-span-2 sm:flex sm:flex-col sm:justify-between">
                <ShoppingBag className="text-[#62C74D]" size={34} />
                <div className="mt-14">
                  <p className="text-3xl font-black">Tu mercado.</p>
                  <p className="mt-2 leading-7 text-white/65">Más accesible, más nuestro y siempre cerca.</p>
                </div>
              </article>
              <article className="rounded-[2rem] bg-[#0C8ACB] p-7 text-white">
                <p className="text-sm font-bold uppercase tracking-[0.15em] text-white/70">Comunidad</p>
                <p className="mt-3 text-2xl font-black">Apoyamos lo local.</p>
              </article>
              <article className="rounded-[2rem] border border-[#50A13A]/20 bg-[#EFF8EC] p-7">
                <p className="text-sm font-bold uppercase tracking-[0.15em] text-[#397D2A]">Confianza</p>
                <p className="mt-3 text-2xl font-black">Atención de verdad.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="lajas" className="border-t-4 border-[#0C8ACB] bg-[linear-gradient(135deg,#E2F3FC,#EFF8EC)] px-4 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#50A13A]">Hecho para Lajas</p>
              <h2 className="mt-4 text-balance text-4xl font-black tracking-[-0.035em] sm:text-5xl">
                Nuestra historia también vive aquí.
              </h2>
              <p className="mt-5 text-lg leading-8 text-[#0B1F4D]/65">
                Lugares que nos representan, una comunidad que nos inspira y un mercado pensado para avanzar juntos.
              </p>
            </div>

            <div className="mt-12 grid auto-rows-[240px] gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <figure className="relative overflow-hidden rounded-[2rem] sm:row-span-2">
                <Image
                  src="/tumercadolajero/parque-iglesia.jpeg"
                  alt="Parque y gazebo de San José de las Lajas"
                  fill
                  sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
                  className="object-cover object-[center_58%] transition duration-700 hover:scale-105"
                />
              </figure>
              <figure className="relative overflow-hidden rounded-[2rem] lg:col-span-2">
                <Image
                  src="/tumercadolajero/edificio-historico.jpeg"
                  alt="Edificio histórico de San José de las Lajas"
                  fill
                  sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 66vw"
                  className="object-cover object-center transition duration-700 hover:scale-105"
                />
              </figure>
              <article className="flex flex-col justify-between rounded-[2rem] bg-[#E55B2D] p-7 text-white lg:col-span-2 sm:p-9">
                <MapPin size={32} />
                <div className="mt-10">
                  <p className="text-3xl font-black sm:text-4xl">Aquí comienza una nueva forma de comprar.</p>
                  <p className="mt-3 text-white/75">San José de las Lajas · Cuba</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-[#0B1F4D] px-6 py-14 text-center text-white shadow-2xl shadow-[#0B1F4D]/20 sm:px-12 sm:py-20">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#62C74D]">Estamos para ayudarte</p>
            <h2 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-black tracking-[-0.035em] sm:text-5xl">
              Tu próxima compra empieza aquí.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/65">
              Entra a la tienda o escríbenos directamente. Queremos que comprar sea sencillo y confiable.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/tienda"
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#62C74D] px-7 font-bold text-[#0B1F4D] transition hover:-translate-y-0.5 hover:bg-[#79D866]"
              >
                <ShoppingBag size={20} /> Ir a la tienda
              </Link>
              <a
                href={WHATSAPP_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full border border-white/20 px-7 font-bold transition hover:border-white/50 hover:bg-white/5"
              >
                <MessageCircle size={20} /> +53 54265429
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#0B1F4D]/8 bg-white px-4 py-7 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center text-sm text-[#0B1F4D]/55 sm:flex-row sm:text-left">
          <div className="flex items-center gap-3">
            <Image
              src={logoUrl || "/tumercadolajero/logo.jpeg"}
              alt="Tu Mercado Lajero"
              width={42}
              height={42}
              unoptimized={Boolean(logoUrl)}
              className="h-10 w-10 rounded-xl object-cover"
            />
            <span className="font-bold text-[#0B1F4D]">Tu Mercado Lajero</span>
          </div>
          <p>San José de las Lajas, Cuba</p>
          <a href="https://perlamarketplace.com" className="font-semibold transition hover:text-[#0C8ACB]">
            En Perla Marketplace
          </a>
        </div>
      </footer>
    </div>
  );
}
