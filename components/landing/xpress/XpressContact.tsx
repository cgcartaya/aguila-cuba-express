import { Clock, MapPin, MessageCircle, Phone } from "lucide-react";
import { contactWhatsApp, mapUrl, xpressNavigation, xpress } from "./content";
import styles from "./xpress.module.css";

export default function XpressContact() {
  return (
    <section id="contacto" className={`${styles.block} ${styles.contact}`}>
      <div>
        <h2>Contáctanos</h2>
        <a href={mapUrl}><MapPin size={19} aria-hidden />{xpress.address}</a>
        <p><Clock size={19} aria-hidden />{xpress.hours}</p>
        {xpress.phones.map((phone) => <a key={phone.number} href={`tel:${phone.number}`}><Phone size={18} aria-hidden />{phone.label}</a>)}
        <a href={contactWhatsApp}><MessageCircle size={19} aria-hidden />WhatsApp {xpress.whatsappLabel}</a>
      </div>
      <iframe title="Ubicación de Xpress en Hialeah" loading="lazy" src={`https://maps.google.com/maps?q=${encodeURIComponent(xpress.address)}&output=embed`} />
    </section>
  );
}

export function XpressFooter({ lockersEnabled }: { lockersEnabled: boolean }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.wrap}>
        <strong>{xpress.name}</strong>
        <nav aria-label="Enlaces del pie de página">{xpressNavigation(lockersEnabled).map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav>
      </div>
    </footer>
  );
}
