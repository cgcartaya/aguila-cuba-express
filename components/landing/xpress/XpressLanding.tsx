import { Clock, Headset, House, MapPin, Menu, MessageCircle, Package, PackageSearch, Phone, Plane, Ship, ShoppingCart, Snowflake, Truck, Warehouse } from "lucide-react";
import Link from "next/link";
import { boxes, transportRates, xpress, xpressWhatsApp } from "./content";
import { XpressHero, XpressQuoteInquiry } from "./XpressInteractive";
import styles from "./xpress.module.css";

const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(xpress.address)}`;
const contactWhatsApp = xpressWhatsApp("Hola, quisiera información sobre los envíos a Cuba.");
const navigation = [
  ["Inicio", "#inicio"],
  ["Servicios", "#servicios"],
  ["Cotizador", "#cotizador"],
  ["Tienda virtual", "#tienda"],
  ["Casillero virtual", "#casillero"],
  ["Rastreo", "#rastreo"],
  ["Contacto", "#contacto"],
];

const shortcuts = [
  { label: "Express a Cuba", href: "#express", icon: Truck },
  { label: "Carga aérea", href: "#aereo", icon: Plane },
  { label: "Marítimos", href: "#maritimo", icon: Ship },
  { label: "Cajas precio fijo", href: "#cajas", icon: Package },
  { label: "Frutas y congelados", href: "#frutas", icon: Snowflake },
  { label: "Casillero virtual", href: "#casillero", icon: Warehouse },
  { label: "Tienda virtual", href: "#tienda", icon: ShoppingCart },
  { label: "Entrega a domicilio", href: "#domicilio", icon: House },
];

const serviceImages = ["/xpress/plane.webp", "/xpress/hero.webp", "/xpress/ship.webp"];

type Props = { logoUrl?: string | null; storeSlug?: string; canonicalUrl?: string };

export default function XpressLanding({ logoUrl = xpress.logo, storeSlug, canonicalUrl }: Props) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: xpress.name,
    url: canonicalUrl,
    logo: logoUrl && canonicalUrl ? new URL(logoUrl, canonicalUrl).href : undefined,
    telephone: xpress.phones[0].number,
    address: { "@type": "PostalAddress", streetAddress: "4175 East 8th Ave", addressLocality: "Hialeah", addressRegion: "FL", addressCountry: "US" },
    openingHours: "Mo-Su 09:00-18:00",
    hasMap: mapUrl,
  };

  return (
    <main id="inicio" className={styles.page}>
      {canonicalUrl && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />}
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
            <img src={logoUrl || xpress.logo} alt={xpress.name} />
          </a>
          <nav className={styles.desktopNav} aria-label="Navegación principal">
            {navigation.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
            <a className={styles.primary} href="#recogida"><Truck size={18} aria-hidden />Solicitar recogida</a>
          </nav>
          <div className={styles.mobileNav}>
            <a href={`tel:${xpress.phones[0].number}`} aria-label="Llamar a Xpress"><Phone size={21} /></a>
            <a href={contactWhatsApp} aria-label="Contactar por WhatsApp"><MessageCircle size={22} /></a>
            <details>
              <summary aria-label="Menú"><Menu size={27} /></summary>
              <nav aria-label="Navegación móvil">
                {navigation.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
                <a href="#recogida">Solicitar recogida</a>
              </nav>
            </details>
          </div>
        </div>
      </header>

      <XpressHero logoUrl={logoUrl || xpress.logo} />

      <nav className={styles.shortcuts} aria-label="Accesos a servicios">
        {shortcuts.map(({ label, href, icon: Icon }) => <a key={href} href={href}><Icon aria-hidden />{label}</a>)}
      </nav>

      <div className={styles.wrap}>
        <div className={styles.servicesLayout}>
          <section id="cotizador"><XpressQuoteInquiry /></section>
          <section id="servicios">
            <h2 className={styles.sectionTitle}>Nuestros servicios</h2>
            <div className={styles.serviceCards} tabIndex={0} aria-label="Modalidades de envío">
              {[
                ...transportRates.map((rate, index) => ({ ...rate, image: serviceImages[index] })),
                { id: "cajas", name: "Cajas marítimas", image: "/xpress/boxes.webp", price: "Desde $45" },
                { id: "frutas", name: "Frutas y congelados", image: "/xpress/fresh.webp", price: "Servicio prioritario" },
                { id: "casillero", name: "Casillero virtual", image: "/xpress/locker.webp", price: "Recibe tus compras" },
              ].map(({ id, name, image, price }) => (
                <a className={styles.serviceCard} key={id} href={`#${id}`}>
                  <strong>{name}</strong>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt="" loading="lazy" />
                  <span>{price}</span>
                </a>
              ))}
            </div>
          </section>
        </div>

        <div className={styles.rates}>
          {transportRates.map(({ id, name, time, rates }) => (
            <details key={id} id={id}>
              <summary>{name}</summary>
              <p>{time}</p>
              <dl>{rates.map(([category, price]) => <div key={category}><dt>{category}</dt><dd>{price}</dd></div>)}</dl>
              <a href={xpressWhatsApp(`Hola, quisiera confirmar una cotización de ${name.toLowerCase()}.`)}>Consultar tarifa de entrega</a>
            </details>
          ))}
        </div>

        <section id="cajas" className={styles.block}>
          <h2>Cajas marítimas de precio fijo</h2>
          <p>Incluye preparación y empaque. Consulta la disponibilidad y el cargo de entrega para tu municipio.</p>
          <ul className={styles.boxes}>{boxes.map(({ size, price }) => <li key={size}><Package aria-hidden /><span>{size}</span><strong>{price}</strong></li>)}</ul>
        </section>

        <div className={styles.twoCol}>
          <section id="frutas" className={styles.block}>
            <h2>Frutas y congelados</h2>
            <p>Preparación especializada, conservación refrigerada y recepción de compras por internet.</p>
            <p><strong>Servicio prioritario</strong> en 24 h para La Habana y 48–72 h para provincias.</p>
            <p>Tarifa base de frutas frescas <strong>$3.99/lb</strong> y de congelados <strong>$4.99/lb</strong>.</p>
            <a href={xpressWhatsApp("Hola, quisiera confirmar disponibilidad y precio para frutas o congelados con servicio prioritario.")}>Consultar servicio prioritario</a>
          </section>
          <section id="casillero" className={styles.block}>
            <h2>Casillero virtual</h2>
            <p>Recibe tus compras de Amazon, Walmart y otras tiendas de Estados Unidos para enviarlas a Cuba.</p>
            <a href={xpressWhatsApp("Hola, quisiera las instrucciones para abrir un casillero con Xpress.")}>Pedir instrucciones</a>
          </section>
        </div>

        <section id="tienda" className={styles.store}>
          <div>
            <h2>Tienda virtual</h2>
            <p>Alimentos, café, leche, azúcar, condimentos y productos de aseo para enviar a Cuba.</p>
            {storeSlug ? <Link className={styles.primary} href="/tienda"><ShoppingCart size={20} aria-hidden />Ver tienda</Link>
              : <a className={styles.primary} href={xpressWhatsApp("Hola, quisiera consultar por los productos de la tienda.")}>Consultar productos</a>}
          </div>
        </section>

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
      </div>
      <footer className={styles.footer}>
        <div className={styles.wrap}>
          <strong>{xpress.name}</strong>
          <nav aria-label="Enlaces del pie de página">{navigation.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav>
        </div>
      </footer>
    </main>
  );
}
