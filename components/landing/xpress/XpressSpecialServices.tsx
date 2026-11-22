import { Package } from "lucide-react";
import { boxes } from "./content";
import styles from "./xpress.module.css";

export default function XpressSpecialServices() {
  return (
    <section id="cajas" className={`${styles.block} ${styles.reveal}`}>
      <h2>Cajas marítimas de precio fijo</h2>
      <p>Incluye preparación y empaque. Consulta la disponibilidad y el cargo de entrega para tu municipio.</p>
      <ul className={styles.boxes}>{boxes.map(({ size, price }) => <li key={size}><Package aria-hidden /><span>{size}</span><strong>{price}</strong></li>)}</ul>
    </section>
  );
}
