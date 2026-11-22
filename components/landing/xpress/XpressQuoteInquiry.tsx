"use client";

import { useState } from "react";
import { Calculator, MessageCircle } from "lucide-react";
import { xpressQuote, type XpressRate } from "@/lib/shipping/xpress-quote";
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
  const [province, setProvince] = useState("");
  const [municipality, setMunicipality] = useState("");
  const options = rates.filter((rate) => rate.mode === mode);
  const rate = options.find((option) => option.id === selected) ?? (options.length === 1 ? options[0] : undefined);
  const provinces = [...new Set(rate?.destinations.map((destination) => destination.province))];
  const provinceDestinations = rate?.destinations.filter((destination) => destination.province === province) ?? [];
  const express = mode === "express";
  const destination = express
    ? provinceDestinations.find((item) => item.id === municipality)
    : provinceDestinations[0];
  const fixed = rate?.unitPrice != null;
  const quantity = Number(amount);
  const quote = rate && destination ? xpressQuote(rate, destination, quantity) : null;
  const unit = fixed ? (mode === "cajas" ? "cajas" : "unidades") : "lb";
  const location = [destination?.municipality, destination?.province].filter(Boolean).join(", ");
  const request = quote && rate
    ? `Hola, quisiera confirmar un envío de ${rate.label} (${quantity} ${unit}) a ${location}. Transporte: ${usd.format(quote.transport)} USD. Entrega: ${usd.format(quote.delivery)} USD. Total estimado: ${usd.format(quote.total)} USD.`
    : "Hola, quisiera cotizar un envío a Cuba.";

  function resetDestination() {
    setProvince("");
    setMunicipality("");
  }

  return (
    <div className={styles.quote}>
      <h2><Calculator aria-hidden /> Cotiza tu envío</h2>
      <div className={styles.quoteBody}>
        {rates.length > 0 ? <>
          <label htmlFor="xpress-service">Modalidad de envío</label>
          <select id="xpress-service" value={mode} onChange={(event) => { setMode(event.target.value); setSelected(""); setAmount(""); resetDestination(); }}>
            <option value="">Selecciona la modalidad</option>
            {modes.filter(([id]) => rates.some((rate) => rate.mode === id)).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          {options.length > 1 && <>
            <label htmlFor="xpress-rate">{mode === "cajas" ? "Tamaño de caja" : "Tipo de artículo"}</label>
            <select id="xpress-rate" value={selected} onChange={(event) => { setSelected(event.target.value); setAmount(""); resetDestination(); }}>
              <option value="">Selecciona una opción</option>
              {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </>}
          {rate && provinces.length === 0 && <p>No hay destinos con tarifa publicada para este servicio. Consulta con la agencia.</p>}
          {rate && provinces.length > 0 && <>
            <label htmlFor="xpress-province">Provincia de entrega</label>
            <select id="xpress-province" value={province} onChange={(event) => {
              setProvince(event.target.value);
              setMunicipality("");
            }}>
              <option value="">Selecciona la provincia</option>
              {provinces.map((name) => <option key={name}>{name}</option>)}
            </select>
            {express && province && <>
              <label htmlFor="xpress-municipality">Municipio de entrega</label>
              <select id="xpress-municipality" value={municipality} onChange={(event) => setMunicipality(event.target.value)}>
                <option value="">Selecciona el municipio</option>
                {provinceDestinations.map((item) => <option key={item.id} value={item.id}>{item.municipality}</option>)}
              </select>
            </>}
            <label htmlFor="xpress-amount">{fixed ? (mode === "cajas" ? "Cantidad de cajas" : "Cantidad de unidades") : "Peso en libras"}</label>
            <input id="xpress-amount" type="number" inputMode={fixed ? "numeric" : "decimal"}
              min={fixed ? 1 : 0.01} step={fixed ? 1 : "any"}
              max={destination?.pricing.maximum_weight_lb ?? 10000}
              value={amount} onChange={(event) => setAmount(event.target.value)} />
            {amount && destination && !quote && <p>Revisa el peso o la cantidad ingresada.</p>}
          </>}
          <div aria-live="polite">
            {quote && <dl className={styles.quoteTotal}>
              <div><dt>Transporte</dt><dd>{usd.format(quote.transport)}</dd></div>
              <div><dt>Entrega a domicilio</dt><dd>{usd.format(quote.delivery)}</dd></div>
              <div><dt>Total estimado</dt><dd><strong>{usd.format(quote.total)} USD</strong></dd></div>
            </dl>}
          </div>
        </> : <p>Consulta con la agencia para confirmar la tarifa de tu envío.</p>}
        <a className={styles.primary} href={xpressWhatsApp(request)}>
          <MessageCircle size={18} aria-hidden /> {!quote ? "Consultar por WhatsApp" : "Confirmar por WhatsApp"}
        </a>
      </div>
    </div>
  );
}
