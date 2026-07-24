import Image from "next/image";
import { ArrowRight, Calculator, CheckCircle2, MapPin, Search, ShieldCheck, Truck } from "lucide-react";
import PickupPlannerHero from "@/components/pickups/PickupPlannerHero";

export default function YoyoHero() {
  return (
    <section className="relative isolate overflow-hidden bg-[#06152f] text-white">
      <Image src="/yoyo/v13/hero-logistics.webp" alt="Van de YOYO Envíos" fill priority sizes="100vw" className="object-cover object-center opacity-35 blur-[1px] scale-[1.02]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#04142e] via-[#061a3a]/95 to-[#0b2e68]/60" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_30%,rgba(59,130,246,.35),transparent_34%),radial-gradient(circle_at_25%_20%,rgba(215,25,32,.24),transparent_24%)]" />
      <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative mx-auto grid min-h-[780px] max-w-7xl items-center gap-12 px-5 py-20 sm:px-6 lg:grid-cols-[.95fr_1.05fr] lg:py-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/25 bg-blue-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-blue-100 backdrop-blur"><span className="h-2 w-2 animate-pulse rounded-full bg-[#ef2b32]"/> Recogidas en Carolina del Sur</div>
          <h1 className="mt-8 text-5xl font-black leading-[.95] tracking-[-0.045em] sm:text-6xl lg:text-7xl">Tus envíos a Cuba,<span className="mt-2 block bg-gradient-to-r from-white via-blue-100 to-red-300 bg-clip-text text-transparent">con una empresa que responde.</span></h1>
          <p className="mt-7 max-w-2xl text-base font-semibold leading-8 text-blue-100/80 sm:text-lg">Recogemos, empacamos y enviamos tus paquetes con seguridad, rastreo online y atención personalizada desde Carolina del Sur.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href="#cotizar" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#d71920] to-red-500 px-7 py-4 text-sm font-black shadow-[0_18px_48px_rgba(215,25,32,.35)] transition hover:-translate-y-0.5"><Calculator size={20}/> Cotizar mi envío <ArrowRight size={18}/></a>
            <a href="#rastreo" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/[0.08] px-7 py-4 text-sm font-black backdrop-blur transition hover:bg-white/[0.14]"><Search size={20}/> Rastrear paquete</a>
          </div>
          <div className="mt-9 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [ShieldCheck, "Envío seguro"],
              [Truck, "Recogida"],
              [MapPin, "Toda Cuba"],
              [CheckCircle2, "Rastreo online"],
            ].map(([Icon, label]) => {
              const C = Icon as typeof ShieldCheck;
              return <div key={label as string} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.07] px-3 py-3 text-xs font-black text-blue-50 backdrop-blur"><C size={17} className="text-blue-300"/>{label as string}</div>
            })}
          </div>
        </div>
        <div className="relative"><div className="absolute -inset-6 rounded-[3rem] bg-blue-500/10 blur-3xl"/><div className="relative"><PickupPlannerHero/></div></div>
      </div>
    </section>
  );
}
