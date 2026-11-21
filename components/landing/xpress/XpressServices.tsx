import Link from "next/link";
import { ArrowUpRight, Box, ChevronDown, Container, Plane, Snowflake, Truck, Warehouse } from "lucide-react";
import { transportRates, xpressWhatsApp } from "./content";
import XpressQuoteInquiry from "./XpressQuoteInquiry";
import styles from "./xpress.module.css";

const transportIcons = [Truck, Plane, Container];

export default function XpressServices({ lockersEnabled }: { lockersEnabled: boolean }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.servicesLayout}>
        <section id="cotizador" className={styles.reveal}><XpressQuoteInquiry /></section>
        <section id="servicios" className={styles.reveal}>
          <h2 className={styles.sectionTitle}>Servicios de envío</h2>
          <div className={styles.serviceList}>
            {transportRates.map(({ id, name, price, time, rates }, index) => {
              const Icon = transportIcons[index];
              return (
                <details key={id} id={id} name="xpress-rates" className={styles.service}>
                  <summary className={styles.serviceRow}>
                    <Icon size={22} aria-hidden />
                    <span><strong>{name}</strong><small>{price}</small></span>
                    <ChevronDown className={styles.disclosure} size={18} aria-hidden />
                  </summary>
                  <div className={styles.rateContent}>
                    <p>{time}</p>
                    <dl>
                      {rates.map(([category, amount]) => <div key={category}><dt>{category}</dt><dd>{amount}</dd></div>)}
                    </dl>
                    <a href={xpressWhatsApp(`Hola, quisiera confirmar una cotización de ${name.toLowerCase()}.`)}>Consultar tarifa de entrega</a>
                  </div>
                </details>
              );
            })}
            <Link className={styles.serviceRow} href="#cajas">
              <Box size={22} aria-hidden />
              <span><strong>Cajas marítimas</strong><small>Desde $45</small></span>
              <ArrowUpRight size={18} aria-hidden />
            </Link>
            <Link className={styles.serviceRow} href="#cotizador">
              <Snowflake size={22} aria-hidden />
              <span><strong>Frutas y congelados</strong><small>Servicio prioritario</small></span>
              <ArrowUpRight size={18} aria-hidden />
            </Link>
            {lockersEnabled && (
              <Link className={styles.serviceRow} href="/casillero">
                <Warehouse size={22} aria-hidden />
                <span><strong>Casillero virtual</strong><small>Recibe tus compras</small></span>
                <ArrowUpRight size={18} aria-hidden />
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
