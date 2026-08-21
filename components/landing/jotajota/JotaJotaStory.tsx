"use client";

import { motion } from "framer-motion";
import { Flame, Wheat, Clock3 } from "lucide-react";

import CountUp from "@/components/ui/CountUp";

const STATS = [
  { icon: Flame, value: 485, suffix: "°C", label: "en el corazón del horno de leña" },
  { icon: Clock3, value: 90, suffix: "s", label: "tarda en cocinarse cada pizza" },
  { icon: Wheat, value: 48, suffix: "h", label: "de fermentación lenta de la masa" },
];

export default function JotaJotaStory() {
  return (
    <section id="horno" className="relative overflow-hidden bg-[#141210] py-20 sm:py-28">
      {/* Corte diagonal superior, mismo gesto que separa el logo en dos */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-16 bg-[#0B0A08]"
        style={{ clipPath: "polygon(0 0, 100% 0, 100% 30%, 0 100%)" }}
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7 }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#FEBB1B]">Nuestro horno, nuestra regla</p>
          <h2
            className="mt-3 max-w-md text-4xl leading-[1.05] text-white sm:text-5xl"
            style={{ fontFamily: "var(--font-jj-display)" }}
          >
            Napolitana de verdad no se improvisa.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-7 text-white/55">
            Cada pizza sale del horno de leña en menos de dos minutos,
            con el borde hinchado, ligero y ahumado que solo da el
            fuego real. Nada de atajos: masa madre, tiempo y una
            receta que no negociamos.
          </p>
          <p
            className="mt-6 text-2xl text-[#FEBB1B]"
            style={{ fontFamily: "var(--font-jj-note)" }}
          >
            &ldquo;Se pide una... y siempre se pide otra.&rdquo;
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1"
        >
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FEBB1B]/10 text-[#FEBB1B]">
                <stat.icon size={20} />
              </span>
              <div>
                <p className="text-2xl font-black text-white" style={{ fontFamily: "var(--font-jj-display)" }}>
                  <CountUp end={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-xs font-semibold leading-snug text-white/45">{stat.label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
