"use client";

import { useState } from "react";
import { Calculator, MessageCircle } from "lucide-react";
import { transportRates, xpressWhatsApp } from "./content";
import styles from "./xpress.module.css";

export default function XpressQuoteInquiry() {
  const [service, setService] = useState("");
  return (
    <div className={styles.quote}>
      <h2><Calculator aria-hidden /> Cotiza tu envío</h2>
      <div className={styles.quoteBody}>
        <label htmlFor="xpress-service">Modalidad de envío</label>
        <select id="xpress-service" value={service} onChange={(event) => setService(event.target.value)}>
          <option value="">Selecciona la modalidad</option>
          {transportRates.map(({ name }) => <option key={name}>{name}</option>)}
          <option>Cajas marítimas</option>
          <option>Frutas y congelados</option>
        </select>
        <p>Indícanos el municipio de entrega y el peso o la cantidad para confirmar el precio.</p>
        <a className={styles.primary} href={xpressWhatsApp(service ? `Hola, quisiera cotizar: ${service}.` : "Hola, quisiera cotizar un envío a Cuba.")}>
          <MessageCircle size={18} aria-hidden /> Cotizar por WhatsApp
        </a>
      </div>
    </div>
  );
}
