"use client";

import Image from "next/image";
import Link from "next/link";
import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  getBanners,
  getBannersByStoreId,
} from "@/lib/services/settings";

import GeneratedBannerSlide from "@/components/tienda/GeneratedBannerSlide";
import type { Banner } from "@/components/admin/settings/types";

type MainBannerProps = {
  storeId?: string;
};

export default function MainBanner({ storeId }: MainBannerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [banners, setBanners] = useState<Banner[]>([]);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start" },
    [
      Autoplay({
        delay: 5000,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    ]
  );

  useEffect(() => {
    let mounted = true;

    async function loadBanners() {
      const { data, error } = storeId
        ? await getBannersByStoreId(storeId)
        : await getBanners();

      if (!mounted) return;

      if (error) {
        console.error("Error cargando banners:", error);
        setBanners([]);
        return;
      }

      const activeBanners =
        data
          ?.filter((banner) => banner.is_active)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)) || [];

      setBanners(activeBanners);
    }

    loadBanners();

    return () => {
      mounted = false;
    };
  }, [storeId]);

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

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  if (banners.length === 0) return null;

  return (
    <section className="relative mt-4">
      <div
        ref={emblaRef}
        className="mx-auto max-w-6xl overflow-hidden rounded-3xl"
      >
        <div className="flex">
          {banners.map((banner, index) => (
            <div key={banner.id} className="min-w-0 flex-[0_0_100%]">
              {banner.layout_type === "template" ? (
                <GeneratedBannerSlide
                  banner={banner}
                  priority={index === 0}
                />
              ) : (
                <Link
                  href={banner.button_link || "/tienda"}
                  className="relative block h-[220px] overflow-hidden rounded-3xl shadow-md sm:h-[280px] md:h-[360px] lg:h-[420px]"
                >
                  <Image
                    src={banner.image_url || "/placeholder-banner.jpg"}
                    alt={banner.title || "Banner promocional"}
                    fill
                    priority={index === 0}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1152px"
                    className="bg-white object-contain transition-transform duration-500 hover:scale-[1.01]"
                  />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      {banners.length > 1 && (
        <>
          <button
            type="button"
            onClick={scrollPrev}
            className="absolute left-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#061b3a] shadow-md backdrop-blur md:flex"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            type="button"
            onClick={scrollNext}
            className="absolute right-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#061b3a] shadow-md backdrop-blur md:flex"
          >
            <ChevronRight size={20} />
          </button>

          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => emblaApi?.scrollTo(index)}
                aria-label={`Ir al banner ${index + 1}`}
                className={`h-2 rounded-full transition-all ${
                  selectedIndex === index
                    ? "w-6 bg-red-600"
                    : "w-4 bg-white/70"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}