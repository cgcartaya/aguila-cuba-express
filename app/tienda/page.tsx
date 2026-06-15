"use client";

import Image from "next/image";
import { useState } from "react";

const categorias = [
  {
    nombre: "Convertidores",
    imagen: "/products/electrical/ecoflow.webp",
  },
  {
    nombre: "Eléctricos",
    imagen: "/products/electrical/controlador-solar-1000w.webp",
  },
  {
    nombre: "Comida",
    imagen: "/products/food/chocolisto-sabor-fresa.webp",
  },
  {
    nombre: "Medicinas",
    imagen: "/products/medicines/ibuprofeno200.webp",
  },
  {
    nombre: "Bicicletas",
    imagen: "/products/electrical/bicicleta-electrica48v.webp",
  },
];

const productos = [
  {
    nombre: "Ecoflow Delta 3 Classic",
    categoria: "Convertidores",
    precio: "700.00",
    descripcion: "Estación de energía portátil ideal para apagones.",
    imagen: "/products/electrical/ecoflow.webp",
    etiqueta: "POPULAR",
  },
  {
    nombre: "Convertidor Eléctrico 1000W",
    categoria: "Convertidores",
    precio: "350.00",
    descripcion: "Convertidor de batería con capacidad de 1000 watts.",
    imagen: "/products/electrical/convertidor-1000w.webp",
    etiqueta: "POPULAR",
  },
  {
    nombre: "Controlador Solar 1000W",
    categoria: "Eléctricos",
    precio: "120.00",
    descripcion: "Controlador solar ideal para paneles y sistemas eléctricos.",
    imagen: "/products/electrical/controlador-solar-1000w.webp",
    etiqueta: "NUEVO",
  },
  {
    nombre: "Bicicleta Eléctrica 48V",
    categoria: "Bicicletas",
    precio: "900.00",
    descripcion: "Bicicleta eléctrica para transporte diario.",
    imagen: "/products/electrical/bicicleta-electrica48v.webp",
    etiqueta: "NUEVO",
  },
  {
    nombre: "Olla Eléctrica 1.5L",
    categoria: "Eléctricos",
    precio: "60.00",
    descripcion: "Olla eléctrica multiusos con vaporera.",
    imagen: "/products/electrical/olla-electrica-1-5l.webp",
    etiqueta: "POPULAR",
  },
  {
    nombre: "Olla Eléctrica 2L",
    categoria: "Eléctricos",
    precio: "70.00",
    descripcion: "Olla eléctrica para cocinar en casa.",
    imagen: "/products/electrical/olla-electrica-2l.webp",
    etiqueta: "POPULAR",
  },
  {
    nombre: "Chocolisto Sabor Fresa",
    categoria: "Comida",
    precio: "7.00",
    descripcion: "Producto alimenticio sabor fresa.",
    imagen: "/products/food/chocolisto-sabor-fresa.webp",
    etiqueta: "NUEVO",
  },
  {
    nombre: "Galletas de Mantequilla",
    categoria: "Comida",
    precio: "5.00",
    descripcion: "Lata de galletas de mantequilla.",
    imagen: "/products/food/lata-galletas-mantequilla.webp",
    etiqueta: "NUEVO",
  },
  {
    nombre: "Zuko Limón",
    categoria: "Comida",
    precio: "2.00",
    descripcion: "Refresco instantáneo sabor limón.",
    imagen: "/products/food/refresco-zuco-limon.webp",
    etiqueta: "NUEVO",
  },
  {
    nombre: "Ibuprofeno 200mg",
    categoria: "Medicinas",
    precio: "10.00",
    descripcion: "Frasco de tabletas de ibuprofeno 200mg.",
    imagen: "/products/medicines/ibuprofeno200.webp",
    etiqueta: "DISPONIBLE",
  },
  {
    nombre: "Acetaminophen 500mg",
    categoria: "Medicinas",
    precio: "8.00",
    descripcion: "Extra fuerte, ideal para dolor y fiebre.",
    imagen: "/products/medicines/acetaminophen.webp",
    etiqueta: "DISPONIBLE",
  },
];

