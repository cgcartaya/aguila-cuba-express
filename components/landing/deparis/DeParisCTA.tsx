"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, ExternalLink, MapPin, MessageCircle, Phone, ShoppingBag } from "lucide-react";

import {
  HOURS,
  MARKET_ADDRESS_LINE_1,
  MARKET_ADDRESS_LINE_2,
  MARKET_MAPS_URL,
  PHONE_DISPLAY,
  RESTAURANT_ADDRESS_LINE_1,
  RESTAURANT_ADDRESS_LINE_2,
  RESTAURANT_MAPS_URL,
  STORE_URL,
  WHATSAPP_URL,
} from "./constants";

export default function DeParisCTA() {
  return (
    <section id="contacto" className="relative overflow-hidden bg-[#1B1410] py-20 text-[#FFF4D6] sm:py-28">
      <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:radial-gradient(#FFF4D6_1px,transparent_1px)] [background-size:26px_26px]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[520px] -translate-x-1/2 rounded-full bg-[#FC6C26]/20 blur-[120px]" />

      <div className="relative mx-auto grid max-w-6xl gap-14 px-5 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7 }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#FC6C26]">
            Ven o pide desde donde estés
          </p>
          <h2
            className="mt-3 max-w-md text-4xl leading-[1.05] sm:text-5xl"
            style={{ fontFamily: "var(--font-dp-display)", fontWeight: 600 }}
          >
            Te esperamos en la mesa o en tu puerta.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-7 text-[#FFF4D6]/65">
            Reserva tu lugar en el restaurante o arma tu pedido en la tienda,
            en minutos. Ambas experiencias, a un mensaje de distancia.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#FC6C26] px-7 py-4 text-sm font-bold text-[#1B1410] transition hover:-translate-y-1 hover:bg-[#ff7d3d]"
            >
              <MessageCircle size={18} /> Escribir por WhatsApp
            </a>
            <Link
              href={STORE_URL}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#FFF4D6]/25 bg-white/5 px-7 py-4 text-sm font-bold backdrop-blur transition hover:-translate-y-1 hover:bg-white/10"
            >
              <ShoppingBag size={18} /> Comprar en la tienda
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="rounded-3xl border border-[#FFF4D6]/12 bg-white/5 p-8 backdrop-blur"
        >
          <div className="flex items-start gap-4">
            <MapPin size={20} className="mt-1 shrink-0 text-[#FC6C26]" />
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-[#FFF4D6]/50">
                Bar &amp; Restaurante
              </p>
              <a
                href={RESTAURANT_MAPS_URL}
                target="_blank"
                rel="noreferrer"
                className="group mt-1 flex items-start gap-1.5 text-base leading-6 text-[#FFF4D6] transition hover:text-[#FC6C26]"
              >
                <span className="underline decoration-[#FFF4D6]/25 decoration-1 underline-offset-4 group-hover:decoration-[#FC6C26]">
                  {RESTAURANT_ADDRESS_LINE_1}
                  <br />
                  {RESTAURANT_ADDRESS_LINE_2}
                </span>
                <ExternalLink size={13} className="mt-1 shrink-0 opacity-50 group-hover:opacity-100" />
              </a>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#FFF4D6]/35">
                Abrir en Google Maps
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-4 border-t border-[#FFF4D6]/10 pt-6">
            <MapPin size={20} className="mt-1 shrink-0 text-[#FC6C26]" />
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-[#FFF4D6]/50">
                Tienda
              </p>
              <a
                href={MARKET_MAPS_URL}
                target="_blank"
                rel="noreferrer"
                className="group mt-1 flex items-start gap-1.5 text-base leading-6 text-[#FFF4D6] transition hover:text-[#FC6C26]"
              >
                <span className="underline decoration-[#FFF4D6]/25 decoration-1 underline-offset-4 group-hover:decoration-[#FC6C26]">
                  {MARKET_ADDRESS_LINE_1}
                  <br />
                  {MARKET_ADDRESS_LINE_2}
                </span>
                <ExternalLink size={13} className="mt-1 shrink-0 opacity-50 group-hover:opacity-100" />
              </a>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#FFF4D6]/35">
                Abrir en Google Maps
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-4 border-t border-[#FFF4D6]/10 pt-6">
            <Phone size={20} className="mt-1 shrink-0 text-[#FC6C26]" />
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-[#FFF4D6]/50">
                Teléfono
              </p>
              <p className="mt-1 text-base text-[#FFF4D6]">{PHONE_DISPLAY}</p>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-4 border-t border-[#FFF4D6]/10 pt-6">
            <Clock size={20} className="mt-1 shrink-0 text-[#FC6C26]" />
            <div className="w-full">
              <p className="text-sm font-bold uppercase tracking-wide text-[#FFF4D6]/50">
                Horario
              </p>
              <ul className="mt-2 space-y-1.5">
                {HOURS.map((h) => (
                  <li key={h.day} className="flex items-center justify-between text-sm text-[#FFF4D6]/80">
                    <span>{h.day}</span>
                    <span className="text-[#FFF4D6]/55">{h.time}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
