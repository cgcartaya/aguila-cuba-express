"use client";

import { motion } from "framer-motion";

/*
 * Cada categoría admite una foto opcional en `image`. Si el archivo no
 * existe todavía, la tarjeta simplemente muestra su color de fondo (no
 * se rompe ni aparece un ícono de "imagen rota").
 *
 * Para activar las fotos, guarda tus imágenes (idealmente cuadradas o
 * 4:3, tomadas por ustedes mismos — se ven mucho más reales que un
 * stock genérico) en:
 *
 *   public/deparis/menu/panaderia.jpg
 *   public/deparis/menu/quesos.jpg
 *   public/deparis/menu/vinos.jpg
 *   public/deparis/menu/bistro.jpg
 *   public/deparis/menu/desayuno.jpg
 *   public/deparis/menu/mercado-gourmet.jpg
 *
 * con esos mismos nombres, y listo — no hay que tocar más código.
 */
const CATEGORIES = [
  {
    n: "01",
    name: "Panadería & Pastelería",
    desc: "Croissants, baguettes y viennoiserie horneada con técnica francesa.",
    tone: "dark",
    image: "/deparis/menu/panaderia.jpg",
  },
  {
    n: "02",
    name: "Quesos & Charcutería",
    desc: "Selección curada de quesos, embutidos y conservas importadas.",
    tone: "orange",
    image: "/deparis/menu/quesos.jpg",
  },
  {
    n: "03",
    name: "Vinos & Espumantes",
    desc: "Etiquetas francesas y del mundo para acompañar cada ocasión.",
    tone: "cream",
    image: "/deparis/menu/vinos.jpg",
  },
  {
    n: "04",
    name: "Platos del Bistró",
    desc: "Clásicos franceses con un toque propio, servidos en sala.",
    tone: "cream",
    image: "/deparis/menu/bistro.jpg",
  },
  {
    n: "05",
    name: "Desayuno Francés",
    desc: "Café, jugos y bollería recién horneada para empezar el día.",
    tone: "orange",
    image: "/deparis/menu/desayuno.jpg",
  },
  {
    n: "06",
    name: "Mercado Gourmet",
    desc: "Aceites, mermeladas, chocolates y despensa para llevar a casa.",
    tone: "dark",
    image: "/deparis/menu/mercado-gourmet.jpg",
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

export default function DeParisMenuHighlights() {
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
              {/* Foto de fondo (si existe el archivo). Si no existe, no pasa nada raro:
                  el navegador simplemente no pinta nada y queda el color sólido de arriba. */}
              <div
                className="absolute inset-0 bg-cover bg-center opacity-90 transition-transform duration-500 group-hover:scale-105"
                style={{ backgroundImage: `url(${cat.image})` }}
              />
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
      </div>
    </section>
  );
}
