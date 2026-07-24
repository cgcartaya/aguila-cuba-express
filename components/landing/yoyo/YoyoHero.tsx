import Image from "next/image";
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Truck,
} from "lucide-react";
import PickupPlannerHero from "@/components/pickups/PickupPlannerHero";
import { WHATSAPP_URL } from "./constants";

export default function YoyoHero() {
  return (
    <section className="relative isolate overflow-hidden bg-[#031329] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_35%,rgba(37,99,235,.24),transparent_34%),radial-gradient(circle_at_22%_22%,rgba(215,25,32,.18),transparent_25%),linear-gradient(135deg,#031329_0%,#061a3a_48%,#0b2e68_100%)]" />
      <div className="absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.55)_1px,transparent_1px)] [background-size:52px_52px]" />

      <div className="pointer-events-none absolute inset-y-0 right-[-7%] hidden w-[66%] lg:block">
        <div className="absolute inset-0 animate-[heroFloat_9s_ease-in-out_infinite]">
          <Image
            src="/yoyo/v13/hero-route-visual.webp"
            alt="Ruta de YOYO Envíos desde Carolina del Sur hacia Cuba"
            fill
            priority
            sizes="66vw"
            className="object-contain object-center opacity-95 drop-shadow-[0_30px_70px_rgba(0,0,0,.42)]"
          />
        </div>
        <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-[#031329] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#031329] to-transparent" />
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[12, 26, 44, 61, 78, 90].map((left, index) => (
          <span
            key={left}
            className="absolute h-1.5 w-1.5 rounded-full bg-blue-300/70 shadow-[0_0_14px_rgba(96,165,250,.85)] animate-[heroParticle_7s_linear_infinite]"
            style={{
              left: `${left}%`,
              top: `${18 + (index % 3) * 21}%`,
              animationDelay: `${index * 0.9}s`,
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto grid min-h-[790px] max-w-7xl items-center gap-12 px-5 py-20 sm:px-6 lg:grid-cols-[.92fr_1.08fr] lg:py-24">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/25 bg-blue-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-blue-100 backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#ef2b32]" />
            Recogidas en Carolina del Sur
          </div>

          <h1 className="mt-8 text-5xl font-black leading-[.95] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
            Tus envíos a Cuba,
            <span className="mt-2 block bg-gradient-to-r from-white via-blue-100 to-red-300 bg-clip-text text-transparent">
              con una empresa que responde.
            </span>
          </h1>

          <p className="mt-7 max-w-2xl text-base font-semibold leading-8 text-blue-100/80 sm:text-lg">
            Recogemos, empacamos y enviamos tus paquetes con seguridad y atención personalizada desde Carolina del Sur.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="#cotizar"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#d71920] to-red-500 px-7 py-4 text-sm font-black shadow-[0_18px_48px_rgba(215,25,32,.35)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_58px_rgba(215,25,32,.45)]"
            >
              <Calculator size={20} /> Cotizar mi envío <ArrowRight size={18} />
            </a>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/[0.08] px-7 py-4 text-sm font-black backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/[0.14]"
            >
              <MessageCircle size={20} /> Hablar por WhatsApp
            </a>
          </div>

          <div className="mt-9 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [ShieldCheck, "Envío seguro"],
              [Truck, "Recogida"],
              [MapPin, "Toda Cuba"],
              [CheckCircle2, "Atención directa"],
            ].map(([Icon, label]) => {
              const C = Icon as typeof ShieldCheck;
              return (
                <div
                  key={label as string}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.07] px-3 py-3 text-xs font-black text-blue-50 backdrop-blur"
                >
                  <C size={17} className="text-blue-300" />
                  {label as string}
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 mt-8 lg:mt-0 lg:translate-y-8">
          <div className="absolute -inset-7 rounded-[3rem] bg-blue-500/10 blur-3xl" />
          <div className="relative lg:ml-auto lg:max-w-[520px]">
            <PickupPlannerHero />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes heroFloat {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(0, -10px, 0) scale(1.01); }
        }
        @keyframes heroParticle {
          0% { transform: translate3d(0, 18px, 0); opacity: 0; }
          20% { opacity: .8; }
          80% { opacity: .35; }
          100% { transform: translate3d(48px, -26px, 0); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          [class*="heroFloat"], [class*="heroParticle"] { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
