import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Check,
  MapPin,
  Menu,
  MessageCircle,
  Package,
  Phone,
  Plane,
  Search,
  Share2,
  Ship,
  ShoppingCart,
  Truck,
} from "lucide-react";
import {
  FACEBOOK_URL,
  INSTAGRAM_URL,
  PORTAL_URL,
  STORE_URL,
  TIKTOK_URL,
  TRACKING_URL,
  WHATSAPP_URL,
} from "./aguila/constants";
import { AGUILA_RATES } from "./aguila/rates";
import AguilaShippingTools from "./aguila/AguilaShippingTools";
import s from "./aguila/elegant.module.css";
import AguilaMotion from "./aguila/AguilaMotion";

const nav = [
  ["Inicio", "#inicio"],
  ["Tarifas", "#tarifas"],
  ["Tienda online", STORE_URL],
  ["Rastrear", TRACKING_URL],
  ["Mis envíos", PORTAL_URL],
];
const pickupUrl = `${WHATSAPP_URL}?text=${encodeURIComponent("Hola, quiero solicitar la recogida de mis paquetes a domicilio en Miami con Águila Express USA.")}`;

export default function AguilaLanding({
  logoUrl,
}: { logoUrl?: string | null } = {}) {
  const logo = logoUrl || "/aguila/invoice-logo.jpg";
  return (
    <AguilaMotion>
      <a className={s.skip} href="#contenido">
        Saltar al contenido
      </a>
      <div className={s.topbar}>
        <div className={s.container}>
          <a href="tel:+13054974891">
            <Phone size={15} aria-hidden="true" /> +1 (305) 497-4891
          </a>
          <div>
            <Link href="/gestores">
              <Share2 size={14} aria-hidden="true" /> ShareAPP
            </Link>
            <Link href="/login">Iniciar sesión</Link>
          </div>
        </div>
      </div>
      <header className={s.header}>
        <div className={`${s.container} ${s.nav}`}>
          <Link
            href="/"
            className={s.brand}
            aria-label="Águila Express USA, inicio"
          >
            <Image src={logo} alt="" width={76} height={76} preload />
            <span>
              ÁGUILA<strong>EXPRESS USA</strong>
              <small>ENVÍOS DE MIAMI A CUBA</small>
            </span>
          </Link>
          <nav className={s.desktopNav} aria-label="Navegación principal">
            {nav.map(([title, href]) => (
              <Link key={title} href={href}>
                {title}
              </Link>
            ))}
          </nav>
          <a
            href={WHATSAPP_URL}
            aria-label="WhatsApp"
            className={s.whatsapp}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={19} aria-hidden="true" />
            <span>WhatsApp</span>
          </a>
          <details className={s.mobileMenu}>
            <summary aria-label="Abrir menú">
              <Menu size={24} />
              <span>Menú</span>
            </summary>
            <nav aria-label="Navegación móvil">
              {nav.map(([title, href]) => (
                <Link key={title} href={href}>
                  {title}
                </Link>
              ))}
              <Link href="#cotizar">Cotizar</Link>
              <Link href="#servicios">Servicios</Link>
              <Link href="#proceso">Cómo funciona</Link>
            </nav>
          </details>
        </div>
      </header>
      <main id="contenido">
        <section className={s.hero}>
          <div className={`${s.container} ${s.heroCopy}`}>
            <p className={s.eyebrow}>MIAMI → CUBA · POR AIRE Y POR MAR</p>
            <h1>
              Más cerca
              <br /> de los <span>tuyos.</span>
            </h1>
            <p>
              Envíos por avión y marítimos
              <br className={s.desktopBreak} /> de Miami a toda Cuba.
            </p>
            <div className={s.actions}>
              <Link href={STORE_URL} className={s.primary}>
                Entrar a la tienda <ArrowRight size={20} aria-hidden="true" />
              </Link>
              <Link href={TRACKING_URL} className={s.secondary}>
                <Search size={20} aria-hidden="true" /> Rastrear envío
              </Link>
            </div>
            <a className={s.heroRatesLink} href="#tarifas">
              Ver tarifas de envío <ArrowRight size={18} aria-hidden="true" />
            </a>
          </div>
          <div className={s.heroPhoto}>
            <Image
              src="/aguila/landing/hero-elegant-v1.webp"
              alt="El Malecón de La Habana, el mar Caribe y un avión en el cielo"
              fill
              sizes="100vw"
              preload
            />
          </div>
        </section>
        <section
          id="tarifas"
          className={`${s.container} ${s.rates}`}
          aria-labelledby="aguila-rates-title"
        >
          <h2 id="aguila-rates-title" className={s.srOnly}>
            Tarifas de envíos a Cuba
          </h2>
          <div className={s.rateGrid}>
            {AGUILA_RATES.map((rate, index) => {
              const Icon = index === 0 ? Ship : Plane;
              return (
                <article
                  key={rate.id}
                  className={s.rateCard}
                  data-reveal
                  aria-label={rate.title}
                >
                  <div className={s.rateTitle}>
                    <Icon aria-hidden="true" />
                    <h3>{rate.title}</h3>
                  </div>
                  <p className={s.price}>
                    ${rate.rate}
                    <small> / lb</small>
                  </p>
                  <ul>
                    <li>
                      <Check aria-hidden="true" />
                      {rate.coverage}
                    </li>
                    <li>
                      <Check aria-hidden="true" />
                      {rate.timing || rate.detail}
                    </li>
                  </ul>
                  <a
                    aria-label={`Consultar servicio ${rate.title} por WhatsApp`}
                    href={`${WHATSAPP_URL}?text=${encodeURIComponent(`Hola, me interesa un envío ${rate.title} a $${rate.rate} por libra.`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Consultar servicio{" "}
                    <ArrowRight size={16} aria-hidden="true" />
                  </a>
                </article>
              );
            })}
          </div>
          <p className={s.airNote}>
            <Plane size={19} aria-hidden="true" /> Todos los envíos Express son
            por avión.
          </p>
        </section>
        <div className={s.sections}>
          <section
            className={`${s.banner} ${s.pickup}`}
            id="recogida"
            data-reveal
          >
            <div className={s.pickupPhoto}>
              <Image
                src="/aguila/landing/pickup-elegant-v1.webp"
                alt="Repartidor con un paquete frente a una casa en Miami"
                fill
                sizes="(max-width: 760px) 100vw, 50vw"
              />
            </div>
            <div className={s.bannerCopy}>
              <div>
                <h2>
                  Recogemos tus paquetes
                  <br />
                  en tu casa
                </h2>
                <p>Recogida a domicilio en Miami.</p>
                <a
                  href={pickupUrl}
                  className={s.primary}
                  target="_blank"
                  rel="noreferrer"
                >
                  Solicitar recogida <ArrowRight size={18} aria-hidden="true" />
                </a>
              </div>
            </div>
          </section>
          <AguilaShippingTools section="tracking" />
          <section className={`${s.banner} ${s.store}`} data-reveal>
            <Image
              src="/aguila/landing/store-v1.webp"
              alt="Caja con alimentos, productos de aseo y artículos para el hogar"
              fill
              sizes="(max-width: 760px) 100vw, 1200px"
            />
            <div className={s.bannerCopy}>
              <ShoppingCart aria-hidden="true" className={s.bannerIcon} />
              <div>
                <h2>
                  Compra aquí.
                  <br />
                  Sorprende allá.
                </h2>
                <p>
                  Alimentos, aseo, hogar y más,
                  <br />
                  para tu familia en Cuba.
                </p>
                <Link href={STORE_URL} className={s.primary}>
                  Visitar tienda <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </section>
          <AguilaShippingTools section="quote" />
          <section id="servicios" className={s.services} data-reveal>
            <div>
              <Banknote size={30} aria-hidden="true" />
              <h3>Envío de dinero</h3>
              <p>
                Consulta con nuestro equipo las opciones para ayudar a los
                tuyos.
              </p>
              <a
                href={`${WHATSAPP_URL}?text=${encodeURIComponent("Hola, quisiera información sobre el envío de dinero.")}`}
                target="_blank"
                rel="noreferrer"
              >
                Consultar por WhatsApp{" "}
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>
            <div>
              <Package size={30} aria-hidden="true" />
              <h3>Mis envíos</h3>
              <p>
                Accede a tu portal y consulta tus operaciones desde un solo
                lugar.
              </p>
              <Link href={PORTAL_URL}>
                Entrar a mi portal <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <div>
              <Truck size={30} aria-hidden="true" />
              <h3>De tu casa a su puerta</h3>
              <p>
                Coordina tu recogida en Miami y el servicio de envío que
                necesitas.
              </p>
              <a href={pickupUrl} target="_blank" rel="noreferrer">
                Coordinar recogida <ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>
          </section>
          <section id="proceso" className={s.process} data-reveal>
            <div>
              <p className={s.eyebrow}>ASÍ DE SENCILLO</p>
              <h2>De Miami a los tuyos.</h2>
            </div>
            <ol>
              <li>
                <span>01</span>
                <strong>Nos escribes</strong>
                <p>Elige tu modalidad y coordina la recogida.</p>
              </li>
              <li>
                <span>02</span>
                <strong>Preparamos tu envío</strong>
                <p>Registramos tu paquete y te damos su código.</p>
              </li>
              <li>
                <span>03</span>
                <strong>Sigue su recorrido</strong>
                <p>Consulta el estado hasta su entrega.</p>
              </li>
            </ol>
          </section>
        </div>
      </main>
      <footer className={s.footer}>
        <div className={`${s.container} ${s.footerMain}`}>
          <Link href="/" className={s.brand}>
            <Image src={logo} alt="Águila Express USA" width={64} height={64} />
            <span>
              ÁGUILA<strong>EXPRESS USA</strong>
            </span>
          </Link>
          <div className={s.footerContact}>
            <a href="tel:+13054974891">
              <Phone size={21} aria-hidden="true" /> +1 (305) 497-4891
            </a>
            <span>
              <MapPin size={15} aria-hidden="true" /> Miami, Florida
            </span>
          </div>
          <nav className={s.socials} aria-label="Redes sociales">
            <a
              href={FACEBOOK_URL}
              aria-label="Facebook"
              target="_blank"
              rel="noreferrer"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M14 22v-9h3l.5-4H14V7c0-1 .3-2 2-2h2V1.5A24 24 0 0 0 15 1c-3 0-5 2-5 5v3H7v4h3v9Z" />
              </svg>
            </a>
            <a
              href={INSTAGRAM_URL}
              aria-label="Instagram"
              target="_blank"
              rel="noreferrer"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r=".7" fill="currentColor" />
              </svg>
            </a>
            <a
              href={TIKTOK_URL}
              aria-label="TikTok"
              target="_blank"
              rel="noreferrer"
            >
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M16 2h-4v13a3 3 0 1 1-3-3V8a7 7 0 1 0 7 7V8a9 9 0 0 0 5 2V6a5 5 0 0 1-5-4Z" />
              </svg>
            </a>
          </nav>
        </div>
        <div className={`${s.container} ${s.footerBottom}`}>
          <p>© {new Date().getFullYear()} Águila Express USA</p>
          <nav aria-label="Más enlaces">
            <Link href="#servicios">Servicios</Link>
            <Link href="#proceso">Cómo funciona</Link>
            <Link href="/gestores">ShareAPP</Link>
            <Link href="/login">Iniciar sesión</Link>
          </nav>
        </div>
      </footer>
      <a
        className={s.floatingWhatsapp}
        href={WHATSAPP_URL}
        aria-label="Contactar a Águila por WhatsApp"
        target="_blank"
        rel="noreferrer"
      >
        <MessageCircle size={31} />
      </a>
    </AguilaMotion>
  );
}
