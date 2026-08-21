"use client";

import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, CalendarCheck2, UtensilsCrossed } from "lucide-react";

import JotaJotaMarquee from "./JotaJotaMarquee";
import RevealText from "@/components/ui/RevealText";
import { MENU_URL, RESERVAS_URL } from "./constants";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.12, ease: [0.2, 0.8, 0.2, 1] },
  }),
};

export default function JotaJotaHero({
  menuHref = MENU_URL,
  reservasHref = RESERVAS_URL,
}: {
  menuHref?: string;
  reservasHref?: string;
}) {
  return (
    <section
      id="inicio"
      className="relative isolate overflow-hidden bg-[#0B0A08] pb-8 pt-14 sm:pb-12 sm:pt-16"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex select-none flex-col justify-center overflow-hidden opacity-[0.07]"
        style={{ fontFamily: "var(--font-jj-display)" }}
      >
        <span className="-mb-6 block translate-x-[-4%] whitespace-nowrap text-[22vw] leading-none text-white sm:text-[16vw]">
          JOTA JOTA
        </span>
        <span className="block translate-x-[6%] whitespace-nowrap text-[22vw] leading-none text-[#FEBB1B] sm:text-[16vw]">
          JOTA JOTA
        </span>
      </div>

      <div className="jj-ember pointer-events-none absolute -right-32 top-10 h-[420px] w-[420px] rounded-full bg-[#FEBB1B]/25 blur-[110px]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0B0A08] to-transparent" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        <div>
          <motion.div
            variants={fadeUp}
            custom={0}
            initial="hidden"
            animate="show"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/80 backdrop-blur-sm"
          >
            <UtensilsCrossed size={13} className="text-[#FEBB1B]" />
            Cienfuegos · Snack Bar &amp; cocina
          </motion.div>

          <h1
            className="mt-6 text-[11vw] leading-[0.96] tracking-tight text-white sm:text-5xl lg:text-[3.6rem]"
            style={{ fontFamily: "var(--font-jj-display)" }}
          >
            <RevealText text="CUANDO PARECE QUE NO PUEDES MÁS" startDelay={0.15} />
            <RevealText
              text="LLEGA EL POSTRE Y TE LO COMES."
              startDelay={0.55}
              className="mt-1 block text-[#FEBB1B]"
            />
          </h1>

          <motion.p
            variants={fadeUp}
            custom={2}
            initial="hidden"
            animate="show"
            className="mt-6 max-w-lg text-base leading-7 text-white/60 sm:text-lg"
          >
            Una carta para compartir, picar, cenar o cerrar la noche con algo dulce.
            Pizzas, pastas, aperitivos, bebidas, cocteles y postres en un solo lugar.
          </motion.p>

          <motion.div
            variants={fadeUp}
            custom={3}
            initial="hidden"
            animate="show"
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
          >
            <a
              href={menuHref || "#pizzas"}
              className="jj-shine group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-[#FEBB1B] px-7 py-4 text-sm font-black uppercase tracking-wide text-[#0B0A08] shadow-[0_18px_38px_rgba(254,187,27,0.28)] transition duration-300 hover:-translate-y-1"
            >
              Ver la carta
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </a>

            <a
              href={reservasHref}
              className="group inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-7 py-4 text-sm font-bold text-white backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white/[0.08]"
            >
              <CalendarCheck2 size={18} className="text-[#FEBB1B]" />
              Reservar mesa
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotate: 4 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          className="relative mx-auto flex aspect-square w-full max-w-[380px] items-center justify-center"
        >
          <div className="jj-orbit absolute inset-0 rounded-full border border-dashed border-[#FEBB1B]/30" />
          <div className="jj-float relative flex h-[84%] w-[84%] items-center justify-center overflow-hidden rounded-full bg-[#141210] shadow-[0_40px_90px_rgba(0,0,0,0.55)] ring-2 ring-[#FEBB1B]/40">
            <Image
              src="/jotajota/logo.webp"
              alt="Jota Jota"
              fill
              priority
              sizes="420px"
              className="object-cover"
            />
          </div>
          <span className="jj-dot absolute right-[8%] top-[16%] h-3 w-3 rounded-full bg-[#FEBB1B] shadow-[0_0_18px_rgba(254,187,27,0.8)]" />
        </motion.div>
      </div>

      <div className="mt-10 sm:mt-12">
        <JotaJotaMarquee />
      </div>

      <style>{`
        .jj-ember { animation: jjEmberFloat 8s ease-in-out infinite; }
        .jj-orbit { animation: jjSpin 44s linear infinite; }
        .jj-float { animation: jjFloat 6s ease-in-out infinite; }
        .jj-dot { animation: jjPulse 3s ease-in-out infinite; }
        .jj-shine::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,.45) 48%, transparent 62%);
          background-size: 220% 220%;
          background-position: 130% 0;
          transition: background-position .6s ease;
        }
        .jj-shine:hover::after { background-position: -30% 0; }
        @keyframes jjEmberFloat {
          0%,100% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(-2%,3%,0) scale(1.08); }
        }
        @keyframes jjSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes jjFloat {
          0%,100% { transform: translate3d(0,0,0); }
          50% { transform: translate3d(0,-10px,0); }
        }
        @keyframes jjPulse {
          0%,100% { opacity: .5; transform: scale(.85); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @media (prefers-reduced-motion: reduce) {
          .jj-ember, .jj-orbit, .jj-float, .jj-dot { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
