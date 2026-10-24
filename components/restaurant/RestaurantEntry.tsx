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
  return <div className="mx-auto max-w-7xl px-4 py-5"><Link href={RESTAURANT_PATH} className="flex flex-col gap-4 rounded-3xl border p-5 shadow-sm sm:flex-row sm:items-center" style={{ borderColor: section.accent, backgroundColor: `${section.accent}0a` }}>
    {section.logo_url ? <Image src={section.logo_url} width={72} height={72} alt={section.name} className="h-18 w-18 shrink-0 rounded-2xl bg-white object-contain"/> : <span className="w-fit rounded-2xl bg-white p-4" style={{color:section.accent}}><UtensilsCrossed size={30}/></span>}
    <div className="min-w-0 flex-1"><p className="text-xs font-black uppercase tracking-wider" style={{color:section.accent}}>Comida a domicilio · Restaurante asociado</p><h2 className="mt-1 break-words text-xl font-black text-[#061b3a]">{section.name}</h2><p className="mt-1 text-sm text-slate-600">Menú y carrito propios. Entrega independiente de tus compras en Águila.</p></div><span className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white" style={{backgroundColor:section.accent}}>Ver menú <ArrowRight size={17}/></span>
  </Link></div>;
}
