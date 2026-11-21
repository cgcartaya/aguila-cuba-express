import Link from "next/link";
import { Package, ShoppingCart } from "lucide-react";
import { boxes, xpressWhatsApp } from "./content";
import styles from "./xpress.module.css";

export default function XpressSpecialServices({ hasStore }: { hasStore: boolean }) {
  return (
    <>
      <section id="cajas" className={styles.block}>
        <h2>Cajas marítimas de precio fijo</h2>
        <p>Incluye preparación y empaque. Consulta la disponibilidad y el cargo de entrega para tu municipio.</p>
        <ul className={styles.boxes}>{boxes.map(({ size, price }) => <li key={size}><Package aria-hidden /><span>{size}</span><strong>{price}</strong></li>)}</ul>
      </section>

      <div className={styles.twoCol}>
        <section id="frutas" className={`${styles.block} ${styles.feature}`}>
          <div className={styles.featurePhoto} data-image="fresh" />
          <h2>Frutas y congelados</h2>
          <p>Preparación especializada, conservación refrigerada y recepción de compras por internet.</p>
          <p><strong>Servicio prioritario</strong> en 24 h para La Habana y 48–72 h para provincias.</p>
          <p>Tarifa base de frutas frescas <strong>$3.99/lb</strong> y de congelados <strong>$4.99/lb</strong>.</p>
          <a href={xpressWhatsApp("Hola, quisiera confirmar disponibilidad y precio para frutas o congelados con servicio prioritario.")}>Consultar servicio prioritario</a>
        </section>
        <section id="casillero" className={`${styles.block} ${styles.feature}`}>
          <div className={styles.featurePhoto} data-image="locker" />
          <h2>Casillero virtual</h2>
          <p>Recibe tus compras de Amazon, Walmart y otras tiendas de Estados Unidos para enviarlas a Cuba.</p>
          <a href={xpressWhatsApp("Hola, quisiera las instrucciones para abrir un casillero con Xpress.")}>Pedir instrucciones</a>
        </section>
      </div>

      <section id="tienda" className={styles.store}>
        <div>
          <h2>Tienda virtual</h2>
          <p>Alimentos, café, leche, azúcar, condimentos y productos de aseo para enviar a Cuba.</p>
          {hasStore ? <Link className={styles.primary} href="/tienda"><ShoppingCart size={20} aria-hidden />Ver tienda</Link>
            : <a className={styles.primary} href={xpressWhatsApp("Hola, quisiera consultar por los productos de la tienda.")}>Consultar productos</a>}
        </div>
      </section>
    </>
  );
}
