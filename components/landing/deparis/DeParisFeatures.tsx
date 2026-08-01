"use client";

import { motion } from "framer-motion";
import { Clock, Sparkles, Truck, Wine } from "lucide-react";

const VALUES = [
  {
    icon: Truck,
    title: "Delivery en Miami",
    desc: "Pide desde la tienda online y recibe en tu casa u oficina.",
  },
  {
    icon: Sparkles,
    title: "Productos importados",
    desc: "Curaduría directa de Francia y proveedores gourmet selectos.",
  },
  {
    icon: Wine,
    title: "Ambiente de bistró",
    desc: "Coctelería y cocina francesa pensadas para quedarse un rato.",
  },
  {
    icon: Clock,
    title: "Abierto toda la semana",
    desc: "Horario extendido para almuerzo, cena y sobremesa.",
  },
] as const;

export default function DeParisFeatures() {
  return (
    <section className="relative bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="divide-y divide-[#1B1410]/10 border-y border-[#1B1410]/10">
          {VALUES.map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.55, delay: i * 0.06 }}
              className="flex flex-col items-start gap-4 py-7 sm:flex-row sm:items-center sm:gap-8"
            >
              <span
                className="text-sm text-[#FC6C26]"
                style={{ fontFamily: "var(--font-dp-display)", fontWeight: 700 }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <v.icon size={22} className="shrink-0 text-[#1B1410]" />
              <div className="sm:flex sm:flex-1 sm:items-baseline sm:justify-between sm:gap-6">
                <h3
                  className="text-lg text-[#1B1410]"
                  style={{ fontFamily: "var(--font-dp-display)", fontWeight: 600 }}
                >
                  {v.title}
                </h3>
                <p className="mt-1 max-w-md text-sm leading-6 text-[#1B1410]/60 sm:mt-0 sm:text-right">
                  {v.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.blockquote
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7 }}
          className="mx-auto mt-16 max-w-2xl text-center"
        >
          <p
            className="text-2xl leading-snug text-[#1B1410] sm:text-3xl"
            style={{ fontFamily: "var(--font-dp-display)", fontStyle: "italic", fontWeight: 500 }}
          >
            &ldquo;Se siente como una escapada a París sin salir de Miami.&rdquo;
          </p>
          <footer className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-[#1B1410]/45">
            Reseña de un cliente — De Paris
          </footer>
        </motion.blockquote>
      </div>
    </section>
  );
}
