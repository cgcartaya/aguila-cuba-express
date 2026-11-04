import Image from "next/image";
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
import { branches, procedures, faqs, whatsapp } from "./content";
import s from "./wfcargo.module.css";
const services = [
  {
    icon: Package,
    name: "Enviar paquetes",
    text: "Cuba, R. Dominicana y Colombia",
    href: "#cotizador",
  },
  {
    icon: Truck,
    name: "Solicitar recogida",
    text: "Para tus envíos a Cuba",
    href: "#recogida",
  },
  {
    icon: FileText,
    name: "Trámites cubanos",
    text: "Pasaportes, visas y documentos",
    href: "#tramites",
  },
  {
    icon: Wallet,
    name: "Enviar remesas",
    text: "Cerca de quienes más quieres",
    href: "#remesas",
  },
  {
    icon: Car,
    name: "Renta de autos",
    text: "Planea tu próxima visita a Cuba",
    href: "#viajes",
  },
  {
    icon: Grid2X2,
    name: "Otros servicios",
    text: "Soluciones en un mismo lugar",
    href: "#multiservicios",
  },
];
export function ServiceGrid() {
  return (
    <section id="servicios" className={s.section}>
      <div className={s.sectionHeading}>
        <p className={s.kicker}>UN SOLO LUGAR. MUCHAS SOLUCIONES.</p>
        <h2>¿Qué necesitas hacer hoy?</h2>
        <p>Elige un servicio. Nosotros te acompañamos en el siguiente paso.</p>
      </div>
      <div className={s.serviceGrid}>
        {services.map(({ icon: Icon, ...item }) => (
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
export function ProcedureSection() {
  return (
    <section id="tramites" className={s.tool}>
      <div className={s.toolHeading}>
        <FileText />
        <div>
          <span>TRÁMITES SIN FRONTERAS</span>
          <h2>Pasaportes y documentos</h2>
        </div>
      </div>
      <div className={s.toolBody}>
        <p className={s.muted}>
          Gestiona tus trámites cubanos con atención personalizada en nuestra
          sucursal de US 1.
        </p>
        <div className={s.procedureList}>
          {procedures.map((p) => (
            <a
              key={p.name}
              href={whatsapp(
                `Hola, quisiera conocer los requisitos y confirmar la tarifa de ${p.name}.`,
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>{p.name}</span>
              <strong>${p.price}</strong>
              <ArrowRight size={15} />
            </a>
          ))}
        </div>
        <p className={s.small}>
          Tarifas publicadas por WF Cargo. Confirma requisitos, vigencia y
          condiciones antes de iniciar tu trámite.
        </p>
        <p className={s.comingSoon}>
          Ciudadanía / renuncia cubana · Próximamente, diciembre de 2026
        </p>
      </div>
    </section>
  );
}
export function Benefits() {
  return (
    <div className={s.benefits}>
      {[
        {
          icon: Package,
          title: "Cajas desde $50",
          text: "Modalidades para tu envío",
        },
        {
          icon: ShieldCheck,
          title: "Entrega incluida en Cuba",
          text: "A domicilio, según cobertura",
        },
        {
          icon: HeartHandshake,
          title: "Atención personalizada",
          text: "Tu agencia de confianza",
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
export function FeaturedServices() {
  return (
    <section className={`${s.section} ${s.featured}`}>
      <article id="remesas" className={s.featureCard}>
        <Image
          src="/wfcargo/remesas.webp"
          alt="Promoción de remesas a Cuba de WF Cargo"
          width={590}
          height={665}
          className={s.promoImage}
        />
        <div>
          <p className={s.kicker}>CONEXIONES QUE IMPORTAN</p>
          <h2>
            Tu familia,
            <br />
            siempre más cerca.
          </h2>
          <p>
            Remesas a Cuba y Latinoamérica. Consulta las opciones, tasas y
            condiciones disponibles con nuestro equipo.
          </p>
          <a
            className={s.button}
            href={whatsapp(
              "Hola, quisiera información sobre remesas y las tasas disponibles.",
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            Consultar remesas
            <ArrowRight size={18} />
          </a>
        </div>
      </article>
      <article id="viajes" className={s.featureCard}>
        <Image
          src="/wfcargo/autos.webp"
          alt="Promoción de renta de autos en Cuba de WF Cargo"
          width={560}
          height={700}
          className={s.promoImage}
        />
        <div>
          <p className={s.kicker}>PLANEA TU PRÓXIMA VISITA</p>
          <h2>
            Nos vemos
            <br />
            en Cuba.
          </h2>
          <p>
            Renta de autos y reservas de hotel en Cuba. Cuéntanos tus fechas y
            te ayudamos a consultar disponibilidad.
          </p>
          <a
            className={s.button}
            href={whatsapp(
              "Hola, quisiera consultar disponibilidad de renta de autos y hoteles en Cuba.",
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            Planear mi viaje
            <ArrowRight size={18} />
          </a>
        </div>
      </article>
    </section>
  );
}
export function OtherServices() {
  return (
    <section id="multiservicios" className={`${s.section} ${s.other}`}>
      <div className={s.sectionHeading}>
        <p className={s.kicker}>MUCHO MÁS QUE ENVÍOS</p>
        <h2>Resuelve más, en un mismo lugar.</h2>
      </div>
      <div className={s.otherGrid}>
        {[
          "Notaría pública",
          "Apostillas y traducciones",
          "Preparación de impuestos",
          "Llenado de formularios",
          "Recargas a Latinoamérica",
          "Agencia de viajes",
        ].map((name) => (
          <a
            key={name}
            href={whatsapp(`Hola, quisiera información sobre ${name}.`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FileText size={21} />
            {name}
            <ArrowRight size={16} />
          </a>
        ))}
      </div>
      <p className={s.small}>
        No ofrecemos asesoría legal ni de inmigración. Consulta disponibilidad y
        requisitos por sucursal.
      </p>
    </section>
  );
}
export function Branches() {
  return (
    <section id="sucursales" className={s.section}>
      <div className={s.sectionHeading}>
        <p className={s.kicker}>ESTAMOS CERCA DE TI</p>
        <h2>Dos sucursales. La misma confianza.</h2>
        <p>Visítanos en Port St. Lucie.</p>
      </div>
      <div className={s.branchGrid}>
        {branches.map((b) => (
          <article className={s.branch} key={b.name}>
            <div className={s.branchTop}>
              <MapPin size={29} />
              <div>
                <p className={s.kicker}>{b.focus}</p>
                <h3>{b.name}</h3>
              </div>
            </div>
            <p>{b.address}</p>
            <p className={s.muted}>{b.services}</p>
            <p className={s.hours}>
              <Clock size={17} />
              Lun–Vie 10:00 a. m.–7:00 p. m.
              <br />
              Sáb 10:00 a. m.–2:00 p. m. · Dom cerrado
            </p>
            <div className={s.actions}>
              <a
                className={s.button}
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Cómo llegar
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
export function FaqSection() {
  return (
    <section id="preguntas" className={`${s.section} ${s.faq}`}>
      <div>
        <p className={s.kicker}>TE AYUDAMOS A RESOLVER</p>
        <h2>
          Antes de enviar,
          <br />
          resuelve tus dudas.
        </h2>
        <p>Información clara para dar el siguiente paso.</p>
        <a
          className={s.textLink}
          href={whatsapp("Hola, tengo una consulta sobre sus servicios.")}
          target="_blank"
          rel="noopener noreferrer"
        >
          Hablar con nuestro equipo
          <ArrowRight size={18} />
        </a>
      </div>
      <div>
        {faqs.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
