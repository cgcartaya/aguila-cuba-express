"use client";

/* =========================================================
   OFFERS CAROUSEL - TIENDA PÚBLICA
   Sección visual para ofertas de la semana
========================================================= */

import Image from "next/image";
import { ShoppingCart } from "lucide-react";

type Oferta = {
  nombre: string;
  precioAntes: string;
  precio: string;
  descuento: string;
  imagen: string;
};

type OffersCarouselProps = {
  ofertas: Oferta[];
};

export default function OffersCarousel({ ofertas }: OffersCarouselProps) {
  if (!ofertas || ofertas.length === 0) return null;

  return (
    <section id="ofertas" className="mt-8">
      {/* HEADER */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-black text-[#061b3a]">
          Ofertas de la semana
        </h2>

        <button className="text-sm font-black text-[#061b3a]">
          Ver todas ❯
        </button>
      </div>

      {/* CARRUSEL HORIZONTAL */}
      <div className="flex gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ofertas.map((producto) => (
          <article
            key={producto.nombre}
            className="group relative min-w-[185px] shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg md:min-w-[240px]"
          >
            {/* DESCUENTO */}
            <span className="absolute left-3 top-3 z-10 rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white shadow-sm">
              {producto.descuento}
            </span>

            {/* IMAGEN */}
            <div className="relative h-[155px] w-full bg-white p-4 md:h-[190px]">
              <Image
                src={producto.imagen}
                alt={producto.nombre}
                fill
                unoptimized
                className="object-contain p-4 transition duration-300 group-hover:scale-105"
              />
            </div>

            {/* CONTENIDO */}
            <div className="p-4 pt-1">
              <h3 className="line-clamp-2 min-h-[44px] text-base font-black leading-tight text-[#061b3a]">
                {producto.nombre}
              </h3>

              {/* PRECIOS */}
              <div className="mt-4 flex items-end gap-2">
                <span className="text-sm font-semibold text-slate-400 line-through">
                  ${producto.precioAntes}
                </span>

                <span className="text-xl font-black text-[#061b3a]">
                  ${producto.precio}
                </span>
              </div>

              {/* BOTÓN */}
              <button
                type="button"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-3 text-sm font-black text-red-600 transition hover:bg-red-600 hover:text-white"
              >
                <ShoppingCart size={17} />
                Agregar
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}