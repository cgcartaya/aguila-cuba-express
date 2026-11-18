import { BadgeCheck, Eye, FlagTriangleRight, Handshake, Lightbulb, Mountain, Scale, ShieldCheck, Target, Truck, UserRound } from "lucide-react";
import { wfCopy, type WfLocale } from "./Language";
import NotaryNotice from "./NotaryNotice";
import s from "./wfcargo.module.css";

export default function AboutSection({ locale }: { locale: WfLocale }) {
  const t = wfCopy(locale);
  const values = [
    [Eye, t("Transparencia", "Transparency"), t("Tarifas claras, sin cargos ocultos, y una comunicación honesta en cada transacción.", "Clear rates, no hidden charges, and honest communication in every transaction.")],
    [ShieldCheck, t("Confiabilidad", "Reliability"), t("Gestionamos cada envío y cada trámite con rigor, responsabilidad y seguimiento oportuno.", "We handle every shipment and request with care, accountability, and timely follow-up.")],
    [Truck, t("Agilidad", "Responsiveness"), t("Gracias a nuestra transportación propia, respondemos con rapidez a cada solicitud de recogida.", "Our own fleet helps us respond quickly to every pickup request.")],
    [BadgeCheck, t("Excelencia en el servicio", "Service excellence"), t("Ofrecemos atención personalizada y profesional, orientada a superar las expectativas del cliente.", "We offer personalized, professional service and strive to exceed customer expectations.")],
    [Scale, t("Integridad", "Integrity"), t("Actuamos con ética y cumplimos con todas las regulaciones federales, estatales e internacionales aplicables.", "We act ethically and comply with applicable federal, state, and international regulations.")],
    [Handshake, t("Compromiso comunitario", "Community commitment"), t("Contribuimos al bienestar de la comunidad hispana con servicios accesibles y de calidad.", "We support the Hispanic community through accessible, high-quality services.")],
    [Lightbulb, t("Innovación", "Innovation"), t("Mejoramos continuamente nuestros procesos y servicios para responder a las necesidades del mercado.", "We continually improve our processes and services to meet changing market needs.")],
  ] as const;

  return (
    <section id="quienes-somos" className={`${s.section} ${s.about}`} aria-labelledby="wf-about-heading">
      <div className={s.sectionHeading}>
        <h2 id="wf-about-heading">{t("Quiénes somos", "About us")}</h2>
      </div>
      <div className={s.aboutIntro}>
        <p>{t("WF Cargo Envíos es una empresa de logística internacional y servicios integrales con sede en Port St. Lucie, Florida, y forma parte de Fournier Investment Services LLC. Desde que la adquirimos en enero de 2025, la empresa ha crecido de forma sostenida y hoy opera dos sucursales en Port St. Lucie: una en US Highway 1 y otra en Bayshore Boulevard.", "WF Cargo Envíos is an international logistics and full-service company based in Port St. Lucie, Florida, and part of Fournier Investment Services LLC. Since we acquired it in January 2025, the company has grown steadily and now operates two Port St. Lucie branches: one on US Highway 1 and one on Bayshore Boulevard.")}</p>
        <p>{t("Nos especializamos en el envío de carga hacia Cuba, República Dominicana y Colombia. Contamos con flota de transporte propia para la recogida de paquetería a domicilio, lo que nos permite responder con rapidez a las solicitudes de nuestros clientes y controlar directamente cada etapa del proceso logístico.", "We specialize in shipping to Cuba, the Dominican Republic, and Colombia. Our own fleet handles residential package pickups, so we can respond quickly and directly manage every stage of the logistics process.")}</p>
        <p>{t("Además, ofrecemos un portafolio de servicios complementarios: transferencias de dinero, servicios de Notary Public, apostillas, traducciones certificadas, preparación de impuestos, gestión de trámites consulares cubanos, recargas internacionales y casillero virtual. Nuestro modelo de negocio se basa en la eficiencia operativa, la transparencia en los precios y un servicio personalizado. Así nos hemos consolidado como un aliado de confianza para la comunidad hispana del Condado de St. Lucie.", "We also offer money transfers, Notary Public services, apostilles, certified translations, tax preparation, Cuban consular document assistance, international mobile top-ups, and a virtual locker. Our business is built on efficient operations, transparent pricing, and personalized service. This approach has made us a trusted partner to the Hispanic community in St. Lucie County.")}</p>
        <NotaryNotice />
      </div>
      <div className={s.purposeGrid}>
        <article className={s.mission}>
          <div className={s.purposeHeader}>
            <span className={s.purposeIcon}><Target size={34} aria-hidden="true" /></span>
            <h3>{t("Misión", "Mission")}</h3>
          </div>
          <p>{t("Brindar soluciones de logística y servicios integrales seguras, eficientes y accesibles, que fortalezcan el vínculo entre las familias hispanas en Estados Unidos y sus seres queridos en Latinoamérica. Lo hacemos con estándares de calidad, cumplimiento normativo, atención personalizada y una respuesta ágil, apoyada en nuestra propia infraestructura de transporte.", "Provide safe, efficient, and accessible logistics and related services that strengthen the connection between Hispanic families in the United States and their loved ones in Latin America. We do this through quality standards, regulatory compliance, personalized attention, and responsive service supported by our own transportation infrastructure.")}</p>
        </article>
        <article className={s.vision}>
          <div className={s.purposeHeader}>
            <span className={`${s.purposeIcon} ${s.summitIcon}`}>
              <Mountain size={34} aria-hidden="true" />
              <FlagTriangleRight size={19} aria-hidden="true" />
            </span>
            <h3>{t("Visión", "Vision")}</h3>
          </div>
          <p>{t("Consolidarnos como la empresa líder en logística y servicios integrales para la comunidad hispana de Florida. Para lograrlo, ampliaremos nuestra presencia con nuevas sucursales, más capacidad de transporte propio y alianzas estratégicas, y seguiremos siendo un referente de confiabilidad, transparencia y excelencia en el servicio.", "Become Florida’s leading logistics and full-service provider for the Hispanic community. We will expand through new branches, greater capacity in our own fleet, and strategic partnerships, while continuing to set a standard for reliability, transparency, and service excellence.")}</p>
        </article>
      </div>
      <h3 className={s.aboutSubheading}>{t("Valores corporativos", "Corporate values")}</h3>
      <dl className={s.aboutValues}>
        {values.map(([Icon, name, description]) => (
          <div key={name}>
            <dt><span className={s.valueIcon}><Icon size={20} aria-hidden="true" /></span>{name}</dt>
            <dd>{description}</dd>
          </div>
        ))}
      </dl>
      <h3 className={s.aboutSubheading}>{t("Nuestro liderazgo", "Our leadership")}</h3>
      <div className={s.leadershipGrid}>
        {[
          ["Alexander Fournier", "CEO"],
          ["Janett Fournier", t("Vicepresidenta", "Vice President")],
        ].map(([name, role]) => (
          <article key={name}>
            <span className={s.valueIcon}><UserRound size={22} aria-hidden="true" /></span>
            <div><h4>{name}</h4><p>{role}</p></div>
          </article>
        ))}
      </div>
    </section>
  );
}
