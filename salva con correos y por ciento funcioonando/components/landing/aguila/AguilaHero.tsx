"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Calculator, Check, Store } from "lucide-react";

import AguilaShowcase from "./AguilaShowcase";
import { STORE_URL, WHATSAPP_URL } from "./constants";
import { fraunces } from "./fonts";

const TRUST_ITEMS = ["Rastreo en tiempo real", "Recogida puerta a puerta", "Pago seguro en línea"];

export default function AguilaHero() {
  const quoteMessage = encodeURIComponent(
    "Hola, quiero cotizar un envío con Aguila Express USA. Quisiera confirmar tarifa y detalles."
  );

  return (
    <section className="relative overflow-hidden border-b border-[#0d1b30]/10 bg-[#f6f1e4]">
      <div className="pointer-events-none absolute -left-28 top-24 h-64 w-64 rounded-full border-[46px] border-[#d7a13f]/15 sm:h-80 sm:w-80 sm:border-[60px]" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-40 w-40 rounded-full bg-[#c31f2e]/[.06] blur-2xl sm:h-64 sm:w-64" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.08fr_.92fr] lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="min-w-0 max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#c31f2e]/20 bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.17em] text-[#c31f2e]">
            <span className="h-2 w-2 rounded-full bg-[#c31f2e]" /> Envíos puerta a puerta desde EE.UU.
          </div>

          <h1 className={`mt-7 max-w-full text-[clamp(2.6rem,10vw,4.4rem)] font-black leading-[.98] tracking-[-0.035em] text-[#0d1b30] sm:text-6xl lg:text-[5rem] ${fraunces.variable}`}>
            Cada caja que armas
            <span className="mt-1 block max-w-full font-[var(--font-fraunces)] italic font-medium text-[#c31f2e] [overflow-wrap:anywhere]">
              llega como si la llevaras tú.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base font-semibold leading-7 text-[#0d1b30]/60 sm:mt-7 sm:text-lg sm:leading-8">
            Paquetería, compras y envío de dinero para tu gente, estén donde estén. Arma, paga y sigue cada envío desde una sola plataforma.
          </p>

          <div className="mt-8 grid gap-3 sm:mt-9 sm:flex sm:flex-row">
            <Link
              href={STORE_URL}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#c31f2e] px-8 py-4 text-sm font-black text-white shadow-[0_18px_38px_rgba(195,31,46,.28)] transition hover:-translate-y-0.5 hover:bg-[#a91826]"
            >
              <Store size={19} />
              Ir a la tienda
              <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
            </Link>
            <a
              href={`${WHATSAPP_URL}?text=${quoteMessage}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#0d1b30]/15 bg-white/70 px-7 py-4 text-sm font-black text-[#0d1b30] transition hover:bg-white"
            >
              <Calculator size={19} />
              Cotizar mi envío
            </a>
          </div>

          <div className="mt-8 grid gap-3 text-sm font-extrabold text-[#0d1b30]/60 sm:mt-10 sm:flex sm:flex-wrap sm:gap-x-7 sm:gap-y-3">
            {TRUST_ITEMS.map((item) => (
              <span key={item} className="inline-flex items-center gap-2">
                <Check size={16} className="text-[#c31f2e]" />
                {item}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Signature element: a live animated showcase — flight routes leaving Miami to several
            unnamed destinations, then a stats scene with count-up numbers. More motion and
            presence than a static card, still just SVG/CSS animation under the hood. */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
        >
          <AguilaShowcase />
        </motion.div>
      </div>
    </section>
  );
}
