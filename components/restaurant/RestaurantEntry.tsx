"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, UtensilsCrossed } from 'lucide-react';
import { RESTAURANT_PATH, type RestaurantSection } from '@/lib/restaurant/section';
export function useRestaurantSection(slug: string | undefined) {
  const [result, setResult] = useState<{ slug: string; section: RestaurantSection | null } | null>(null);
  useEffect(() => {
    if (slug !== 'aguila') return;
    const controller = new AbortController();
    void fetch('/api/public/restaurant-section?store=aguila', { signal: controller.signal, cache: 'no-store' }).then(res => res.ok ? res.json() : { section: null }).then(data => { if (!controller.signal.aborted) setResult({ slug, section: data.section }); }).catch(() => {});
    return () => controller.abort();
  }, [slug]);
  return result?.slug === slug ? result?.section : null;
}
export default function RestaurantEntry({ storeSlug }: { storeSlug?: string }) {
  const section = useRestaurantSection(storeSlug);
  if (!section?.enabled) return null;
  return <div className="mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-5"><Link href={RESTAURANT_PATH} className="flex items-center gap-3 rounded-2xl border p-3 shadow-sm sm:gap-4 sm:rounded-3xl sm:p-5" style={{ borderColor: section.accent, backgroundColor: section.background_color }}>
    {section.logo_url ? <Image src={section.logo_url} width={72} height={72} alt={section.name} className="h-14 w-14 shrink-0 rounded-xl bg-white object-contain sm:h-[72px] sm:w-[72px] sm:rounded-2xl"/> : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-white sm:h-[72px] sm:w-[72px] sm:rounded-2xl" style={{color:section.accent}}><UtensilsCrossed size={26}/></span>}
    <div className="min-w-0 flex-1"><p className="truncate text-[9px] font-black uppercase tracking-[.12em] sm:text-xs sm:tracking-wider" style={{color:section.accent}}>Comida a domicilio · Restaurante asociado</p><h2 className="mt-0.5 truncate text-lg font-black sm:mt-1 sm:text-xl" style={{color:section.secondary_color}}>{section.name}</h2><p className="mt-1 hidden text-sm text-slate-600 sm:block">Menú y carrito propios. Entrega independiente de tus compras en Águila.</p></div><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white sm:inline-flex sm:h-auto sm:min-h-11 sm:w-auto sm:gap-2 sm:px-4 sm:py-3 sm:text-sm sm:font-black" style={{backgroundColor:section.accent}}><span className="sr-only sm:not-sr-only">Ver menú</span><ArrowRight size={17}/></span>
  </Link></div>;
}