export default function TiendaPage() {
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);

  const productosFiltrados = categoriaActiva
    ? productos.filter((producto) => producto.categoria === categoriaActiva)
    : [];

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <section className="bg-white px-5 py-8 shadow-sm">
        <div className="mx-auto max-w-7xl">
          <p className="font-black uppercase text-green-600">ABIERTO</p>

          <h1 className="text-3xl font-black text-[#062446] md:text-5xl">
            AGUILA CUBA EXPRESS
          </h1>

          <p className="mt-3 text-slate-600">
            Tienda de productos para enviar a Cuba.
          </p>
        </div>
      </section>

      {!categoriaActiva ? (
        <section className="mx-auto max-w-7xl px-5 py-8">
          <h2 className="mb-6 text-3xl font-black text-[#062446]">
            Categorías
          </h2>

          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {categorias.map((categoria) => {
              const cantidad = productos.filter(
                (producto) => producto.categoria === categoria.nombre
              ).length;

              return (
                <button
                  key={categoria.nombre}
                  onClick={() => setCategoriaActiva(categoria.nombre)}
                  className="overflow-hidden rounded-2xl bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative h-44 bg-white p-4">
                    <Image
                      src={categoria.imagen}
                      alt={categoria.nombre}
                      fill
                      className="object-contain p-4"
                    />

                    <span className="absolute left-0 top-0 rounded-br-xl bg-[#2f9e9b] px-3 py-2 text-sm font-black text-white">
                      {cantidad} Products
                    </span>
                  </div>

                  <div className="p-4">
                    <h3 className="text-lg font-black uppercase text-[#062446]">
                      {categoria.nombre}
                    </h3>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <>
          <section className="sticky top-0 z-40 border-b bg-white px-5 py-4 shadow-sm">
            <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto">
              <button
                onClick={() => setCategoriaActiva(null)}
                className="shrink-0 rounded-full bg-[#062446] px-5 py-3 font-bold text-white"
              >
                Categorías
              </button>

              {categorias.map((categoria) => (
                <button
                  key={categoria.nombre}
                  onClick={() => setCategoriaActiva(categoria.nombre)}
                  className={`shrink-0 rounded-full border px-5 py-3 font-bold ${
                    categoriaActiva === categoria.nombre
                      ? "bg-red-600 text-white"
                      : "bg-white text-[#062446]"
                  }`}
                >
                  {categoria.nombre}
                </button>
              ))}
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-5 py-8">
            <h2 className="mb-6 text-3xl font-black text-[#062446]">
              {categoriaActiva}
            </h2>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {productosFiltrados.map((producto) => (
                <article
                  key={producto.nombre}
                  className="overflow-hidden rounded-2xl bg-white shadow-sm"
                >
                  <div className="relative h-44 bg-white">
                    <Image
                      src={producto.imagen}
                      alt={producto.nombre}
                      fill
                      className="object-contain p-3"
                    />

                    <span className="absolute left-2 top-2 rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                      {producto.etiqueta}
                    </span>
                  </div>

                  <div className="p-4">
                    <p className="text-xs font-black uppercase text-red-600">
                      {producto.categoria}
                    </p>

                    <h3 className="mt-2 line-clamp-2 min-h-[48px] text-lg font-black leading-tight text-[#062446]">
                      {producto.nombre}
                    </h3>

                    <p className="mt-2 line-clamp-2 min-h-[40px] text-sm text-slate-500">
                      {producto.descripcion}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-xl font-black text-[#062446]">
                        {producto.precio} USD
                      </p>

                      <a
                        href={`https://wa.me/13054974891?text=${encodeURIComponent(
                          `Hola, estoy interesado en este producto: ${producto.nombre} - ${producto.precio} USD`
                        )}`}
                        target="_blank"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#062446] text-2xl font-bold text-white"
                      >
                        +
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="mt-8 bg-[#062446] px-6 py-12 text-white">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-4xl font-black">AGUILA CUBA EXPRESS</h2>
          <p className="mt-4 max-w-2xl text-lg text-white/75">
            El precio de cada producto puede incluir costo, gestión, manejo y envío.
            Consulta disponibilidad antes de ordenar.
          </p>

          <div className="mt-8 space-y-4 text-xl font-bold">
            <p>🕘 Abierto</p>
            <p>📍 Miami-Dade, Florida</p>
            <p>📦 Entregamos a domicilio</p>
          </div>

          <a
            href="https://wa.me/13054974891"
            target="_blank"
            className="mt-8 inline-block rounded-xl bg-green-500 px-8 py-4 font-bold"
          >
            WhatsApp
          </a>
        </div>
      </section>
    </main>
  );
}