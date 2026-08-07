"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Calculator, MessageCircle, Search } from "lucide-react";

import { RATE_PER_LB, TRACKING_STAGES, TRACKING_URL, WHATSAPP_URL } from "./constants";

export default function AguilaQuoteTracking() {
  const [trackingCode, setTrackingCode] = useState("");
  const [weight, setWeight] = useState("10");

  const estimatedTotal = useMemo(() => {
    const pounds = Math.max(0, Number(weight) || 0);
    return pounds * RATE_PER_LB;
  }, [weight]);

  const quoteMessage = encodeURIComponent(
    `Hola, quiero cotizar un envío con Aguila Express USA.\n\nPeso aproximado: ${weight || "0"} lb\nEstimado mostrado: $${estimatedTotal.toFixed(2)}\n\nQuisiera confirmar la tarifa y los detalles.`
  );

  return (
    <section id="cotizar" className="bg-[#f6f1e4] py-20">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-6 lg:grid-cols-[.92fr_1.08fr]">
        <div className="rounded-[2.5rem] bg-[#c31f2e] p-7 text-white shadow-xl md:p-10">
          <p className="text-xs font-black uppercase tracking-[.2em] text-white/70">Cotización rápida</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight">Calcula una referencia.</h2>
          <p className="mt-4 max-w-xl font-semibold leading-7 text-white/75">
            Introduce el peso aproximado y confirma la tarifa final con nuestro equipo.
          </p>
          <label className="mt-8 block text-sm font-black">Peso aproximado</label>
          <div className="mt-2 flex items-center rounded-full bg-white p-1 text-[#0d1b30]">
            <input
              value={weight}
              onChange={(event) => setWeight(event.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              className="min-w-0 flex-1 bg-transparent px-5 py-3 text-lg font-black outline-none"
            />
            <span className="pr-5 font-black text-[#0d1b30]/45">lb</span>
          </div>
          <div className="mt-5 flex items-end justify-between gap-4 rounded-3xl bg-black/10 p-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[.16em] text-white/60">Estimado demostrativo</p>
              <p className="mt-2 text-4xl font-black">${estimatedTotal.toFixed(2)}</p>
            </div>
            <Calculator size={34} className="text-white/30" />
          </div>
          <a
            href={`${WHATSAPP_URL}?text=${quoteMessage}`}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-4 font-black text-[#c31f2e] transition hover:bg-[#fff8f0]"
          >
            <MessageCircle size={19} /> Confirmar por WhatsApp
          </a>
        </div>

        <div id="rastreo" className="rounded-[2.5rem] border border-[#0d1b30]/10 bg-white p-7 shadow-sm md:p-10">
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#c31f2e]">Rastreo en línea</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-[#0d1b30]">Tu envío, siempre visible.</h2>
          <p className="mt-4 max-w-xl font-semibold leading-7 text-[#0d1b30]/55">
            Escribe el código de rastreo para consultar el estado actualizado.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <input
              value={trackingCode}
              onChange={(event) => setTrackingCode(event.target.value.toUpperCase())}
              placeholder="ACE-XXXXXXXX"
              className="min-w-0 flex-1 rounded-full border border-[#0d1b30]/15 bg-[#f6f1e4] px-5 py-4 font-black text-[#0d1b30] outline-none focus:border-[#c31f2e]"
            />
            <Link
              href={trackingCode.trim() ? `${TRACKING_URL}/${encodeURIComponent(trackingCode.trim())}` : TRACKING_URL}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0d1b30] px-6 py-4 font-black text-white"
            >
              <Search size={18} /> Consultar
            </Link>
          </div>
          <div className="mt-8 space-y-3">
            {TRACKING_STAGES.map(([label, Icon], index) => (
              <div key={String(label)} className="flex items-center gap-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    index < 2 ? "bg-[#c31f2e] text-white" : "bg-[#f6f1e4] text-[#0d1b30]/45"
                  }`}
                >
                  <Icon size={17} />
                </div>
                <div className="h-px flex-1 bg-[#0d1b30]/10" />
                <span className="w-24 text-sm font-black text-[#0d1b30]">{String(label)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
