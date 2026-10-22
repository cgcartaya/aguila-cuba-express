import Image from "next/image";
import { ArrowRight, Headphones, MapPin, MessageCircle, ShieldCheck, ShoppingCart, Truck } from "lucide-react";
import PickupPlannerHero from "@/components/pickups/PickupPlannerHero";
import { STORE_URL, WHATSAPP_URL } from "./constants";

const benefits = [
  [ShieldCheck, "Envío seguro", "Tus paquetes en buenas manos"],
  [Truck, "Recogida", "Directo en tu domicilio"],
  [MapPin, "Toda Cuba", "Llegamos a cada provincia"],
  [Headphones, "Atención directa", "Te acompañamos en todo el proceso"],
] as const;

export default function YoyoHero() {
  return (
    <section className="bg-[#fffefa] text-[#071b3d]">
      <div className="mx-auto max-w-[1440px] px-5 pb-10 pt-8 sm:px-8 lg:pt-10">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.15fr] lg:gap-10">
          <div className="min-w-0 py-3 lg:py-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#e71936] sm:text-sm">De Carolina del Sur a Cuba</p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-xs font-bold text-[#0757bb]">
              <MapPin size={16} className="shrink-0" /> Recogidas en Carolina del Sur
            </div>
            <h1 className="mt-6 text-[2.65rem] font-black leading-[1.04] tracking-[-0.045em] sm:text-6xl lg:text-[clamp(3rem,4.2vw,4.5rem)]">
              Tus envíos a Cuba,<span className="block text-[#0757bb]">con una empresa que responde.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Recogemos, empacamos y enviamos tus paquetes con seguridad y atención personalizada desde Carolina del Sur.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a href={STORE_URL} className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-[#ed1438] px-6 py-4 text-sm font-bold text-white shadow-lg shadow-red-500/10 transition hover:bg-red-700">
                <ShoppingCart size={20} /> Ir a la tienda <ArrowRight size={18} />
              </a>
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-[#0757bb] px-5 py-4 text-sm font-bold text-[#0757bb] transition hover:bg-blue-50">
                <MessageCircle size={20} /> Hablar por WhatsApp
              </a>
            </div>
          </div>
          <div className="relative min-w-0 overflow-hidden rounded-[2rem] bg-blue-100 lg:rounded-[3rem_2rem_2rem_2rem]">
            <div className="relative aspect-[4/3] sm:aspect-[6/5] lg:aspect-[1.12/1]">
              <Image src="/yoyo/v14/hero-daylight.webp" alt="Van de Yoyo Envíos y paquetes frente al paisaje de La Habana" fill preload sizes="(max-width: 1023px) 100vw, 55vw" className="object-cover" />
            </div>
            <div className="absolute left-4 right-4 top-4 flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-full bg-white/95 px-4 py-2.5 text-xs font-bold shadow-sm sm:left-6 sm:top-6 sm:text-sm">
              <MapPin size={17} className="shrink-0 text-[#0757bb]" /> Carolina del Sur <ArrowRight size={16} className="shrink-0" /> Cuba
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 py-8 sm:py-10 lg:grid-cols-4 lg:gap-0">
          {benefits.map(([Icon, title, description]) => (
            <div key={title} className="flex min-w-0 items-start gap-3 lg:border-r lg:border-slate-200 lg:px-5 lg:last:border-0">
              <Icon className="h-8 w-8 shrink-0 text-[#0757bb] sm:h-10 sm:w-10" strokeWidth={1.7} />
              <div><p className="text-sm font-extrabold sm:text-base">{title}</p><p className="mt-1 text-xs leading-5 text-slate-600">{description}</p></div>
            </div>
          ))}
        </div>
        <div id="solicitar-recogida" className="scroll-mt-28"><PickupPlannerHero variant="horizontal" /></div>
      </div>
    </section>
  );
}
