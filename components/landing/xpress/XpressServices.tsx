import { House, Package, Plane, Ship, ShoppingCart, Snowflake, Truck, Warehouse } from "lucide-react";
import { transportRates, xpressWhatsApp } from "./content";
import XpressQuoteInquiry from "./XpressQuoteInquiry";
import styles from "./xpress.module.css";

const shortcuts = [
  { label: "Express a Cuba", href: "#express", icon: Truck },
  { label: "Carga aérea", href: "#aereo", icon: Plane },
  { label: "Marítimos", href: "#maritimo", icon: Ship },
  { label: "Cajas precio fijo", href: "#cajas", icon: Package },
  { label: "Frutas y congelados", href: "#cotizador", icon: Snowflake },
  { label: "Casillero virtual", href: "/casillero", icon: Warehouse },
  { label: "Tienda virtual", href: "#tienda", icon: ShoppingCart },
  { label: "Entrega a domicilio", href: "#domicilio", icon: House },
];

const serviceImages = ["/xpress/plane.webp", "/xpress/hero.webp", "/xpress/ship.webp"];

export default function XpressServices({ lockersEnabled }: { lockersEnabled: boolean }) {
  return (
    <>
      <nav className={styles.shortcuts} aria-label="Accesos a servicios">
        {shortcuts.filter(({ href }) => lockersEnabled || href !== "/casillero").map(({ label, href, icon: Icon }) => <a key={href} href={href}><Icon aria-hidden />{label}</a>)}
      </nav>

      <div className={styles.wrap}>
        <div className={styles.servicesLayout}>
          <section id="cotizador"><XpressQuoteInquiry /></section>
          <section id="servicios">
            <h2 className={styles.sectionTitle}>Nuestros servicios</h2>
            <div className={styles.serviceCards}>
              {[
                ...transportRates.map((rate, index) => ({ ...rate, image: serviceImages[index] })),
                { id: "cajas", name: "Cajas marítimas", image: "/xpress/boxes.webp", price: "Desde $45" },
                { id: "frutas", name: "Frutas y congelados", image: "/xpress/fresh.webp", price: "Servicio prioritario" },
                ...(lockersEnabled ? [{ id: "casillero", name: "Casillero virtual", image: "/xpress/locker.webp", price: "Recibe tus compras" }] : []),
              ].map(({ id, name, image, price }) => (
                <a className={styles.serviceCard} key={id} href={id === "frutas" ? "#cotizador" : id === "casillero" ? "/casillero" : `#${id}`}>
                  <strong>{name}</strong>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt="" loading="lazy" />
                  <span>{price}</span>
                </a>
              ))}
            </div>
          </section>
        </div>

        <div className={styles.rates} aria-label="Tarifas y tiempos de entrega">
          {transportRates.map(({ id, name, time, rates }) => (
            <details key={id} name="xpress-rates">
              <summary>{name}</summary>
              <p id={id}>{time}</p>
              <dl>{rates.map(([category, price]) => <div key={category}><dt>{category}</dt><dd>{price}</dd></div>)}</dl>
              <a href={xpressWhatsApp(`Hola, quisiera confirmar una cotización de ${name.toLowerCase()}.`)}>Consultar tarifa de entrega</a>
            </details>
          ))}
        </div>

      </div>
    </>
  );
}
