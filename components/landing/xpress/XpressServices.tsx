import { ArrowUpRight, Box, ChevronDown, Container, Plane, Snowflake, Truck, Warehouse } from "lucide-react";
import type { XpressRate } from "@/lib/shipping/xpress-quote";
import { transportRates, xpress, xpressWhatsApp } from "./content";
import XpressQuoteInquiry from "./XpressQuoteInquiry";
import styles from "./xpress.module.css";

const transportIcons = [Truck, Plane, Container];
const transportImages = ["/xpress/plane.webp", xpress.hero, "/xpress/ship.webp"];

export default function XpressServices({ lockersEnabled, rates }: { lockersEnabled: boolean; rates: XpressRate[] }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.servicesLayout}>
        <section id="cotizador" className={styles.reveal}><XpressQuoteInquiry rates={rates} /></section>
        <section id="servicios" className={styles.reveal}>
          <h2 className={styles.sectionTitle}>Nuestros servicios</h2>
          <div className={styles.serviceCards}>
            {[
              ...transportRates.map((item, index) => ({ ...item, image: transportImages[index], href: `#${item.id}`, icon: transportIcons[index] })),
              { id: "cajas", name: "Cajas marítimas", price: "Desde $45", image: xpress.boxesPhoto, href: "#cajas", icon: Box },
              { id: "frutas", name: "Frutas y congelados", price: "Servicio prioritario", image: "/xpress/fresh.webp", href: "#cotizador", icon: Snowflake },
              { id: "casillero", name: "Casillero virtual", price: lockersEnabled ? "Recibe tus compras" : "Consulta disponibilidad", image: xpress.lockerPhoto, href: lockersEnabled ? "/casillero" : xpressWhatsApp("Hola, quisiera información sobre el casillero para compras de Amazon, Walmart y otras tiendas desde Estados Unidos."), icon: Warehouse },
            ].map(({ id, name, price, image, href, icon: Icon }) => (
              <a className={styles.serviceCard} key={id} href={href}>
                <div className={styles.serviceImage}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img data-boxes-photo={id === "cajas" || undefined} src={image} alt="" loading="lazy" width={320} height={180} />
                </div>
                <div className={styles.serviceLabel}>
                  <Icon size={19} aria-hidden />
                  <span><strong>{name}</strong><small>{price}</small></span>
                  <ArrowUpRight size={16} aria-hidden />
                </div>
              </a>
            ))}
          </div>
          <div className={styles.serviceList}>
            {transportRates.map(({ id, name, price, time, rates }, index) => {
              const Icon = transportIcons[index];
              return (
                <details key={id} name="xpress-rates" className={styles.service}>
                  <summary className={styles.serviceRow}>
                    <Icon size={22} aria-hidden />
                    <span><strong>{name}</strong><small>{price}</small></span>
                    <ChevronDown className={styles.disclosure} size={18} aria-hidden />
                  </summary>
                  <div className={styles.rateContent}>
                    <p id={id}>{time}</p>
                    <dl>
                      {rates.map(([category, amount]) => <div key={category}><dt>{category}</dt><dd>{amount}</dd></div>)}
                    </dl>
                    <a href={xpressWhatsApp(`Hola, quisiera confirmar una cotización de ${name.toLowerCase()}.`)}>Consultar tarifa de entrega</a>
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
