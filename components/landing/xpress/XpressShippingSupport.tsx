import { ChevronRight, Headset, MapPin, Package, PackageSearch, Plane, Truck, Warehouse } from "lucide-react";
import { xpressWhatsApp } from "./content";
import styles from "./xpress.module.css";

const supportActions = [
  {
    id: "rastreo",
    title: "Rastreo de paquetes",
    action: "Consultar seguimiento",
    message: "Hola, quisiera consultar el estado de un envío. Mi número de seguimiento es: ",
    icon: PackageSearch,
  },
  {
    id: "recogida",
    title: "Recogida local",
    action: "Consultar cobertura",
    message: "Hola, quisiera coordinar una recogida local.",
    icon: MapPin,
  },
  {
    id: "otros-estados",
    title: "Envíos desde otros estados",
    action: "Pedir instrucciones",
    message: "Hola, quiero enviar un paquete a Xpress desde otro estado. ¿Qué instrucciones debo seguir?",
    icon: Truck,
  },
];

export default function XpressShippingSupport({ lockersEnabled }: { lockersEnabled: boolean }) {
  return (
    <>
      <section className={`${styles.advantages} ${styles.reveal}`}>
        <h2>¿Por qué elegir Xpress?</h2>
        <p><Plane aria-hidden />Varias modalidades de envío</p>
        <p><Package aria-hidden />Empaque especializado</p>
        <p><MapPin aria-hidden />La Habana y provincias</p>
        <p><Headset aria-hidden />Atención personalizada</p>
        {lockersEnabled && <p><Warehouse aria-hidden />Casillero para compras online</p>}
      </section>

      <div className={`${styles.supportGrid} ${styles.reveal}`}>
        <section id="domicilio" className={styles.delivery}>
          <div className={styles.deliveryCopy}>
            <h2>Entrega a domicilio en Cuba</h2>
            <p>Consulta el cargo según el municipio y la modalidad.</p>
            <a className={styles.primary} href={xpressWhatsApp("Hola, quisiera consultar el cargo de entrega a domicilio en Cuba para mi municipio y modalidad de envío.")}>
              Consultar entrega
            </a>
          </div>
        </section>
        <div className={styles.supportActions}>
          {supportActions.map(({ id, title, action, message, icon: Icon }) => (
            <a key={id} id={id} className={styles.supportAction} href={xpressWhatsApp(message)}>
              <Icon size={24} aria-hidden />
              <span><strong>{title}</strong><span>{action}</span></span>
              <ChevronRight size={18} aria-hidden />
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
