import Link from "next/link";
import { Package, ShoppingCart } from "lucide-react";
import { boxes, xpressWhatsApp } from "./content";
import styles from "./xpress.module.css";

export default function XpressSpecialServices({ hasStore }: { hasStore: boolean }) {
  return (
    <>
      <section id="cajas" className={`${styles.block} ${styles.reveal}`}>
        <h2>Cajas marítimas de precio fijo</h2>
        <p>Incluye preparación y empaque. Consulta la disponibilidad y el cargo de entrega para tu municipio.</p>
        <ul className={styles.boxes}>{boxes.map(({ size, price }) => <li key={size}><Package aria-hidden /><span>{size}</span><strong>{price}</strong></li>)}</ul>
      </section>

      <section id="tienda" className={`${styles.store} ${styles.reveal}`}>
        <div>
          <h2>Tienda virtual</h2>
          <p>Encuentra alimentos, café, leche, azúcar, condimentos y productos de aseo. También puedes comprar en nuestra oficina y pedir que preparemos tu caja con esos productos.</p>
          {hasStore ? <Link className={styles.primary} href="/tienda"><ShoppingCart size={20} aria-hidden />Ver tienda</Link>
            : <a className={styles.primary} href={xpressWhatsApp("Hola, quisiera consultar por los productos de la tienda.")}>Consultar productos</a>}
        </div>
      </section>
    </>
  );
}
