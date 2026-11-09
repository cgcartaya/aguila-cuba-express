"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Calculator, Search } from "lucide-react";
import { TRACKING_URL, WHATSAPP_URL } from "./constants";
import { AGUILA_RATES } from "./rates";
import s from "./elegant.module.css";

export default function AguilaShippingTools({
  section = "both",
}: {
  section?: "tracking" | "quote" | "both";
}) {
  const router = useRouter();
  const [weight, setWeight] = useState("10");
  const [mode, setMode] = useState("maritimo");
  const selected =
    AGUILA_RATES.find((rate) => rate.id === mode) || AGUILA_RATES[0];
  const pounds = Number(weight);
  const validWeight = Number.isFinite(pounds) && pounds > 0;
  const total = validWeight ? pounds * selected.rate : 0;
  const message = `Hola, quiero cotizar un envío con Águila Express USA. Modalidad: ${selected.title}. Peso aproximado: ${weight} lb. Estimado: $${total.toFixed(2)}. Quisiera confirmar los detalles y la recogida.`;
  return (
    <>
      {section !== "quote" && (
        <section
          id="rastreo"
          className={s.tracking}
          aria-labelledby="aguila-tracking-title"
        >
          <h2 id="aguila-tracking-title">
            <Search aria-hidden="true" /> Rastrea tu envío
          </h2>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const code = String(
                new FormData(event.currentTarget).get("tracking") || "",
              )
                .trim()
                .toUpperCase()
                .replace(/\s+/g, "");
              router.push(
                code
                  ? `${TRACKING_URL}/${encodeURIComponent(code)}`
                  : TRACKING_URL,
              );
            }}
          >
            <label className={s.srOnly} htmlFor="aguila-tracking">
              Código de rastreo
            </label>
            <input
              id="aguila-tracking"
              name="tracking"
              placeholder="Código de rastreo"
              required
              maxLength={80}
            />
            <button className={s.primary} type="submit">
              <Search size={19} aria-hidden="true" /> Consultar
            </button>
          </form>
        </section>
      )}
      {section !== "tracking" && (
        <section
          id="cotizar"
          data-reveal
          className={s.quote}
          aria-labelledby="aguila-quote-title"
        >
          <div>
            <p className={s.eyebrow}>PLANIFICA TU ENVÍO</p>
            <h2 id="aguila-quote-title">¿Cuánto quieres enviar?</h2>
            <p>
              Elige tu modalidad y calcula el importe por peso. Confirma los
              detalles con nuestro equipo.
            </p>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (validWeight)
                window.open(
                  `${WHATSAPP_URL}?text=${encodeURIComponent(message)}`,
                  "_blank",
                  "noopener,noreferrer",
                );
            }}
          >
            <label>
              Modalidad
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value)}
              >
                {AGUILA_RATES.map((rate) => (
                  <option key={rate.id} value={rate.id}>
                    {rate.title} · ${rate.rate}/lb
                  </option>
                ))}
              </select>
            </label>
            <label>
              Peso en libras
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                inputMode="decimal"
              />
            </label>
            <div className={s.estimate}>
              <small>Estimado por peso</small>
              <strong aria-live="polite" aria-atomic="true">
                ${total.toFixed(2)}
              </strong>
            </div>
            <button className={s.primary} type="submit" disabled={!validWeight}>
              <Calculator size={18} aria-hidden="true" /> Cotizar{" "}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
