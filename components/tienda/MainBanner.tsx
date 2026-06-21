"use client";

/* =========================================================
   HEADER BANNER CAROUSEL - TIENDA PÚBLICA
   Carrusel principal de anuncios usando Embla Carousel
========================================================= */

import Image from "next/image";
import Link from "next/link";
import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const banners = [
  {
    id: 1,
    title: "Envía más, paga menos",
    description: "Miles de productos para tu familia en Cuba",
    image: "/logo-tienda.png",
    href: "#ofertas",
    buttonText: "Ver ofertas",
  },
  {
    id: 2,
    title: "Entrega en 24-48 horas",
    description: "Cobertura en la mayoría de las provincias de Cuba",
    image: "/carro-cajas-mapa.png",
    href: "/tienda/productos-destacados",
    buttonText: "Ver productos",
  },
  {
    id: 3,
    title: "Combos para tu familia",
    description: "Alimentos, hogar, medicinas y más",
    image: "/products/food/chocolisto-sabor-fresa.webp",
    href: "/tienda/productos-destacados",
    buttonText: "Comprar ahora",
  },
];

export default function MainBanner() {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: "start",
    },
    [
      Autoplay({
        delay: 4500,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    ]
  );

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    onSelect();
    emblaApi.on("select", onSelect);

    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  return (
    <section className="relative mt-4">
      <div ref={emblaRef} className="overflow-hidden rounded-3xl">
        <div className="flex">
          {banners.map((banner) => (
            <div key={banner.id} className="min-w-0 flex-[0_0_100%]">
              <Link
                href={banner.href}
                className="relative block h-[285px] overflow-hidden rounded-3xl bg-[#f4f7fb] px-5 py-5 shadow-sm md:h-[420px] md:px-10 md:py-10"
              >
                <div className="relative z-10 w-[48%] md:w-[45%]">
                  <h2 className="text-[28px] font-black uppercase leading-[1.05] text-[#061b3a] md:text-5xl">
                    {banner.title.split(",")[0]}
                    {banner.title.includes(",") && (
                      <>
                        ,
                        <br />
                        <span className="text-red-600">
                          {banner.title.split(",")[1].trim()}
                        </span>
                      </>
                    )}
                  </h2>

                  <p className="mt-3 max-w-[190px] text-xs font-bold leading-snug text-slate-700 md:text-base">
                    {banner.description}
                  </p>

                  <span className="mt-5 inline-flex rounded-xl bg-red-600 px-4 py-2.5 text-xs font-black text-white shadow-sm md:px-5 md:py-3 md:text-sm">
                    {banner.buttonText} ❯
                  </span>
                </div>

                <Image
                  src={banner.image}
                  alt={banner.title}
                  width={850}
                  height={520}
                  priority={banner.id === 1}
                  className="absolute bottom-6 right-[-18px] h-auto w-[60%] object-contain md:bottom-4 md:right-8 md:w-[52%]"
                />
              </Link>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={scrollPrev}
        className="absolute left-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#061b3a] shadow-md"
      >
        <ChevronLeft size={20} />
      </button>

      <button
        type="button"
        onClick={scrollNext}
        className="absolute right-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#061b3a] shadow-md"
      >
        <ChevronRight size={20} />
      </button>

      <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {banners.map((banner, index) => (
          <button
            key={banner.id}
            type="button"
            onClick={() => emblaApi?.scrollTo(index)}
            className={`h-2 rounded-full transition-all ${
              selectedIndex === index
                ? "w-6 bg-red-600"
                : "w-4 bg-slate-300"
            }`}
            aria-label={`Ir al banner ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}