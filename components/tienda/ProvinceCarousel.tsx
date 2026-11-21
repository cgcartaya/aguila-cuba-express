"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { getWfCargoComboMunicipalities } from "@/lib/checkout/wfcargo-delivery";
import type { Product } from "@/types/cart";

export default function ProvinceCarousel({ products, category, slug }: { products: Product[]; category: string; slug: string }) {
  const slides = useMemo(() => {
    const photos = new Map<string, string>();
    for (const product of products) {
      if (product.category !== category || (product.stock ?? 0) <= 0) continue;
      for (const province of product.delivery_provinces ?? []) {
        if (!photos.get(province)) photos.set(province, product.image_url || "");
      }
    }
    return Array.from(photos.entries());
  }, [products, category]);
  const multiple = slides.length > 1;
  const plugins = useMemo(() => multiple ? [Autoplay({
    delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true,
    breakpoints: { "(prefers-reduced-motion: reduce)": { active: false } },
  })] : [], [multiple]);
  const [viewport, api] = useEmblaCarousel({ loop: multiple, align: "start" }, plugins);
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    if (!api) return;
    const sync = () => setSelected(api.selectedScrollSnap());
    sync();
    api.on("select", sync).on("reInit", sync);
    return () => { api.off("select", sync).off("reInit", sync); };
  }, [api]);
  if (!slides.length) return null;
  return (
    <section id={category} aria-label="Combos de alimentos por provincia" className="mx-4 my-5 scroll-mt-44">
      <h2 className="mb-3 text-xl font-bold text-slate-900">Combos de alimentos</h2>
      <div ref={viewport} className="overflow-hidden rounded-2xl">
        <div className="flex touch-pan-y">
          {slides.map(([province, image]) => (
            <div key={province} className={multiple ? "min-w-0 flex-[0_0_95%] pr-2" : "w-full shrink-0"}>
              <article className="relative isolate flex min-h-44 flex-col items-start justify-end overflow-hidden rounded-2xl bg-[#081e40] p-5 text-white md:min-h-64 md:p-8">
                {image && <img src={image} alt="" draggable={false} className="absolute inset-y-0 right-0 -z-20 h-full w-2/3 object-cover object-center" />}
                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#081e40] via-[#081e40]/85 to-transparent" />
                <h3 className="text-3xl font-bold">{province}</h3>
                {getWfCargoComboMunicipalities(province).length === 1 && <p className="mt-1 text-sm">Entrega solo en {getWfCargoComboMunicipalities(province)[0]}</p>}
                <Link href={`/tienda/${slug}/categorias/combos?provincia=${encodeURIComponent(province)}`} aria-label={`Ver combos de ${province}`} className="mt-3 rounded-full bg-white px-5 py-2.5 font-bold text-[#081e40]">Ver combos →</Link>
              </article>
            </div>
          ))}
        </div>
      </div>
      {multiple && <div className="flex justify-center">{slides.map(([province], index) => (
        <button key={province} type="button" aria-label={`Mostrar ${province}`} aria-current={index === selected} onClick={() => { api?.scrollTo(index); api?.plugins().autoplay?.reset(); }} className="grid h-9 min-w-7 place-items-center">
          <span className={index === selected ? "h-2 w-6 rounded-full bg-red-600" : "size-2 rounded-full bg-slate-400"} />
        </button>
      ))}</div>}
    </section>
  );
}
