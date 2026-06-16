"use client";

import Image from "next/image";
import Link from "next/link";

const productosDestacados = [
  {
    nombre: "EcoFlow Delta 3",
    precio: "700.00",
    imagen: "/products/electrical/ecoflow.webp",
  },
  {
    nombre: "Olla eléctrica 2L",
    precio: "70.00",
    imagen: "/products/electrical/olla-electrica-2l.webp",
  },
  {
    nombre: "Bicicleta eléctrica",
    precio: "900.00",
    imagen: "/products/electrical/bicicleta-electrica48v.webp",
  },
  {
    nombre: "Convertidor 1000W",
    precio: "350.00",
    imagen: "/products/electrical/convertidor-1000w.webp",
  },
];

const ofertas = [
  {
    nombre: "Controlador solar",
    precioAntes: "150.00",
    precio: "120.00",
    descuento: "-20%",
    imagen: "/products/electrical/controlador-solar-1000w.webp",
  },
  {
    nombre: "Combo de alimentos",
    precioAntes: "25.00",
    precio: "18.00",
    descuento: "-15%",
    imagen: "/products/food/chocolisto-sabor-fresa.webp",
  },
  {
    nombre: "Ibuprofeno 200mg",
    precioAntes: "12.00",
    precio: "10.00",
    descuento: "-10%",
    imagen: "/products/medicines/ibuprofeno200.webp",
  },
];

const categorias = [
  { nombre: "Electrónicos", icono: "📱" },
  { nombre: "Hogar", icono: "🛋️" },
  { nombre: "Alimentos", icono: "🧺" },
  { nombre: "Deportes", icono: "🏋️" },
  { nombre: "Medicinas", icono: "💊" },
  { nombre: "Más", icono: "•••" },
];

