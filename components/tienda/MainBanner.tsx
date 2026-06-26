"use client";

/* =========================================================
   MAIN BANNER - TIENDA PÚBLICA
   Carrusel principal usando banners gráficos completos
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
    href: "/tienda/categorias/aseo",
  },

  {
    id: 2,
    image: "/banners/carniceria.png",
    href: "/tienda/categorias/carnicería",
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

  /* =========================================================
     CONTROLES DEL CARRUSEL
  ========================================================= */

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  /* =========================================================
     INDICADOR ACTIVO
  ========================================================= */

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

      {/* =====================================================
         CONTENEDOR DEL CARRUSEL
      ===================================================== */}

      <div
        ref={emblaRef}
        className="overflow-hidden rounded-3xl"
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
                  aspect-[16/9]
                  overflow-hidden
                  rounded-3xl
                  shadow-md
                "
              >
                <Image
                  src={banner.image}
                  alt="Banner promocional"
                  fill
                  priority={banner.id === 1}
                  className="
                    object-cover
                    transition-transform
                    duration-500
                    hover:scale-[1.02]
                  "
                />
              </Link>
            </div>
          ))}

        </div>
      </div>

      {/* =====================================================
         BOTÓN ANTERIOR
      ===================================================== */}

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

      {/* =====================================================
         BOTÓN SIGUIENTE
      ===================================================== */}

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

      {/* =====================================================
         INDICADORES
      ===================================================== */}

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