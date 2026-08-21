"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  CalendarCheck2,
  Clock,
  ExternalLink,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";

import {
  ADDRESS_LINE_1,
  ADDRESS_LINE_2,
  HOURS,
  MAPS_URL,
  PHONE_DISPLAY,
  PHONE_URL,
  RESERVAS_URL,
  WHATSAPP_DISPLAY,
  WHATSAPP_URL,
} from "./constants";

export default function JotaJotaCTA({
  reservasHref = RESERVAS_URL,
}: {
  reservasHref?: string;
}) {
  return (
    <section
      id="reservas"
      className="relative overflow-hidden bg-[#0B0A08] py-20 text-white sm:py-28"
    >
      <div id="contacto" className="absolute" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:radial-gradient(#FEBB1B_1px,transparent_1px)] [background-size:26px_26px]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[520px] -translate-x-1/2 rounded-full bg-[#FEBB1B]/15 blur-[120px]" />

      <div className="relative mx-auto grid max-w-6xl gap-14 px-5 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7 }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#FEBB1B]">
            Guárdate una mesa
          </p>
          <h2
            className="mt-3 max-w-md text-4xl leading-[1.05] sm:text-5xl"
            style={{ fontFamily: "var(--font-jj-display)" }}
          >
            Reserva tu mesa y disfruta Jota Jota.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-7 text-white/55">
            Elige día, hora y mesa en segundos con nuestro sistema de reservas,
            o escríbenos directamente por WhatsApp si prefieres coordinar por mensaje.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={reservasHref}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#FEBB1B] px-7 py-4 text-sm font-black text-[#0B0A08] transition hover:-translate-y-1 hover:bg-[#ffc843]"
            >
              <CalendarCheck2 size={18} /> Reservar mesa
            </Link>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-7 py-4 text-sm font-bold backdrop-blur transition hover:-translate-y-1 hover:bg-white/[0.08]"
            >
              <MessageCircle size={18} /> Escribir por WhatsApp
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur"
        >
          <div className="flex items-start gap-4">
            <MapPin size={20} className="mt-1 shrink-0 text-[#FEBB1B]" />
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-white/45">
                Dirección
              </p>
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noreferrer"
                className="group mt-1 flex items-start gap-1.5 text-base leading-6 text-white transition hover:text-[#FEBB1B]"
              >
                <span className="underline decoration-white/25 decoration-1 underline-offset-4 group-hover:decoration-[#FEBB1B]">
                  {ADDRESS_LINE_1}
                  <br />
                  {ADDRESS_LINE_2}
                </span>
                <ExternalLink
                  size={13}
                  className="mt-1 shrink-0 opacity-50 group-hover:opacity-100"
                />
              </a>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-white/30">
                Abrir en Google Maps
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-4 border-t border-white/10 pt-6">
            <Phone size={20} className="mt-1 shrink-0 text-[#FEBB1B]" />
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-white/45">
                Contacto
              </p>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block text-base text-white transition hover:text-[#FEBB1B]"
              >
                WhatsApp: {WHATSAPP_DISPLAY}
              </a>
              <a
                href={PHONE_URL}
                className="mt-1 block text-base text-white transition hover:text-[#FEBB1B]"
              >
                Teléfono: {PHONE_DISPLAY}
              </a>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-4 border-t border-white/10 pt-6">
            <Clock size={20} className="mt-1 shrink-0 text-[#FEBB1B]" />
            <div className="w-full">
              <p className="text-sm font-bold uppercase tracking-wide text-white/45">
                Horario
              </p>
              <ul className="mt-2 space-y-1.5">
                {HOURS.map((h) => (
                  <li
                    key={h.day}
                    className="flex items-center justify-between text-sm text-white/75"
                  >
                    <span>{h.day}</span>
                    <span className="text-white/45">{h.time}</span>
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
