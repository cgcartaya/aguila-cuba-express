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
    <section className="relative isolate overflow-hidden bg-[#020d20] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(115deg,#020d20_0%,#04152f_40%,#08285b_76%,#061b3d_100%)]" />
      <div className="yoyo-aurora absolute -inset-[12%]" />
      <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.55)_1px,transparent_1px)] [background-size:52px_52px]" />

      {/* Visual exclusivo de escritorio. Se muestra solo a la derecha y nunca repite texto. */}
      <div className="yoyo-desktop-visual pointer-events-none absolute inset-y-[3%] right-[-4%] hidden w-[68%] lg:block">
        <Image
          src="/yoyo/v13/hero-route-visual-clean.webp"
          alt="Van de YOYO Envíos y ruta desde Carolina del Sur hacia Cuba"
          fill
          priority
          sizes="68vw"
          className="yoyo-visual-float object-contain object-right opacity-[0.86] drop-shadow-[0_38px_90px_rgba(0,0,0,.55)]"
        />
        <div className="yoyo-visual-glow absolute bottom-[7%] right-[5%] h-[34%] w-[58%] rounded-[50%] bg-blue-500/25 blur-[72px]" />
        <div className="absolute inset-y-0 left-0 w-[36%] bg-gradient-to-r from-[#020d20] via-[#020d20]/75 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#020d20] via-[#020d20]/55 to-transparent" />
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[11, 24, 39, 55, 71, 85, 94].map((left, index) => (
          <span
            key={left}
            className="yoyo-particle absolute h-1.5 w-1.5 rounded-full bg-blue-200/80 shadow-[0_0_16px_rgba(96,165,250,.95)]"
            style={{
              left: `${left}%`,
              top: `${13 + (index % 4) * 19}%`,
              animationDelay: `${index * 0.7}s`,
            }}
          />
        ))}
        <span className="yoyo-shooting-light absolute right-[8%] top-[21%] h-px w-40 bg-gradient-to-r from-transparent via-blue-200/90 to-transparent" />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 sm:px-6 sm:py-20 lg:min-h-[790px] lg:grid-cols-[.92fr_1.08fr] lg:gap-12 lg:py-24">
        <div className="yoyo-copy relative z-20 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/25 bg-blue-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-blue-100 shadow-[0_12px_40px_rgba(37,99,235,.12)] backdrop-blur-xl sm:text-xs sm:tracking-[0.18em]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#ef2b32] shadow-[0_0_14px_rgba(239,43,50,.9)]" />
            Recogidas en Carolina del Sur
          </div>

          <h1 className="mt-7 text-[3.15rem] font-black leading-[.98] tracking-[-0.045em] sm:mt-8 sm:text-6xl lg:text-7xl">
            Tus envíos a Cuba,
            <span className="mt-2 block bg-gradient-to-r from-white via-blue-100 to-red-300 bg-clip-text text-transparent drop-shadow-[0_12px_36px_rgba(59,130,246,.16)]">
              con una empresa que responde.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base font-semibold leading-7 text-blue-100/80 sm:mt-7 sm:text-lg sm:leading-8">
            Recogemos, empacamos y enviamos tus paquetes con seguridad y atención personalizada desde Carolina del Sur.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row">
            <a
              href="#cotizar"
              className="yoyo-primary-button group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#d71920] to-red-500 px-7 py-4 text-sm font-black shadow-[0_18px_48px_rgba(215,25,32,.35)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_64px_rgba(215,25,32,.5)]"
            >
              <span className="yoyo-button-shine absolute inset-y-0 -left-1/2 w-1/3 skew-x-[-18deg] bg-white/30 blur-sm" />
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

          <div className="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:mt-9 sm:grid-cols-4">
            {benefits.map(([Icon, label], index) => (
              <div
                key={label}
                className="yoyo-benefit flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.065] px-3 py-3 text-xs font-black text-blue-50 shadow-[inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-blue-300/25 hover:bg-white/[0.1]"
                style={{ animationDelay: `${0.5 + index * 0.08}s` }}
              >
                <Icon size={17} className="shrink-0 text-blue-300" />
                {label}
              </div>
            ))}
          </div>

          {/* En móvil el visual aparece aquí, después del mensaje y antes del formulario. */}
          <div className="yoyo-mobile-visual relative mt-9 h-[255px] w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#061a3a]/60 shadow-[0_28px_70px_rgba(0,0,0,.38)] sm:h-[330px] lg:hidden">
            <Image
              src="/yoyo/v13/hero-route-visual-clean.webp"
              alt="Van de YOYO Envíos, mapa y cajas"
              fill
              priority
              sizes="100vw"
              className="object-cover object-[58%_center] opacity-[0.96]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020d20]/55 via-transparent to-[#020d20]/20" />
            <div className="absolute inset-x-[14%] bottom-[7%] h-16 rounded-[50%] bg-blue-500/25 blur-3xl" />
            <span className="yoyo-mobile-dot" />
          </div>
        </div>

        <div className="yoyo-planner relative z-30 lg:translate-y-6">
          <div className="absolute -inset-8 rounded-[4rem] bg-blue-500/15 blur-[60px]" />
          <div className="yoyo-planner-shell relative mx-auto max-w-[560px] lg:ml-auto lg:mr-0 lg:max-w-[440px]">
            <div className="pointer-events-none absolute -inset-px rounded-[2.35rem] bg-gradient-to-br from-white/60 via-blue-200/25 to-red-300/20 opacity-75" />
            <div className="relative rounded-[2.3rem] bg-white/[0.08] p-1.5 shadow-[0_34px_90px_rgba(0,0,0,.45),inset_0_1px_0_rgba(255,255,255,.28)] backdrop-blur-2xl">
              <div
  id="solicitar-recogida"
  className="scroll-mt-24"
