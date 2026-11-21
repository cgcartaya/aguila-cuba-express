import { Headset, MapPin, Package, PackageSearch, Plane, Warehouse } from "lucide-react";
import { xpressWhatsApp } from "./content";
import styles from "./xpress.module.css";

export default function XpressShippingSupport() {
  return (
    <>
      <section className={styles.advantages}>
        <h2>¿Por qué elegir Xpress?</h2>
        <p><Plane aria-hidden />Varias modalidades de envío</p>
        <p><Package aria-hidden />Empaque especializado</p>
        <p><MapPin aria-hidden />La Habana y provincias</p>
        <p><Headset aria-hidden />Atención personalizada</p>
        <p><Warehouse aria-hidden />Casillero para compras online</p>
      </section>

      <div className={styles.twoCol}>
        <section id="domicilio" className={styles.block}>
          <h2>Entrega a domicilio en Cuba</h2>
          <p>El cargo de entrega depende del municipio y la modalidad. Confirma el total con la agencia antes de enviar.</p>
        </section>
        <section id="rastreo" className={styles.block}>
          <h2>Rastreo de paquetes</h2>
          <p>Ten a mano el número de seguimiento que aparece en tu comprobante.</p>
          <a href={xpressWhatsApp("Hola, quisiera consultar el estado de un envío. Mi número de seguimiento es: ")}><PackageSearch size={19} aria-hidden />Consultar seguimiento</a>
        </section>
      </div>

      <section id="recogida" className={styles.block}>
        <h2>Recogidas locales y envíos desde otros estados</h2>
        <div className={styles.twoCol}>
          <div>
            <h3>Recogida local</h3>
            <p>Consulta la cobertura y disponibilidad en tu dirección.</p>
            <a href={xpressWhatsApp("Hola, quisiera coordinar una recogida local.")}>Consultar recogida</a>
          </div>
          <div>
            <h3>Paquetes desde otro estado</h3>
            <p>Pide las instrucciones de recepción antes de enviar tu paquete a la agencia.</p>
            <a href={xpressWhatsApp("Hola, quiero enviar un paquete a Xpress desde otro estado. ¿Qué instrucciones debo seguir?")}>Pedir instrucciones de envío</a>
          </div>
        </div>
      </section>
    </>
  );
}
