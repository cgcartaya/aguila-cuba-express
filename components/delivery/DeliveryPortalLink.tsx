'use client';
import { useState } from 'react';
import { Copy, ExternalLink, Smartphone } from 'lucide-react';
import { publicStoreOrigin, type BrandingStore } from '@/lib/saas/store-branding';
export default function DeliveryPortalLink({store}:{store:BrandingStore}){
 const [copied,setCopied]=useState('');
 if(!store.slug)return null;
 const url=(publicStoreOrigin(store)||'https://perlamarketplace.com')+'/repartidores?tienda='+encodeURIComponent(store.slug);
 return <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="flex items-center gap-2 font-black"><Smartphone size={20}/>Portal de repartidores · iPhone y Android</h2><p className="mt-2 text-sm">Comparte el enlace con tu equipo. Acceden con sus cuentas de repartidor y pueden añadirlo al inicio desde Safari.</p><p className="mt-1 text-xs text-emerald-700">Las cuentas de Personal deben tener el rol Repartidor y estar activas. Requiere conexión para guardar.</p></div><div className="flex gap-2"><a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-900 px-4 py-3 text-sm font-bold text-white"><ExternalLink size={16}/>Abrir portal</a><button onClick={async()=>{try{await navigator.clipboard.writeText(url);setCopied('Enlace copiado');}catch{setCopied('Abre el portal y copia el enlace de la barra del navegador.');}}} className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-3 text-sm font-bold"><Copy size={16}/>Copiar enlace</button></div></div>{copied&&<p className="mt-3 text-sm font-bold" role="status">{copied}</p>}</section>;
}