>
  <PickupPlannerHero />
</div>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#020d20] to-transparent" />

      <style>{`
        .yoyo-desktop-visual {
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,.2) 11%, #000 30%, #000 100%);
          mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,.2) 11%, #000 30%, #000 100%);
        }
        .yoyo-aurora {
          background:
            radial-gradient(circle at 76% 34%, rgba(37,99,235,.5), transparent 27%),
            radial-gradient(circle at 87% 72%, rgba(14,165,233,.32), transparent 24%),
            radial-gradient(circle at 23% 28%, rgba(215,25,32,.22), transparent 23%);
          filter: saturate(1.2);
          animation: yoyoAurora 8s ease-in-out infinite alternate;
          will-change: transform, opacity;
        }
        .yoyo-visual-float { animation: yoyoVisualFloat 7s ease-in-out infinite; }
        .yoyo-visual-glow { animation: yoyoGlow 4.8s ease-in-out infinite; }
        .yoyo-particle { animation: yoyoParticle 7s linear infinite; }
        .yoyo-shooting-light { animation: yoyoShooting 8s ease-in-out infinite; opacity: 0; }
        .yoyo-copy { animation: yoyoCopyIn .8s cubic-bezier(.2,.8,.2,1) both; }
        .yoyo-planner { animation: yoyoPlannerIn .9s .12s cubic-bezier(.2,.8,.2,1) both; }
        .yoyo-planner-shell { animation: yoyoPlannerFloat 6s 1s ease-in-out infinite; }
        .yoyo-benefit { animation: yoyoItemIn .6s cubic-bezier(.2,.8,.2,1) both; }
        .yoyo-mobile-visual { animation: yoyoMobileIn .8s .15s cubic-bezier(.2,.8,.2,1) both, yoyoMobileFloat 7s 1.1s ease-in-out infinite; }
        .yoyo-primary-button:hover .yoyo-button-shine { animation: yoyoButtonShine .8s ease forwards; }
        .yoyo-mobile-dot {
          position: absolute;
          left: 31%;
          top: 28%;
          width: 9px;
          height: 9px;
          border-radius: 9999px;
          background: #fff;
          box-shadow: 0 0 10px #fff, 0 0 22px #60a5fa, 0 0 34px #2563eb;
          animation: yoyoMobileRoute 4.6s 1s ease-in-out infinite;
        }
        @keyframes yoyoAurora {
          0% { transform: scale(1) translate3d(0,0,0); opacity: .7; }
          50% { transform: scale(1.09) translate3d(-2%,1.2%,0); opacity: 1; }
          100% { transform: scale(1.04) translate3d(1.6%,-1%,0); opacity: .84; }
        }
        @keyframes yoyoVisualFloat {
          0%,100% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(-7px,-10px,0) scale(1.012); }
        }
        @keyframes yoyoGlow {
          0%,100% { transform: scale(.94); opacity: .45; }
          50% { transform: scale(1.08); opacity: .9; }
        }
        @keyframes yoyoParticle {
          0% { transform: translate3d(0,20px,0) scale(.7); opacity: 0; }
          18% { opacity: .9; }
          76% { opacity: .35; }
          100% { transform: translate3d(54px,-34px,0) scale(1.15); opacity: 0; }
        }
        @keyframes yoyoShooting {
          0%,70%,100% { transform: translate3d(120px,-20px,0) rotate(-18deg); opacity: 0; }
          76% { opacity: .7; }
          88% { transform: translate3d(-220px,100px,0) rotate(-18deg); opacity: 0; }
        }
        @keyframes yoyoCopyIn {
          from { opacity: 0; transform: translate3d(-24px,14px,0); }
          to { opacity: 1; transform: translate3d(0,0,0); }
        }
        @keyframes yoyoPlannerIn {
          from { opacity: 0; transform: translate3d(28px,30px,0) scale(.97); }
          to { opacity: 1; transform: translate3d(0,0,0) scale(1); }
        }
        @keyframes yoyoPlannerFloat {
          0%,100% { transform: translate3d(0,0,0); }
          50% { transform: translate3d(0,-7px,0); }
        }
        @keyframes yoyoItemIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes yoyoMobileIn {
          from { opacity: 0; transform: translate3d(0,20px,0) scale(.98); }
          to { opacity: 1; transform: translate3d(0,0,0) scale(1); }
        }
        @keyframes yoyoMobileFloat {
          0%,100% { transform: translate3d(0,0,0); }
          50% { transform: translate3d(0,-6px,0); }
        }
        @keyframes yoyoMobileRoute {
          0% { transform: translate3d(0,0,0) scale(.7); opacity: 0; }
          12% { opacity: 1; }
          52% { transform: translate3d(112px,-14px,0) scale(1); opacity: 1; }
          88% { opacity: 1; }
          100% { transform: translate3d(220px,49px,0) scale(1.2); opacity: 0; }
        }
        @keyframes yoyoButtonShine {
          from { transform: translateX(0) skewX(-18deg); }
          to { transform: translateX(520%) skewX(-18deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .yoyo-aurora,
          .yoyo-visual-float,
          .yoyo-visual-glow,
          .yoyo-particle,
          .yoyo-shooting-light,
          .yoyo-copy,
          .yoyo-planner,
          .yoyo-planner-shell,
          .yoyo-benefit,
          .yoyo-mobile-visual,
          .yoyo-mobile-dot,
          .yoyo-button-shine {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}
