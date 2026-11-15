"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Calculator, MessageCircle, Plane, Ship, Zap } from "lucide-react";
import { shipping, whatsapp } from "./content";
import s from "./wfcargo.module.css";

type Mode = keyof typeof shipping.perPound;
type Destination = {
  id: string;
  name: string;
  boxes: { id: string; size: string; price: number }[];
};

const modes = {
  sea: { label: "Marítimo", icon: Ship },
  air: { label: "Aéreo", icon: Plane },
  express: { label: "Exprés", icon: Zap },
} satisfies Record<Mode, { label: string; icon: typeof Ship }>;

const cuba = {
  id: "cuba",
  name: "Cuba",
  boxes: shipping.boxes.map((box) => ({ ...box, id: box.size })),
};

const money = (amount: number) => `$${amount.toFixed(2)}`;

export default function ShippingCalculator({ destinations }: { destinations: Destination[] | null }) {
  const [step, setStep] = useState(1);
  const [destinationId, setDestinationId] = useState(cuba.id);
  const [mode, setMode] = useState<Mode>("sea");
  const [billing, setBilling] = useState<"weight" | "box">("weight");
  const [boxId, setBoxId] = useState("");
  const [weight, setWeight] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [quote, setQuote] = useState<{ total: number; details: string } | null>(null);
  const destination = destinations?.find(({ id }) => id === destinationId) ?? cuba;
  const isCuba = destination.id === cuba.id;
  const byBox = !isCuba || (mode === "sea" && billing === "box");
  const box = destination.boxes.find(({ id }) => id === boxId) ?? destination.boxes[0];
  const unitRate = byBox ? box.price : shipping.perPound[mode];

  return (
    <section id="cotizador" className={s.tool} aria-labelledby="wf-quote-title">
      <div className={s.toolHeading}>
        <Calculator aria-hidden="true" />
        <h2 id="wf-quote-title">Calculadora de envíos</h2>
      </div>
      <form
        className={s.toolBody}
        onSubmit={(event) => {
          event.preventDefault();
          if (step < 3) {
            setStep(step + 1);
            return;
          }
          const amount = Number(byBox ? quantity : weight);
          if (!Number.isFinite(amount) || amount <= 0) return;
          const total = Math.round(amount * Math.round(unitRate * 100)) / 100;
          if (!Number.isFinite(total)) return;
          setQuote({
            total,
            details: byBox
              ? `${amount} caja(s) de ${box.size} pulgadas × ${money(unitRate)} USD`
              : `${amount} lb × ${money(unitRate)} USD/lb`,
          });
        }}
      >
        <ol className={s.quoteSteps} aria-label="Pasos de la cotización">
          {["Destino", "Modalidad", "Cálculo"].map((label, index) => (
            <li key={label} aria-current={step === index + 1 ? "step" : undefined}>{label}</li>
          ))}
        </ol>
        {step === 1 && (
          <label>
            País de destino
            <select
              value={destinationId}
              onChange={(event) => {
                setDestinationId(event.target.value);
                setMode("sea");
                setBilling("weight");
                setBoxId("");
                setQuote(null);
              }}
            >
              {[cuba, ...(destinations ?? [])].map(({ id, name }) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </label>
        )}
        {step > 1 && <p className={s.quoteDestination}>Destino · {destination.name}</p>}
        {step === 2 && (
          <>
            <fieldset className={s.quoteModes}>
              <legend>Modalidad de envío</legend>
              {(isCuba ? (["sea", "air", "express"] as const) : (["sea"] as const)).map((value) => {
                const { label, icon: Icon } = modes[value];
                return (
                  <label key={value}>
                    <input type="radio" name="wf-shipping-mode" value={value} checked={mode === value}
                      onChange={() => { setMode(value); setQuote(null); }} />
                    <Icon size={20} aria-hidden="true" />
                    {label}
                    <small>{isCuba ? `${money(shipping.perPound[value])}/lb` : "Por caja"}</small>
                  </label>
                );
              })}
            </fieldset>
            {isCuba && mode === "sea" && (
              <label>
                Tipo de tarifa
                <select value={billing} onChange={(event) => {
                  setBilling(event.target.value === "box" ? "box" : "weight");
                  setQuote(null);
                }}>
                  <option value="weight">Por libra</option>
                  <option value="box">Caja a precio fijo · Hasta {shipping.maxBoxWeight} lb por caja</option>
                </select>
              </label>
            )}
          </>
        )}
        {step === 3 && (
          <>
            <p className={s.small}>{modes[mode].label} · {money(unitRate)} USD {byBox ? "por caja" : "por libra"}</p>
            {byBox ? (
              <div className={s.formGrid}>
                <label>
                  Tamaño de caja (pulgadas)
                  <select value={box.id} onChange={(event) => { setBoxId(event.target.value); setQuote(null); }}>
                    {destination.boxes.map(({ id, size, price }) => (
                      <option key={id} value={id}>{size} · {money(price)}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Cantidad de cajas
                  <input required type="number" min="1" max="100" step="1" value={quantity}
                    onChange={(event) => { setQuantity(event.target.value); setQuote(null); }} />
                </label>
              </div>
            ) : (
              <label>
                Peso total (lb)
                <input required type="number" min="0.01" step="0.01" inputMode="decimal"
                  placeholder="Ej. 20" value={weight}
                  onChange={(event) => { setWeight(event.target.value); setQuote(null); }} />
              </label>
            )}
          </>
        )}
        <div className={s.quoteActions}>
          {step > 1 && (
            <button className={s.quoteBack} type="button" onClick={() => { setStep(step - 1); setQuote(null); }}>
              <ArrowLeft size={16} aria-hidden="true" /> Atrás
            </button>
          )}
          <button className={s.button} type="submit">
            {step === 3 ? "Calcular estimado" : "Continuar"} <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
        {step === 3 && (
          <div aria-live="polite">
            {quote && (
              <div className={s.quoteResult}>
                <span>Transporte estimado a {destination.name}</span>
                <strong>{money(quote.total)} USD</strong>
                <span>{modes[mode].label} · {quote.details}</span>
                <a className={s.whatsappButton}
                  href={whatsapp([
                    "Hola, WF Cargo. Quisiera confirmar este estimado de envío.",
                    `Destino: ${destination.name}`,
                    `Modalidad: ${modes[mode].label}`,
                    `Cálculo: ${quote.details}`,
                    `Transporte estimado: ${money(quote.total)} USD`,
                  ].join("\n"))}
                  target="_blank" rel="noopener noreferrer">
                  <MessageCircle size={18} aria-hidden="true" /> Consultar por WhatsApp
                </a>
              </div>
            )}
          </div>
        )}
        {step === 3 && (
          <p className={s.small}>
            {isCuba && mode === "sea" && "Entrega a domicilio en Cuba incluida. "}
            {isCuba && `Empaque: $${shipping.packagingPerVisit} por visita, sujeto a exoneración. `}
            Estimado de transporte. Confirma con la agencia la cobertura, el seguro, los aranceles y los cargos adicionales.
          </p>
        )}
        {step === 1 && (
          <a className={s.textLink} href={whatsapp("Hola, quisiera cotizar un envío a otro destino.")}
            target="_blank" rel="noopener noreferrer">
            {destinations === null ? "Consulta las tarifas internacionales por WhatsApp" : "Consultar otro destino por WhatsApp"}
          </a>
        )}
      </form>
    </section>
  );
}
