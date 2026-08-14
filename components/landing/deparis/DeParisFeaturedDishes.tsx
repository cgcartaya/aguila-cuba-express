"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export type FeaturedDish = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  venue_type: "bar" | "restaurant" | "general";
};

type Props = {
  dishes: FeaturedDish[];
  menuHref?: string;
};

/* Mismos 3 tonos que ya usan en DeParisMenuHighlights, para que esta
   sección se sienta parte de la misma familia visual. Se van rotando
   entre los platillos/bebidas. */
const TONES = ["dark", "orange", "cream"] as const;

const toneStyles: Record<(typeof TONES)[number], string> = {
  dark: "bg-[#1B1410] text-[#FFF4D6]",
  orange: "bg-[#FC6C26] text-[#1B1410]",
  cream: "bg-white text-[#1B1410] border border-[#1B1410]/10",
};

const overlayStyles: Record<(typeof TONES)[number], string> = {
  dark: "bg-gradient-to-t from-[#1B1410] via-[#1B1410]/80 to-[#1B1410]/35",
  orange: "bg-gradient-to-t from-[#FC6C26] via-[#FC6C26]/78 to-[#FC6C26]/30",
  cream: "bg-gradient-to-t from-white via-white/85 to-white/40",
};

function DishGrid({ items, menuHref }: { items: FeaturedDish[]; menuHref?: string }) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((dish, i) => {
        const tone = TONES[i % TONES.length];
        return (
          <motion.a
            key={dish.id}
            href={menuHref}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: (i % 3) * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
            className={`group relative flex min-h-[260px] flex-col justify-between overflow-hidden rounded-2xl p-7 shadow-[0_18px_40px_rgba(27,20,16,0.06)] transition-transform duration-300 hover:-translate-y-1.5 ${toneStyles[tone]}`}
          >
            {dish.image_url && (
              <div className="absolute inset-0">
                <Image
                  src={dish.image_url}
                  alt=""
                  fill
                  className="object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            )}
            <div className={`absolute inset-0 ${overlayStyles[tone]}`} />
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-current opacity-[0.06] transition-transform duration-500 group-hover:scale-125" />

            <span
              className="relative text-sm font-bold opacity-40"
              style={{ fontFamily: "var(--font-dp-display)" }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>

            <div className="relative">
              <h3
                className="text-xl leading-snug"
                style={{ fontFamily: "var(--font-dp-display)", fontWeight: 600 }}
              >
                {dish.name}
              </h3>
              {dish.description && (
                <p className="mt-2 text-sm leading-6 opacity-70">{dish.description}</p>
              )}
              <p
                className="mt-3 text-lg"
                style={{ fontFamily: "var(--font-dp-display)", fontWeight: 700 }}
              >
                ${dish.price.toFixed(2)}
              </p>
            </div>
          </motion.a>
        );
      })}
    </div>
  );
}

// Si el negocio no tiene módulo de menú activo, o no marcó ningún
// platillo/bebida como destacado todavía, esta sección no se muestra
// — nunca deja un hueco vacío en la landing. Si solo tiene destacados
// de un tipo (solo platos, o solo bebidas), muestra únicamente ese
// bloque en vez de dejar un título "Bebidas" vacío.
export default function DeParisFeaturedDishes({ dishes, menuHref }: Props) {
  if (!menuHref || dishes.length === 0) return null;

  const platos = dishes.filter((d) => d.venue_type !== "bar");
  const bebidas = dishes.filter((d) => d.venue_type === "bar");

  return (
    <section className="relative bg-[#FFF4D6] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#FC6C26]">
              Directo de nuestra cocina y barra
            </p>
            <h2
              className="mt-3 max-w-xl text-3xl leading-tight text-[#1B1410] sm:text-4xl"
              style={{ fontFamily: "var(--font-dp-display)", fontWeight: 600 }}
            >
              Lo mejor de la casa
            </h2>
          </div>
          <a
            href={menuHref}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1B1410]/80 transition hover:text-[#FC6C26]"
          >
            Ver menú completo <ArrowRight size={15} />
          </a>
        </div>

        {platos.length > 0 && (
          <div id="platos-destacados" className="mt-14 scroll-mt-24">
            <h3
              className="text-xl text-[#1B1410] sm:text-2xl"
              style={{ fontFamily: "var(--font-dp-display)", fontWeight: 600 }}
            >
              Platos principales
            </h3>
            <DishGrid items={platos} menuHref={menuHref} />
          </div>
        )}

        {bebidas.length > 0 && (
          <div id="bebidas-destacadas" className="mt-14 scroll-mt-24">
            <h3
              className="text-xl text-[#1B1410] sm:text-2xl"
              style={{ fontFamily: "var(--font-dp-display)", fontWeight: 600 }}
            >
              Bebidas principales
            </h3>
            <DishGrid items={bebidas} menuHref={`${menuHref}?tipo=bar`} />
          </div>
        )}
      </div>
    </section>
  );
}
