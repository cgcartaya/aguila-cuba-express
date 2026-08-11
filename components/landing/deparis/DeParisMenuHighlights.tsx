"use client";

import { useState } from "react";
import { motion } from "framer-motion";

/*
 * Cada categoría admite una foto opcional en `image` (SIN extensión).
 * El componente prueba automáticamente .jpg, .jpeg, .png y .webp, así
 * que no importa en qué formato la guardes. Si ningún archivo existe
 * todavía, la tarjeta simplemente muestra su color de fondo (no se
 * rompe ni aparece un ícono de "imagen rota").
 *
 * Guarda tus fotos (idealmente cuadradas o 4:3, tomadas por ustedes
 * mismos) en public/deparis/menu/ con estos nombres:
 *
 *   panaderia.(jpg|jpeg|png|webp)        -> "Panadería & Pastelería"
 *   quesos.(jpg|jpeg|png|webp)            -> "Quesos & Charcutería"
 *   vinos.(jpg|jpeg|png|webp)              -> "Vinos & Espumantes"
 *   bistro.(jpg|jpeg|png|webp)              -> "Platos del Bistró"
 *   desayuno.(jpg|jpeg|png|webp)          -> "Desayuno Francés"
 *   mercado-gourmet.(jpg|jpeg|png|webp) -> "Mercado Gourmet"
 *
 * Importante: el archivo tiene que estar dentro de la carpeta
 * public/ del proyecto (y desplegado), no subido desde un panel
 * aparte — Next.js sirve /public tal cual, sin base de datos de por
 * medio.
 */
const EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

function CategoryPhoto({ base }: { base: string }) {
  const [extIndex, setExtIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  if (failed || extIndex >= EXTENSIONS.length) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${base}.${EXTENSIONS[extIndex]}`}
      alt=""
      className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
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
const CATEGORIES = [
  {
    n: "01",
    name: "Panadería & Pastelería",
    desc: "Croissants, baguettes y viennoiserie horneada con técnica francesa.",
    tone: "dark",
    image: "/deparis/menu/panaderia",
  },
  {
    n: "02",
    name: "Quesos & Charcutería",
    desc: "Selección curada de quesos, embutidos y conservas importadas.",
    tone: "orange",
    image: "/deparis/menu/quesos",
  },
  {
    n: "03",
    name: "Vinos & Espumantes",
    desc: "Etiquetas francesas y del mundo para acompañar cada ocasión.",
    tone: "cream",
    image: "/deparis/menu/vinos",
  },
  {
    n: "04",
    name: "Platos del Bistró",
    desc: "Clásicos franceses con un toque propio, servidos en sala.",
    tone: "cream",
    image: "/deparis/menu/bistro",
  },
  {
    n: "05",
    name: "Desayuno Francés",
    desc: "Café, jugos y bollería recién horneada para empezar el día.",
    tone: "orange",
    image: "/deparis/menu/desayuno",
  },
  {
    n: "06",
    name: "Mercado Gourmet",
    desc: "Aceites, mermeladas, chocolates y despensa para llevar a casa.",
    tone: "dark",
    image: "/deparis/menu/mercado-gourmet",
  },
] as const;

/* Fondo sólido de respaldo (mientras no haya foto) + texto de cada tono. */
const toneStyles: Record<string, string> = {
  dark: "bg-[#1B1410] text-[#FFF4D6]",
  orange: "bg-[#FC6C26] text-[#1B1410]",
  cream: "bg-white text-[#1B1410] border border-[#1B1410]/10",
};

/* Velo de color sobre la foto para que la tarjeta conserve la paleta
   de marca en vez de verse como una foto de stock suelta. */
const overlayStyles: Record<string, string> = {
  dark: "bg-gradient-to-t from-[#1B1410] via-[#1B1410]/80 to-[#1B1410]/35",
  orange: "bg-gradient-to-t from-[#FC6C26] via-[#FC6C26]/78 to-[#FC6C26]/30",
  cream: "bg-gradient-to-t from-white via-white/85 to-white/40",
};

export default function DeParisMenuHighlights({ menuHref }: { menuHref?: string }) {
  return (
    <section id="menu" className="relative bg-[#FFF4D6] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#FC6C26]">
              La carta &amp; el mercado
            </p>
            <h2
              className="mt-3 max-w-xl text-3xl leading-tight text-[#1B1410] sm:text-4xl"
              style={{ fontFamily: "var(--font-dp-display)", fontWeight: 600 }}
            >
              Lo que vas a encontrar
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-[#1B1410]/60">
            Seis mundos, un mismo cuidado. Cada categoría está pensada tanto
            para tu mesa en el restaurante como para tu pedido en línea.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: (i % 3) * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
              className={`group relative flex min-h-[260px] flex-col justify-between overflow-hidden rounded-2xl p-7 shadow-[0_18px_40px_rgba(27,20,16,0.06)] transition-transform duration-300 hover:-translate-y-1.5 ${toneStyles[cat.tone]}`}
            >
              {/* Foto de fondo (si existe el archivo, en cualquiera de los formatos
                  soportados). Si no existe, no pasa nada raro: queda el color sólido. */}
              <CategoryPhoto base={cat.image} />
              {/* Velo de color de marca sobre la foto */}
              <div className={`absolute inset-0 ${overlayStyles[cat.tone]}`} />
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-current opacity-[0.06] transition-transform duration-500 group-hover:scale-125" />

              <span
                className="relative text-sm font-bold opacity-40"
                style={{ fontFamily: "var(--font-dp-display)" }}
              >
                {cat.n}
              </span>
              <div className="relative">
                <h3
                  className="text-xl leading-snug"
                  style={{ fontFamily: "var(--font-dp-display)", fontWeight: 600 }}
                >
                  {cat.name}
                </h3>
                <p className="mt-2 text-sm leading-6 opacity-70">{cat.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {menuHref && (
          <div className="mt-10 flex justify-center">
            <a
              href={menuHref}
              className="inline-flex items-center gap-2 rounded-full bg-[#1B1410] px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-[#FFF4D6] shadow-[0_18px_38px_rgba(27,20,16,0.2)] transition hover:-translate-y-1"
            >
              Ver menú completo y pedir en línea
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
