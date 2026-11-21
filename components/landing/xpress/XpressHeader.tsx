"use client";

import { useRef } from "react";
import { Clock, MapPin, Menu, MessageCircle, Phone, Truck, X } from "lucide-react";
import { contactWhatsApp, mapUrl, xpressNavigation, xpress } from "./content";
import styles from "./xpress.module.css";

export default function XpressHeader({ lockersEnabled }: { lockersEnabled: boolean }) {
  const menu = useRef<HTMLDialogElement>(null);
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
          <a href="#inicio" className={styles.brand} aria-label="Xpress Multiservices Solutions, inicio">
            {[styles.brandSymbol, styles.brandName, styles.brandCaption].map((piece) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={piece} className={piece} src="/xpress/logo-transparent.webp" alt="" width={938} height={384} />
            ))}
          </a>
          <nav className={styles.desktopNav} aria-label="Navegación principal">
            {navigation.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
            <a className={styles.primary} href="#recogida"><Truck size={18} aria-hidden />Solicitar recogida</a>
          </nav>
          <div className={styles.mobileNav}>
            <a href={`tel:${xpress.phones[0].number}`} aria-label="Llamar a Xpress"><Phone size={21} /></a>
            <a href={contactWhatsApp} aria-label="Contactar por WhatsApp"><MessageCircle size={22} /></a>
            <button type="button" aria-label="Abrir menú" aria-haspopup="dialog" onClick={() => menu.current?.showModal()}>
              <Menu size={22} aria-hidden />
            </button>
            <dialog ref={menu} className={styles.menuSheet} aria-label="Navegación móvil">
              <div className={styles.menuHeading}>
                <strong>Menú</strong>
                <button type="button" aria-label="Cerrar menú" onClick={() => menu.current?.close()}><X size={22} aria-hidden /></button>
              </div>
              <nav aria-label="Secciones de Xpress">
                {navigation.map(([label, href]) => <a key={href} href={href} onClick={() => menu.current?.close()}>{label}</a>)}
                <a href="#recogida" onClick={() => menu.current?.close()}>Solicitar recogida</a>
              </nav>
            </dialog>
          </div>
        </div>
      </header>
    </>
  );
}
