import { wfCopy, type WfLocale } from "./Language";
import {
  ArrowRight,
  Package,
  Truck,
  FileText,
  Wallet,
  Car,
  Grid2X2,
  MapPin,
  Phone,
  Clock,
  ShieldCheck,
  HeartHandshake,
} from "lucide-react";
import { branches, faqs, whatsapp } from "./content";
import NotaryNotice from "./NotaryNotice";
import s from "./wfcargo.module.css";
function getServices(t: ReturnType<typeof wfCopy>) {
  return [
    {
      icon: Package,
      name: t("Enviar paquetes", "Send packages"),
      text: t("Cuba, R. Dominicana y Colombia", "Cuba, Dominican Republic, and Colombia"),
      href: "#cotizador",
    },
    {
      icon: Truck,
      name: t("Solicitar recogida", "Request a pickup"),
      text: t("Para tus envíos a Cuba", "For shipments to Cuba"),
      href: "#recogida",
    },
    {
      icon: FileText,
      name: t("Trámites", "Document services"),
      text: t("Pasaportes, visas y documentos", "Passports, visas, and documents"),
      href: "#tramites",
    },
    {
      icon: Wallet,
      name: t("Enviar remesas", "Send money"),
      text: t("Cerca de quienes más quieres", "Stay close to your loved ones"),
      href: whatsapp(t("Hola, quisiera información sobre remesas.", "Hello, I’d like information about money transfers.")),
    },
    {
      icon: Car,
      name: t("Renta de autos", "Car rentals"),
      text: t("Planea tu próxima visita a Cuba", "Plan your next trip to Cuba"),
      href: "#tramites",
    },
    {
      icon: Grid2X2,
      name: t("Otros servicios", "Other services"),
      text: t("Soluciones en un mismo lugar", "Several services in one place"),
      href: whatsapp(t("Hola, quisiera información sobre sus otros servicios.", "Hello, I’d like information about your other services.")),
    },
  ];
}
export function ServiceGrid({ locale }: { locale: WfLocale }) {
  const t = wfCopy(locale);
  return (
    <section id="servicios" className={s.section}>
      <div className={s.sectionHeading}>
        <p className={s.kicker}>{t("UN SOLO LUGAR. MUCHAS SOLUCIONES.", "SEVERAL SERVICES IN ONE PLACE")}</p>
        <h2>{t("¿Qué necesitas hacer hoy?", "How can we help today?")}</h2>
        <p>{t("Elige un servicio. Nosotros te acompañamos en el siguiente paso.", "Choose a service and we’ll help you with the next step.")}</p>
      </div>
      <div className={s.serviceGrid}>
        {getServices(t).map(({ icon: Icon, ...item }) => (
          <a key={item.name} href={item.href} className={s.serviceCard}>
            <span className={s.serviceIcon}>
              <Icon size={29} />
            </span>
            <span>
              <h3>{item.name}</h3>
              <p>{item.text}</p>
            </span>
            <ArrowRight size={19} />
          </a>
        ))}
      </div>
    </section>
  );
}
export function Benefits({ locale }: { locale: WfLocale }) {
  const t = wfCopy(locale);
  return (
    <div className={s.benefits}>
      {[
        {
          icon: Package,
          title: t("Cajas desde $50", "Boxes from $50"),
          text: t("Modalidades para tu envío", "Options for your shipment"),
        },
        {
          icon: ShieldCheck,
          title: t("Entrega incluida en Cuba", "Delivery included in Cuba"),
          text: t("A domicilio, según cobertura", "Home delivery where available"),
        },
        {
          icon: HeartHandshake,
          title: t("Atención personalizada", "Personalized service"),
          text: t("Tu agencia de confianza", "Your local shipping agency"),
        },
      ].map(({ icon: Icon, title, text }) => (
        <div key={title}>
          <Icon size={28} />
          <span>
            <strong>{title}</strong>
            <small>{text}</small>
          </span>
        </div>
      ))}
    </div>
  );
}
export function Branches({ locale }: { locale: WfLocale }) {
  const t = wfCopy(locale);
  return (
    <section id="sucursales" className={s.section}>
      <div className={s.sectionHeading}>
        <p className={s.kicker}>{t("ESTAMOS CERCA DE TI", "FIND US NEAR YOU")}</p>
        <h2>{t("Dos sucursales. La misma confianza.", "Two locations, the same dependable service.")}</h2>
        <p>{t("Visítanos en Port St. Lucie.", "Visit us in Port St. Lucie.")}</p>
      </div>
      <div className={s.branchGrid}>
        {branches.map((b) => (
          <article className={s.branch} key={b.name}>
            <div className={s.branchTop}>
              <MapPin size={29} />
              <div>
                <p className={s.kicker}>{locale === "en" ? b.focusEn : b.focus}</p>
                <h3>{b.name}</h3>
              </div>
            </div>
            <p>{b.address}</p>
            <p className={s.muted}>{locale === "en" ? b.servicesEn : b.services}</p>
            {b.services.includes("Notary Public") && <NotaryNotice />}
            <p className={s.hours}>
              <Clock size={17} />
              {t("Lun–Vie 10:00 a. m.–7:00 p. m.", "Mon–Fri 10:00 a.m.–7:00 p.m.")}
              <br />
              {t("Sáb 10:00 a. m.–2:00 p. m. · Dom cerrado", "Sat 10:00 a.m.–2:00 p.m. · Closed Sunday")}
            </p>
            <div className={s.actions}>
              <a
                className={s.button}
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("Cómo llegar", "Get directions")}
                <ArrowRight size={16} />
              </a>
              <a
                className={s.textLink}
                href={`tel:+1${b.phone.replaceAll("-", "")}`}
              >
                <Phone size={16} />
                {b.phone}
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
export function FaqSection({ locale }: { locale: WfLocale }) {
  const t = wfCopy(locale);
  return (
    <section id="preguntas" className={`${s.section} ${s.faq}`}>
      <div>
        <p className={s.kicker}>{t("TE AYUDAMOS A RESOLVER", "WE’RE HERE TO HELP")}</p>
        <h2>
          {t("Antes de enviar,", "Before you ship,")}
          <br />
          {t("resuelve tus dudas.", "get your questions answered.")}
        </h2>
        <p>{t("Información clara para dar el siguiente paso.", "Find the information you need to get started.")}</p>
        <a
          className={s.textLink}
          href={whatsapp(t("Hola, tengo una consulta sobre sus servicios.", "Hello, I have a question about your services."))}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("Hablar con nuestro equipo", "Talk to our team")}
          <ArrowRight size={18} />
        </a>
      </div>
      <div>
        {faqs[locale].map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
