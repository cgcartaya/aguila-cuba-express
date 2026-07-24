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

const benefits = [
  [ShieldCheck, "Envío seguro"],
  [Truck, "Recogida"],
  [MapPin, "Toda Cuba"],
  [CheckCircle2, "Atención directa"],
] as const;

export default function YoyoHero() {
  return (
    <section className="yoyo-cinematic-hero relative isolate overflow-hidden bg-[#020d20] text-white">
      {/* Fondo ambiental continuo */}
      <div className="absolute inset-0 bg-[linear-gradient(115deg,#020d20_0%,#04152f_38%,#08285b_72%,#061b3d_100%)]" />
      <div className="hero-aurora absolute inset-0" />
      <div className="absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.55)_1px,transparent_1px)] [background-size:52px_52px]" />

      {/* Visual de ruta, van y cajas: sin corte vertical visible */}
      <div className="hero-visual pointer-events-none absolute inset-y-0 right-[-8%] hidden w-[78%] lg:block">
        <div className="hero-visual-float absolute inset-0">
          <Image
            src="/yoyo/v13/hero-route-visual.webp"
            alt="Ruta de YOYO Envíos desde Carolina del Sur hacia Cuba"
            fill
            priority
            sizes="78vw"
            className="object-contain object-right opacity-[0.96] drop-shadow-[0_38px_90px_rgba(0,0,0,.5)]"
          />
        </div>
        <div className="hero-visual-glow absolute bottom-[8%] right-[8%] h-[30%] w-[56%] rounded-[50%] bg-blue-500/20 blur-[70px]" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#020d20] via-[#020d20]/55 to-transparent" />
      </div>

      {/* Ruta luminosa y señal viajera */}
      <div className="hero-route-layer pointer-events-none absolute inset-0 hidden lg:block">
        <span className="hero-route-dot" />
        <span className="hero-route-pulse hero-route-pulse-start" />
        <span className="hero-route-pulse hero-route-pulse-end" />
      </div>

      {/* Destellos y partículas ligeras */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[10, 22, 36, 53, 69, 82, 93].map((left, index) => (
          <span
            key={left}
            className="hero-particle absolute h-1.5 w-1.5 rounded-full bg-blue-200/80 shadow-[0_0_16px_rgba(96,165,250,.95)]"
            style={{
              left: `${left}%`,
              top: `${14 + (index % 4) * 18}%`,
              animationDelay: `${index * 0.75}s`,
            }}
          />
        ))}
        <span className="hero-shooting-light absolute right-[8%] top-[22%] h-px w-40 bg-gradient-to-r from-transparent via-blue-200/90 to-transparent" />
      </div>

      <div className="relative mx-auto grid min-h-[810px] max-w-7xl items-center gap-12 px-5 py-20 sm:px-6 lg:grid-cols-[.92fr_1.08fr] lg:py-24">
        <div className="hero-copy relative z-20 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/25 bg-blue-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-blue-100 shadow-[0_12px_40px_rgba(37,99,235,.12)] backdrop-blur-xl">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#ef2b32] shadow-[0_0_14px_rgba(239,43,50,.9)]" />
            Recogidas en Carolina del Sur
          </div>

          <h1 className="mt-8 text-5xl font-black leading-[.95] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
            Tus envíos a Cuba,
            <span className="mt-2 block bg-gradient-to-r from-white via-blue-100 to-red-300 bg-clip-text text-transparent drop-shadow-[0_12px_36px_rgba(59,130,246,.16)]">
              con una empresa que responde.
            </span>
          </h1>

          <p className="mt-7 max-w-2xl text-base font-semibold leading-8 text-blue-100/80 sm:text-lg">
            Recogemos, empacamos y enviamos tus paquetes con seguridad y atención personalizada desde Carolina del Sur.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="#cotizar"
              className="hero-primary-button group relative inline-flex overflow-hidden items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#d71920] to-red-500 px-7 py-4 text-sm font-black shadow-[0_18px_48px_rgba(215,25,32,.35)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_64px_rgba(215,25,32,.5)]"
            >
              <span className="hero-button-shine absolute inset-y-0 -left-1/2 w-1/3 skew-x-[-18deg] bg-white/30 blur-sm" />
              <Calculator size={20} className="relative" />
              <span className="relative">Cotizar mi envío</span>
              <ArrowRight size={18} className="relative transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/[0.08] px-7 py-4 text-sm font-black shadow-[inset_0_1px_0_rgba(255,255,255,.12)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.14]"
            >
              <MessageCircle size={20} className="transition-transform group-hover:scale-110" /> Hablar por WhatsApp
            </a>
          </div>

          <div className="mt-9 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {benefits.map(([Icon, label], index) => (
              <div
                key={label}
                className="hero-benefit flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.065] px-3 py-3 text-xs font-black text-blue-50 shadow-[inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-blue-300/25 hover:bg-white/[0.1]"
                style={{ animationDelay: `${0.55 + index * 0.09}s` }}
              >
                <Icon size={17} className="text-blue-300" />
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="hero-planner relative z-30 mt-8 lg:mt-0 lg:translate-y-7">
          <div className="absolute -inset-10 rounded-[4rem] bg-blue-500/15 blur-[60px]" />
          <div className="hero-planner-shell relative lg:ml-auto lg:max-w-[510px]">
            <div className="pointer-events-none absolute -inset-px rounded-[2.35rem] bg-gradient-to-br from-white/60 via-blue-200/25 to-red-300/20 opacity-75" />
            <div className="relative rounded-[2.3rem] bg-white/[0.08] p-1.5 shadow-[0_34px_90px_rgba(0,0,0,.45),inset_0_1px_0_rgba(255,255,255,.28)] backdrop-blur-2xl">
              <PickupPlannerHero />
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#020d20] to-transparent" />

      <style>{`
        .hero-visual {
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,.1) 5%, #000 27%, #000 100%);
          mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,.1) 5%, #000 27%, #000 100%);
        }
        .hero-aurora {
          background:
            radial-gradient(circle at 78% 38%, rgba(37,99,235,.28), transparent 28%),
            radial-gradient(circle at 88% 72%, rgba(14,165,233,.18), transparent 24%),
            radial-gradient(circle at 24% 24%, rgba(215,25,32,.16), transparent 22%);
          animation: heroAurora 12s ease-in-out infinite alternate;
        }
        .hero-visual-float { animation: heroVisualFloat 8s ease-in-out infinite; }
        .hero-visual-glow { animation: heroGlow 5s ease-in-out infinite; }
        .hero-particle { animation: heroParticle 7s linear infinite; }
        .hero-shooting-light { animation: heroShootingLight 8s ease-in-out infinite; opacity: 0; }
        .hero-copy { animation: heroCopyIn .9s cubic-bezier(.2,.8,.2,1) both; }
        .hero-planner { animation: heroPlannerIn 1s .18s cubic-bezier(.2,.8,.2,1) both; }
        .hero-planner-shell { animation: heroPlannerFloat 6s 1.2s ease-in-out infinite; transform-style: preserve-3d; }
        .hero-benefit { animation: heroItemIn .65s cubic-bezier(.2,.8,.2,1) both; }
        .hero-primary-button:hover .hero-button-shine { animation: heroButtonShine .8s ease forwards; }
        .hero-route-dot {
          position: absolute;
          left: 58%;
          top: 27%;
          width: 10px;
          height: 10px;
          border-radius: 9999px;
          background: #fff;
          box-shadow: 0 0 10px #fff, 0 0 24px #60a5fa, 0 0 42px #2563eb;
          offset-path: path("M 0 0 C 160 -70 320 -50 505 105");
          animation: heroRouteTravel 4.8s 1s ease-in-out infinite;
        }
        .hero-route-pulse {
          position: absolute;
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          border: 2px solid rgba(96,165,250,.9);
          box-shadow: 0 0 26px rgba(59,130,246,.8);
          animation: heroPulse 2.4s ease-out infinite;
        }
        .hero-route-pulse-start { left: 57.5%; top: 27.5%; }
        .hero-route-pulse-end { right: 11.5%; top: 40%; border-color: rgba(248,113,113,.95); box-shadow: 0 0 28px rgba(239,68,68,.8); animation-delay: .9s; }
        @keyframes heroAurora {
          0% { transform: scale(1) translate3d(0,0,0); opacity: .8; }
          100% { transform: scale(1.08) translate3d(-1.5%,1%,0); opacity: 1; }
        }
        @keyframes heroVisualFloat {
          0%,100% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(-6px,-12px,0) scale(1.012); }
        }
        @keyframes heroGlow {
          0%,100% { transform: scale(.95); opacity: .45; }
          50% { transform: scale(1.08); opacity: .9; }
        }
        @keyframes heroParticle {
          0% { transform: translate3d(0,22px,0) scale(.7); opacity: 0; }
          18% { opacity: .9; }
          75% { opacity: .35; }
          100% { transform: translate3d(58px,-36px,0) scale(1.15); opacity: 0; }
        }
        @keyframes heroShootingLight {
          0%,70%,100% { transform: translate3d(120px,-20px,0) rotate(-18deg); opacity: 0; }
          76% { opacity: .7; }
          88% { transform: translate3d(-220px,100px,0) rotate(-18deg); opacity: 0; }
        }
        @keyframes heroCopyIn {
          from { opacity: 0; transform: translate3d(-28px,16px,0); }
          to { opacity: 1; transform: translate3d(0,0,0); }
        }
        @keyframes heroPlannerIn {
          from { opacity: 0; transform: translate3d(35px,38px,0) scale(.96); }
          to { opacity: 1; transform: translate3d(0,0,0) scale(1); }
        }
        @keyframes heroPlannerFloat {
          0%,100% { transform: translate3d(0,0,0) rotateX(0deg) rotateY(0deg); }
          50% { transform: translate3d(0,-9px,0) rotateX(.7deg) rotateY(-.7deg); }
        }
        @keyframes heroItemIn {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroButtonShine {
          from { transform: translateX(0) skewX(-18deg); }
          to { transform: translateX(470%) skewX(-18deg); }
        }
        @keyframes heroRouteTravel {
          0% { offset-distance: 0%; opacity: 0; transform: scale(.7); }
          12% { opacity: 1; }
          82% { opacity: 1; }
          100% { offset-distance: 100%; opacity: 0; transform: scale(1.25); }
        }
        @keyframes heroPulse {
          0% { transform: scale(.45); opacity: 1; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @media (max-width: 1023px) {
          .yoyo-cinematic-hero { background: linear-gradient(145deg,#020d20,#08285b); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-aurora,.hero-visual-float,.hero-visual-glow,.hero-particle,.hero-shooting-light,.hero-copy,.hero-planner,.hero-planner-shell,.hero-benefit,.hero-route-dot,.hero-route-pulse { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