export default function TiendaPage() {
  return (
    <main className="min-h-screen bg-white pb-24 text-[#061b3a]">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <button className="text-3xl font-black">☰</button>

          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Águila Cuba Express"
              width={52}
              height={52}
              className="rounded-full"
            />
            <div className="leading-tight">
              <h1 className="text-lg font-black uppercase md:text-2xl">
                ÁGUILA CUBA EXPRESS
              </h1>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Envíos a Cuba
              </p>
            </div>
          </div>

          <a href="https://wa.me/13054974891" target="_blank" className="relative text-3xl">
            🛒
            <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-black text-white">
              2
            </span>
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4">
        {/* BUSCADOR */}
        <section className="py-4">
          <div className="flex gap-3">
            <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <span className="text-xl">🔍</span>
              <input
                type="text"
                placeholder="Buscar productos..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>

            <button className="rounded-2xl bg-[#061b3a] px-5 py-3 font-black text-white shadow-sm">
              Filtrar
            </button>
          </div>
        </section>

        {/* BANNER PRINCIPAL */}
{/* BANNER PRINCIPAL */}
<section className="relative h-[310px] overflow-hidden rounded-3xl bg-[#f4f7fb] px-5 py-6 shadow-sm md:h-[420px] md:px-10 md:py-10">
  <div className="relative z-10 w-[52%] md:w-[45%]">
    <h2 className="text-[32px] font-black leading-[1.05] text-[#061b3a] md:text-5xl">
      ENVÍA MÁS,
      <br />
      <span className="text-red-600">PAGA MENOS</span>
    </h2>

    <p className="mt-4 max-w-[210px] text-sm font-bold leading-snug text-slate-700 md:text-base">
      Miles de productos para tu familia en Cuba
    </p>

    <div className="mt-5 grid max-w-[260px] grid-cols-3 gap-3 text-center text-[10px] font-bold text-slate-700">
      <div>
        <div className="mb-1 text-2xl">🛡️</div>
        100% Seguro
      </div>

      <div>
        <div className="mb-1 text-2xl">🕒</div>
        Entrega rápida
      </div>

      <div>
        <div className="mb-1 text-2xl">📍</div>
        Cobertura
      </div>
    </div>

    <a
      href="#ofertas"
      className="mt-5 inline-flex rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-sm"
    >
      Ver ofertas ❯
    </a>
  </div>

<Image
  src="/logo-tienda.png"
  alt="Productos para enviar a Cuba"
  width={850}
  height={520}
  priority
 className="absolute bottom-2 right-4 h-auto w-[58%] object-contain md:bottom-4 md:right-8 md:w-[52%]"
/>


  <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
    <span className="h-2 w-6 rounded-full bg-red-600" />
    <span className="h-2 w-4 rounded-full bg-slate-300" />
    <span className="h-2 w-4 rounded-full bg-slate-300" />
  </div>
</section>

        {/* CATEGORÍAS */}
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black">Explora por categorías</h2>
            <button className="text-sm font-bold">Ver todas ❯</button>
          </div>

<div className="flex gap-3 overflow-x-auto pb-2">
  {categorias.map((cat) => (
    <button
      key={cat.nombre}
      className="min-w-[110px] shrink-0 rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm"
    >
      <div className="text-4xl">{cat.icono}</div>
      <p className="mt-2 text-xs font-black">{cat.nombre}</p>
    </button>
  ))}
</div>
        </section>

        {/* PRODUCTOS DESTACADOS */}
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black">Productos destacados</h2>
            <button className="text-sm font-bold">Ver todas ❯</button>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {productosDestacados.map((producto) => (
              <article key={producto.nombre} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                <div className="relative h-32">
                  <Image src={producto.imagen} alt={producto.nombre} fill className="object-contain" />
                  <span className="absolute right-1 top-1 text-xl">♡</span>
                </div>

                <h3 className="mt-3 line-clamp-2 min-h-[40px] text-sm font-black">{producto.nombre}</h3>
                <p className="mt-1 text-xs text-yellow-500">★★★★★ <span className="text-slate-500">(64)</span></p>

                <div className="mt-3 flex items-center justify-between">
                  <p className="font-black">${producto.precio}</p>
                  <a
                    href={`https://wa.me/13054974891?text=${encodeURIComponent(
                      `Hola, estoy interesado en: ${producto.nombre}`
                    )}`}
                    target="_blank"
                    className="rounded-lg bg-red-600 px-3 py-2 text-white"
                  >
                    🛒
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* BANNER ENTREGA */}
<section className="relative mt-6 overflow-hidden rounded-3xl bg-[#eef3fb] px-5 py-5 shadow-sm md:h-[190px] md:px-8 md:py-6">
  <div className="relative z-10 w-[42%] md:w-[35%]">
    <h2 className="text-2xl font-black leading-[0.95] text-[#061b3a] md:text-4xl">
      ENTREGA EN
      <br />
      24-48 HORAS
    </h2>

    <p className="mt-2 text-xs font-semibold leading-snug text-slate-700 md:text-sm">
      En la mayoría de las provincias de Cuba
    </p>

    <button className="mt-4 rounded-xl bg-[#061b3a] px-4 py-3 text-xs font-black text-white md:text-sm">
      Conoce más ❯
    </button>
  </div>

  <Image
    src="/carro-cajas-mapa.png"
    alt="Entrega en Cuba"
    width={900}
    height={300}
    className="absolute bottom-0 right-0 h-full w-[68%] object-contain object-right md:w-[72%]"
  />
</section>

        {/* OFERTAS */}
        <section id="ofertas" className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black">Ofertas de la semana</h2>
            <button className="text-sm font-bold">Ver todas ❯</button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {ofertas.map((producto) => (
              <article key={producto.nombre} className="relative rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <span className="absolute left-3 top-3 rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white">
                  {producto.descuento}
                </span>

                <div className="relative h-36">
                  <Image src={producto.imagen} alt={producto.nombre} fill className="object-contain" />
                </div>

                <h3 className="mt-3 font-black">{producto.nombre}</h3>
                <p className="mt-2">
                  <span className="mr-2 text-sm text-slate-400 line-through">${producto.precioAntes}</span>
                  <span className="text-lg font-black">${producto.precio}</span>
                </p>

                <a
                  href={`https://wa.me/13054974891?text=${encodeURIComponent(
                    `Hola, quiero esta oferta: ${producto.nombre}`
                  )}`}
                  target="_blank"
                  className="mt-3 inline-block rounded-lg border border-red-200 px-4 py-2 text-sm font-black text-red-600"
                >
                  Agregar al carrito
                </a>
              </article>
            ))}
          </div>
        </section>

        {/* WHATSAPP */}
        <section className="mt-6 rounded-2xl bg-[#061b3a] p-4 text-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🟢</div>
              <div>
                <h3 className="font-black">¿Necesitas ayuda con tu pedido?</h3>
                <p className="text-sm text-white/70">
                  Escríbenos por WhatsApp y te ayudamos de inmediato.
                </p>
              </div>
            </div>

            <a
              href="https://wa.me/13054974891"
              target="_blank"
              className="rounded-xl bg-white px-5 py-3 font-black text-[#061b3a]"
            >
              Escribir ahora ❯
            </a>
          </div>
        </section>
      </div>

      {/* BARRA INFERIOR */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white px-4 py-2 shadow-lg">
        <div className="mx-auto grid max-w-2xl grid-cols-5 text-center text-xs font-bold text-slate-500">
          <Link href="/">🏠<br />Inicio</Link>
          <Link href="/rastrear">📦<br />Rastrear</Link>
          <Link href="/tienda" className="text-red-600">🛍️<br />Tienda</Link>
          <Link href="/">🗓️<br />Salidas</Link>
          <a href="https://wa.me/13054974891" target="_blank" className="text-green-600">💬<br />WhatsApp</a>
        </div>
      </nav>
    </main>
  );
}