"use client";

/* =========================================================
   MAIN BANNER - TIENDA PÚBLICA
========================================================= */

import Image from "next/image";
import Link from "next/link";
import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

/* =========================================================
   BANNERS PRINCIPALES
========================================================= */

const banners = [
  {
    id: 1,
    image: "/banners/combo-1.jpg",
    href: "/tienda/combos",
  },
  {
    id: 2,
    image: "/banners/carniceria.png",
    href: "/tienda/categorias/carnicería",
  },
  {
    id: 3,
    image: "/banners/cafe.png",
    href: "/tienda/categorias/alimentos",
  },
  {
    id: 4,
    image: "/banners/entregas.jpg",
    href: "/servicios",
  },
  {
    id: 5,
    image: "/banners/mosquitos.png",
    href: "/tienda/categorias/aseo",
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
        delay: 5000,
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
      <div
        ref={emblaRef}
        className="
          overflow-hidden
          rounded-3xl
          max-w-6xl
          mx-auto
        "
      >
        <div className="flex">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="min-w-0 flex-[0_0_100%]"
            >
              <Link
                href={banner.href}
                className="
                  relative block
                  overflow-hidden
                  rounded-3xl
                  shadow-md

                  h-[220px]
                  sm:h-[280px]
                  md:h-[360px]
                  lg:h-[420px]
                "
              >
                <Image
                  src={banner.image}
                  alt="Banner promocional"
                  fill
                  priority={banner.id === 1}
                  className="
                    object-contain
                    bg-white
                    transition-transform
                    duration-500
                    hover:scale-[1.01]
                  "
                />
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Flecha izquierda */}

      <button
        type="button"
        onClick={scrollPrev}
        className="
          absolute left-3 top-1/2 z-20
          hidden h-10 w-10 -translate-y-1/2
          items-center justify-center
          rounded-full bg-white/90
          text-[#061b3a]
          shadow-md
          backdrop-blur
          md:flex
        "
      >
        <ChevronLeft size={20} />
      </button>

      {/* Flecha derecha */}

      <button
        type="button"
        onClick={scrollNext}
        className="
          absolute right-3 top-1/2 z-20
          hidden h-10 w-10 -translate-y-1/2
          items-center justify-center
          rounded-full bg-white/90
          text-[#061b3a]
          shadow-md
          backdrop-blur
          md:flex
        "
      >
        <ChevronRight size={20} />
      </button>

      {/* Indicadores */}

      <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {banners.map((banner, index) => (
          <button
            key={banner.id}
            type="button"
            onClick={() => emblaApi?.scrollTo(index)}
            aria-label={`Ir al banner ${index + 1}`}
            className={`
              h-2 rounded-full transition-all
              ${
                selectedIndex === index
                  ? "w-6 bg-red-600"
                  : "w-4 bg-white/70"
              }
            `}
          />
        ))}
      </div>
    </section>
  );
}