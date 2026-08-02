"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowUpRight, MessageCircle, ShoppingBag, UtensilsCrossed, Wine } from "lucide-react";

import { STORE_URL, WHATSAPP_URL } from "./constants";

const reveal: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.2, 0.8, 0.2, 1] } },
};

/*
 * Fotos de fondo opcionales para cada panel (SIN extensión, se prueba
 * .jpg / .jpeg / .png / .webp automáticamente). Si el archivo no
 * existe todavía, el panel se ve exactamente igual que antes, con su
 * color sólido — no se rompe nada.
 *
 * Guarda las fotos en:
 *   public/deparis/dual/bar-restaurante.(jpg|jpeg|png|webp)
 *   public/deparis/dual/mercado.(jpg|jpeg|png|webp)
 */
const EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

function PanelPhoto({ base }: { base: string }) {
  const [extIndex, setExtIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  if (failed || extIndex >= EXTENSIONS.length) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${base}.${EXTENSIONS[extIndex]}`}
      alt=""
      className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105"
      onError={() => {
        if (extIndex + 1 < EXTENSIONS.length) {
          setExtIndex((v) => v + 1);
        } else {
          setFailed(true);
        }
      }}
    />
  );
}

/* Cifra flotante tipo "sticker". Los valores son de ejemplo — cámbialos
   por los reales de De Paris. */
function FloatingStat({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone: "dark" | "orange";
}) {
  return (
    <div
      className={`dp-dw-float absolute right-6 top-6 z-10 rounded-2xl border px-4 py-3 text-center backdrop-blur-md sm:right-10 sm:top-10 ${
        tone === "dark"
          ? "border-white/15 bg-white/10 text-[#FFF4D6]"
          : "border-[#1B1410]/15 bg-[#1B1410]/10 text-[#1B1410]"
      }`}
    >
      <p
        className="text-2xl leading-none"
        style={{ fontFamily: "var(--font-dp-display)", fontWeight: 700 }}
      >
        {value}
      </p>
      <p className="mt-1 max-w-[6.5rem] text-[10px] font-bold uppercase leading-tight tracking-wide opacity-70">
        {label}
      </p>
    </div>
  );
}

export default function DeParisDualWorlds() {
  return (
    <section className="relative bg-[#FFF4D6]">
      <div className="mx-auto max-w-7xl px-5 pb-4 pt-16 text-center sm:px-8 sm:pt-24">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#FC6C26]">
          Dos negocios, una misma casa
        </p>
        <h2
          className="mx-auto mt-3 max-w-2xl text-3xl leading-tight text-[#1B1410] sm:text-4xl"
          style={{ fontFamily: "var(--font-dp-display)", fontWeight: 600 }}
        >
          Elige cómo vivir De Paris hoy
        </h2>
      </div>

      <div className="mt-10 grid overflow-hidden sm:mt-14 lg:grid-cols-2">
        {/* Bar & Restaurante */}
        <motion.div
          id="bar-restaurante"
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="group relative flex min-h-[440px] flex-col justify-between overflow-hidden bg-[#1B1410] px-8 py-12 text-[#FFF4D6] sm:px-12 lg:px-14"
        >
          <PanelPhoto base="/deparis/dual/bar-restaurante" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1B1410] via-[#1B1410]/88 to-[#1B1410]/50" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,244,214,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,244,214,.6)_1px,transparent_1px)] [background-size:38px_38px]" />
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#FC6C26]/20 blur-[90px] transition-all duration-500 group-hover:scale-125" />

          <FloatingStat value="+30" label="Platos & cocteles" tone="dark" />

          <div className="relative z-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#C89B3C]/50 bg-white/5">
              <Wine size={22} className="text-[#C89B3C]" />
            </div>
            <h3
              className="mt-6 text-3xl sm:text-4xl"
              style={{ fontFamily: "var(--font-dp-display)", fontWeight: 600 }}
            >
              Bar &amp; Restaurante
            </h3>
            <p className="mt-4 max-w-md text-sm leading-7 text-[#FFF4D6]/70">
              Una carta de inspiración francesa, coctelería de autor y un
              ambiente para sobremesas largas. Ideal para cenas, brindis y
              encuentros entre amigos.
            </p>
          </div>

          <div className="relative z-10 mt-10 flex items-center gap-4">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#FC6C26] px-6 py-3.5 text-sm font-bold text-[#1B1410] transition hover:-translate-y-0.5 hover:bg-[#ff7d3d]"
            >
              <MessageCircle size={17} />
              Reservar una mesa
            </a>
            <a
              href="#menu"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-[#FFF4D6]/80 transition hover:text-[#FFF4D6]"
            >
              Ver el menú <ArrowUpRight size={15} />
            </a>
          </div>
        </motion.div>

        {/* Mercado */}
        <motion.div
          id="mercado"
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="group relative flex min-h-[440px] flex-col justify-between overflow-hidden bg-[#FC6C26] px-8 py-12 text-[#1B1410] sm:px-12 lg:px-14"
        >
          <PanelPhoto base="/deparis/dual/mercado" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#FC6C26] via-[#FC6C26]/85 to-[#FC6C26]/45" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(#1B1410_1px,transparent_1px),linear-gradient(90deg,#1B1410_1px,transparent_1px)] [background-size:38px_38px]" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-white/25 blur-[90px] transition-all duration-500 group-hover:scale-125" />

          <FloatingStat value="+150" label="Productos en el mercado" tone="orange" />

          <div className="relative z-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#1B1410]/20 bg-white/25">
              <ShoppingBag size={22} className="text-[#1B1410]" />
            </div>
            <h3
              className="mt-6 text-3xl sm:text-4xl"
              style={{ fontFamily: "var(--font-dp-display)", fontWeight: 600 }}
            >
              Mercado Online
            </h3>
            <p className="mt-4 max-w-md text-sm leading-7 text-[#1B1410]/75">
              Panadería, quesos, vinos y productos importados listos para
              pedir desde tu celular, con delivery en Cienfuegos o retiro en
              tienda.
            </p>
          </div>

          <div className="relative z-10 mt-10 flex items-center gap-4">
            <Link
              href={STORE_URL}
              className="inline-flex items-center gap-2 rounded-full bg-[#1B1410] px-6 py-3.5 text-sm font-bold text-[#FFF4D6] transition hover:-translate-y-0.5 hover:bg-black"
            >
              <UtensilsCrossed size={17} />
              Ir a la tienda online
            </Link>
            <Link
              href={STORE_URL}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1B1410]/80 transition hover:text-[#1B1410]"
            >
              Ver productos <ArrowUpRight size={15} />
            </Link>
          </div>
        </motion.div>
      </div>

      <style>{`
        .dp-dw-float { animation: dpDwFloat 5s ease-in-out infinite; }
        @keyframes dpDwFloat {
          0%,100% { transform: translate3d(0,0,0) rotate(-2deg); }
          50% { transform: translate3d(0,-8px,0) rotate(2deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .dp-dw-float { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
