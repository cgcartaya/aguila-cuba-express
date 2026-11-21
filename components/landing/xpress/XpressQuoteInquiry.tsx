"use client";

import { useState } from "react";
import { Calculator, MessageCircle } from "lucide-react";
import { xpressSubtotal, type XpressRate } from "@/lib/shipping/xpress-quote";
import { xpressWhatsApp } from "./content";
import styles from "./xpress.module.css";

const modes = [
  ["express", "Express a Cuba"],
  ["air", "Carga aérea"],
  ["sea", "Marítimo por libra"],
  ["cajas", "Cajas marítimas"],
];

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default function XpressQuoteInquiry({ rates }: { rates: XpressRate[] }) {
  const [mode, setMode] = useState("");
  const [selected, setSelected] = useState("");
  const [amount, setAmount] = useState("");
  const options = rates.filter((rate) => rate.mode === mode);
  const rate = options.find((option) => option.id === selected) ?? (options.length === 1 ? options[0] : undefined);
  const quantity = Number(amount);
  const subtotal = rate ? xpressSubtotal(rate, quantity) : null;
  const unit = rate?.fixed ? (mode === "cajas" ? "cajas" : "unidades") : "lb";
  const request = subtotal !== null && rate
    ? `Hola, quisiera confirmar un envío de ${rate.label} (${quantity} ${unit}). Transporte estimado: ${usd.format(subtotal)}. ¿Cuál es el cargo de entrega para mi municipio?`
    : "Hola, quisiera cotizar un envío a Cuba.";

  return (
    <div className={styles.quote}>
      <h2><Calculator aria-hidden /> Cotiza tu envío</h2>
      <div className={styles.quoteBody}>
        {rates.length > 0 ? <>
          <label htmlFor="xpress-service">Modalidad de envío</label>
          <select id="xpress-service" value={mode} onChange={(event) => { setMode(event.target.value); setSelected(""); setAmount(""); }}>
            <option value="">Selecciona la modalidad</option>
            {modes.filter(([id]) => rates.some((rate) => rate.mode === id)).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          {options.length > 1 && <>
            <label htmlFor="xpress-rate">{mode === "cajas" ? "Tamaño de caja" : "Tipo de artículo"}</label>
            <select id="xpress-rate" value={selected} onChange={(event) => { setSelected(event.target.value); setAmount(""); }}>
              <option value="">Selecciona una opción</option>
              {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </>}
          {rate && <>
            <label htmlFor="xpress-amount">{rate.fixed ? (mode === "cajas" ? "Cantidad de cajas" : "Cantidad de unidades") : "Peso en libras"}</label>
            <input id="xpress-amount" type="number" inputMode={rate.fixed ? "numeric" : "decimal"}
              min={rate.fixed ? 1 : 0.01} step={rate.fixed ? 1 : "any"} max={rate.maxWeight ?? 10000}
              value={amount} onChange={(event) => setAmount(event.target.value)} />
            {amount && subtotal === null && <p>Revisa el peso o la cantidad ingresada.</p>}
          </>}
          <div aria-live="polite">
            {subtotal !== null && <p className={styles.quoteTotal}>Transporte estimado <strong>{usd.format(subtotal)} USD</strong></p>}
          </div>
          <p>Confirma el cargo de entrega con la agencia según el municipio y la modalidad.</p>
        </> : <p>Consulta con la agencia para confirmar la tarifa de tu envío.</p>}
        <a className={styles.primary} href={xpressWhatsApp(request)}>
          <MessageCircle size={18} aria-hidden /> {subtotal === null ? "Consultar por WhatsApp" : "Confirmar por WhatsApp"}
        </a>
      </div>
    </div>
  );
}
