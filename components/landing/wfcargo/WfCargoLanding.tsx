import Image from "next/image";
import { MessageCircle, Phone, ArrowUpRight } from "lucide-react";
import PromotionSlider from "./PromotionSlider";
import ShippingCalculator from "./ShippingCalculator";
import PickupForm from "./PickupForm";
import {
  ServiceGrid,
  ProcedureSection,
  Benefits,
  FeaturedServices,
  OtherServices,
  Branches,
  FaqSection,
} from "./ServiceSections";
import { contact, whatsapp } from "./content";
import s from "./wfcargo.module.css";
export default function WfCargoLanding() {
  return (
    <div className={s.root}>
      <a href="#contenido" className={s.skip}>
        Saltar al contenido
      </a>
      <div className={s.topbar}>
        <span>Tu agencia de envíos y multiservicios en Port St. Lucie</span>
        <a href="tel:+17722127150">
          <Phone size={13} /> {contact.phone}
        </a>
      </div>
      <header className={s.header}>
        <nav className={s.nav} aria-label="Navegación principal">
          <a href="#inicio" className={s.brand}>
            <Image
              src="/wfcargo/logo.webp"
              alt="WF Cargo Envíos"
              width={76}
              height={76}
              preload
            />
            <span>
              WF Cargo <b>Envíos</b>
              <small>Tu mundo más cerca</small>
            </span>
          </a>
          <div className={s.desktopNav}>
            <a href="#servicios">Servicios</a>
            <a href="#cotizador">Envíos</a>
            <a href="#tramites">Trámites</a>
            <a href="#sucursales">Sucursales</a>
          </div>
          <a
            className={s.whatsappButton}
            href={whatsapp("Hola, quisiera información sobre sus servicios.")}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={19} />
            <span>WhatsApp</span>
          </a>
          <details className={s.mobileMenu}>
            <summary>Menú</summary>
            <div>
              <a href="#servicios">Servicios</a>
              <a href="#cotizador">Cotizar envío</a>
              <a href="#tramites">Trámites</a>
              <a href="#sucursales">Sucursales</a>
            </div>
          </details>
        </nav>
      </header>
      <main id="contenido">
        <PromotionSlider />
        <ServiceGrid />
        <div className={s.tools}>
          <ShippingCalculator />
          <ProcedureSection />
        </div>
        <Benefits />
        <PickupForm />
        <FeaturedServices />
        <OtherServices />
        <Branches />
        <FaqSection />
        <section className={s.contactCta}>
          <div>
            <p className={s.eyebrow}>HABLEMOS DE LO QUE NECESITAS</p>
            <h2>Estamos para ayudarte.</h2>
            <p>Un mensaje puede ser el comienzo de tu próxima solución.</p>
          </div>
          <a
            className={s.button}
            href={whatsapp("Hola, quisiera hablar con el equipo de WF Cargo.")}
            target="_blank"
            rel="noopener noreferrer"
          >
            Escríbenos por WhatsApp
            <ArrowUpRight size={20} />
          </a>
        </section>
      </main>
      <footer className={s.footer}>
        <div>
          <strong>WF Cargo Envíos</strong>
          <p>
            Fournier Investment Services LLC
            <br />
            Envíos y multiservicios · Port St. Lucie, Florida
          </p>
        </div>
        <div>
          <a href="tel:+17722127150">{contact.phone}</a>
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
          <a href="/login">Acceso de personal</a>
        </div>
        <small>
          Oficina de notaría pública. No ofrecemos asesoría legal ni de
          inmigración. Tarifas y servicios sujetos a confirmación.
        </small>
      </footer>
      <a
        className={s.floatingWhatsApp}
        aria-label="Contactar a WF Cargo por WhatsApp"
        href={whatsapp("Hola, quisiera información sobre WF Cargo Envíos.")}
        target="_blank"
        rel="noopener noreferrer"
      >
        <MessageCircle size={27} />
      </a>
    </div>
  );
}
