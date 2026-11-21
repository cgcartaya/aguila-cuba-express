import { Clock, MapPin, MessageCircle, Navigation, Phone } from "lucide-react";
import { contactWhatsApp, mapUrl, xpressNavigation, xpress } from "./content";
import styles from "./xpress.module.css";

export default function XpressContact() {
  return (
    <section id="contacto" className={`${styles.contact} ${styles.reveal}`}>
      <div className={styles.contactDetails}>
        <h2>Contáctanos</h2>
        <a href={mapUrl}><MapPin size={20} aria-hidden />{xpress.address}</a>
        <p><Clock size={20} aria-hidden />{xpress.hours}</p>
        <div className={styles.contactPhones}>
          <Phone size={20} aria-hidden />
          <div>
            {xpress.phones.map((phone) => <a key={phone.number} href={`tel:${phone.number}`}>{phone.label}</a>)}
          </div>
        </div>
        <a href={contactWhatsApp}><MessageCircle size={20} aria-hidden />WhatsApp {xpress.whatsappLabel}</a>
      </div>
      <div className={styles.contactMap}>
        <iframe title="Ubicación de Xpress en Hialeah" loading="lazy" src={`https://maps.google.com/maps?q=${encodeURIComponent(xpress.address)}&output=embed`} />
        <a className={styles.directions} href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(xpress.address)}`}>
          <Navigation size={17} aria-hidden />Cómo llegar
        </a>
      </div>
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
