"use client";

import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, BookOpen, MessageCircle, ShoppingBag } from "lucide-react";

import DeParisMarquee from "./DeParisMarquee";
import { STORE_URL, WHATSAPP_URL } from "./constants";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.12, ease: [0.2, 0.8, 0.2, 1] },
  }),
};

const stats = [
  ["2", "experiencias en un solo lugar"],
  ["100%", "curado con acento francés"],
  ["Cienfuegos", "delivery y retiro en tienda"],
] as const;

export default function DeParisHero({ menuHref }: { menuHref?: string }) {
  return (
    <section
      id="inicio"
      className="relative isolate overflow-hidden bg-[#FFF4D6] pb-16 pt-14 sm:pb-24 sm:pt-20"
    >
      {/* textura + resplandores de fondo, muy livianos (solo CSS) */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:radial-gradient(#1B1410_1px,transparent_1px)] [background-size:22px_22px]" />
      <div className="dp-hero-glow pointer-events-none absolute -left-24 top-0 h-[420px] w-[420px] rounded-full bg-[#FC6C26]/25 blur-[100px]" />
      <div className="dp-hero-glow-2 pointer-events-none absolute -right-16 bottom-0 h-[360px] w-[360px] rounded-full bg-[#C89B3C]/25 blur-[100px]" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        {/* Columna de texto */}
        <div>
          <motion.div
            variants={fadeUp}
            custom={0}
            initial="hidden"
            animate="show"
            className="inline-flex items-center gap-2 rounded-full border border-[#1B1410]/15 bg-white/50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#1B1410]/80 backdrop-blur-sm"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#FC6C26]" />
            Cienfuegos, Cuba · Mercado &amp; Bistró francés
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={1}
            initial="hidden"
            animate="show"
            className="mt-6 text-5xl leading-[1.02] tracking-tight text-[#1B1410] sm:text-6xl lg:text-[4.4rem]"
            style={{ fontFamily: "var(--font-dp-display)", fontWeight: 600 }}
          >
            Un pedazo de París,
            <span
              className="mt-1 block text-[#FC6C26]"
              style={{ fontFamily: "var(--font-dp-script)", fontWeight: 400 }}
            >
              en cada visita.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={2}
            initial="hidden"
            animate="show"
            className="mt-6 max-w-lg text-base leading-7 text-[#1B1410]/75 sm:text-lg"
          >
            De Paris reúne un bar restaurante de sobremesa larga y un mercado
            con productos franceses e importados, para que elijas si quieres
            sentarte a la mesa o llevarte París a tu casa.
          </motion.p>

          <motion.div
            variants={fadeUp}
            custom={3}
            initial="hidden"
            animate="show"
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <a
              href={menuHref || "#menu"}
              className="dp-shine group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-[#1B1410] px-7 py-4 text-sm font-bold text-[#FFF4D6] shadow-[0_18px_38px_rgba(27,20,16,0.25)] transition duration-300 hover:-translate-y-1"
            >
              <BookOpen size={18} />
              {menuHref ? "Ver la carta y pedir" : "Descubrir la carta"}
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href={STORE_URL}
              className="group inline-flex items-center justify-center gap-2 rounded-full border border-[#1B1410]/20 bg-white/70 px-7 py-4 text-sm font-bold text-[#1B1410] backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white"
            >
              <ShoppingBag size={18} className="text-[#FC6C26]" />
              Explorar el mercado
            </a>
          </motion.div>

          <motion.a
            variants={fadeUp}
            custom={4}
            initial="hidden"
            animate="show"
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#1B1410]/60 transition hover:text-[#FC6C26]"
          >
            <MessageCircle size={16} /> ¿Prefieres reservar? Escríbenos por WhatsApp
          </motion.a>

          <motion.div
            variants={fadeUp}
            custom={5}
            initial="hidden"
            animate="show"
            className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-[#1B1410]/10 pt-6"
          >
            {stats.map(([value, label], i) => (
              <div key={label} className="flex items-center gap-4">
                <div>
                  <p
                    className="text-2xl text-[#1B1410]"
                    style={{ fontFamily: "var(--font-dp-display)", fontWeight: 700 }}
                  >
                    {value}
                  </p>
                  <p className="max-w-[9rem] text-[11px] font-semibold uppercase tracking-wide text-[#1B1410]/55">
                    {label}
                  </p>
                </div>
                {i < stats.length - 1 && (
                  <span className="hidden h-9 w-px bg-[#1B1410]/15 sm:block" />
                )}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Medallón con el logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotate: -4 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          style={{ perspective: "1200px" }}
          className="relative mx-auto flex aspect-square w-full max-w-[440px] items-center justify-center"
        >
          <div className="dp-orbit absolute inset-0 rounded-full border border-dashed border-[#C89B3C]/50" />
          <div className="dp-orbit-2 absolute inset-6 rounded-full border border-[#1B1410]/10" />

          <div className="dp-float relative flex h-[78%] w-[78%] items-center justify-center rounded-full bg-gradient-to-b from-white to-[#FFF4D6] p-3 shadow-[0_40px_80px_rgba(27,20,16,0.18)] ring-1 ring-[#1B1410]/5">
            <div className="dp-medallion-shine absolute inset-0 rounded-full" />
            <div
              className="dp-coin relative flex h-full w-full items-center justify-center rounded-full border-[3px] border-[#C89B3C]/70 bg-white p-6"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="relative h-full w-full">
                <Image
                  src="/deparis/logo.png"
                  alt="De Paris — Mercado"
                  fill
                  priority
                  sizes="440px"
                  className="object-contain"
                />
              </div>
            </div>
          </div>

          <span className="dp-dot absolute right-[6%] top-[14%] h-3 w-3 rounded-full bg-[#FC6C26] shadow-[0_0_18px_rgba(252,108,38,0.8)]" />
          <span className="dp-dot-2 absolute bottom-[10%] left-[8%] h-2 w-2 rounded-full bg-[#C89B3C] shadow-[0_0_14px_rgba(200,155,60,0.8)]" />
        </motion.div>
      </div>

      <div className="mt-14 sm:mt-20">
        <DeParisMarquee />
      </div>

      <style>{`
        .dp-hero-glow { animation: dpGlowFloat 9s ease-in-out infinite; }
        .dp-hero-glow-2 { animation: dpGlowFloat 11s 1s ease-in-out infinite reverse; }
        .dp-orbit { animation: dpSpin 40s linear infinite; }
        .dp-orbit-2 { animation: dpSpin 60s linear infinite reverse; }
        .dp-float { animation: dpFloat 6.5s ease-in-out infinite; }
        .dp-coin { animation: dpCoinSpin 5.5s cubic-bezier(0.45,0,0.2,1) infinite; }
        .dp-dot { animation: dpPulse 3.2s ease-in-out infinite; }
        .dp-dot-2 { animation: dpPulse 3.6s 0.4s ease-in-out infinite; }
        .dp-medallion-shine {
          background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,.55) 48%, transparent 62%);
          background-size: 220% 220%;
          animation: dpShineSweep 5.5s ease-in-out infinite;
        }
        .dp-shine::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,.18) 48%, transparent 62%);
          background-size: 220% 220%;
          background-position: 130% 0;
          transition: background-position .6s ease;
        }
        .dp-shine:hover::after { background-position: -30% 0; }
        @keyframes dpGlowFloat {
          0%,100% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(2%,-3%,0) scale(1.08); }
        }
        @keyframes dpSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes dpFloat {
          0%,100% { transform: translate3d(0,0,0); }
          50% { transform: translate3d(0,-10px,0); }
        }
        @keyframes dpCoinSpin {
          0%, 68% { transform: rotateY(0deg); }
          85% { transform: rotateY(360deg); }
          100% { transform: rotateY(360deg); }
        }
        @keyframes dpPulse {
          0%,100% { opacity: .5; transform: scale(.85); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes dpShineSweep {
          0%,100% { background-position: 0% 0%; opacity: 0; }
          45% { opacity: 1; }
          55% { background-position: 100% 100%; opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .dp-hero-glow, .dp-hero-glow-2, .dp-orbit, .dp-orbit-2, .dp-float, .dp-dot, .dp-dot-2, .dp-medallion-shine, .dp-coin {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}
