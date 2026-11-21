"use client";

import { Clock, MapPin, Menu, MessageCircle, Phone, Truck } from "lucide-react";
import { contactWhatsApp, mapUrl, xpressNavigation, xpress } from "./content";
import styles from "./xpress.module.css";

export default function XpressHeader({ logoUrl, lockersEnabled }: { logoUrl: string; lockersEnabled: boolean }) {
  const navigation = xpressNavigation(lockersEnabled);
  return (
    <>
      <div className={styles.top}>
        <div className={styles.wrap}>
          <a href={mapUrl}><MapPin size={16} aria-hidden />{xpress.address}</a>
          <span><Clock size={16} aria-hidden />{xpress.hours}</span>
          {xpress.phones.map((phone) => <a key={phone.number} href={`tel:${phone.number}`}><Phone size={15} aria-hidden />{phone.label}</a>)}
          <a href={contactWhatsApp}><MessageCircle size={16} aria-hidden />{xpress.whatsappLabel}</a>
        </div>
      </div>
      <header className={styles.header}>
        <div className={styles.wrap}>
          <a href="#inicio" className={styles.brand}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={xpress.name} />
          </a>
          <nav className={styles.desktopNav} aria-label="Navegación principal">
            {navigation.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
            <a className={styles.primary} href="#recogida"><Truck size={18} aria-hidden />Solicitar recogida</a>
          </nav>
          <div className={styles.mobileNav}>
            <a href={`tel:${xpress.phones[0].number}`} aria-label="Llamar a Xpress"><Phone size={21} /></a>
            <a href={contactWhatsApp} aria-label="Contactar por WhatsApp"><MessageCircle size={22} /></a>
            <details onClick={(event) => { if ((event.target as HTMLElement).closest("nav a")) event.currentTarget.open = false; }}>
              <summary aria-label="Menú"><Menu size={27} /></summary>
              <nav aria-label="Navegación móvil">
                {navigation.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
                <a href="#recogida">Solicitar recogida</a>
              </nav>
            </details>
          </div>
        </div>
      </header>
    </>
  );
}
