'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { isPackageVisible, type TravelPackage } from '@/lib/travel/types';
import { ArrowUpRight, BadgeCheck, BriefcaseBusiness, Car, CircleDollarSign, Clock3, Compass, FileText, FolderHeart, Globe2, HeartHandshake, MapPin, MessageCircle, Phone, Plane, Users } from 'lucide-react';
import TravelExplorer from './TravelExplorer';
import HeroGallery from './HeroGallery';
import GroupExplorer from './GroupExplorer';
import LanguageSelector from './LanguageSelector';
import LuxuryPickup from './LuxuryPickup';
import LuxuryShipping, { type ShippingCatalog, useCommercialCopy } from './LuxuryShipping';
import { LuxuryLanguageProvider, useLuxuryLanguage, translateTree } from './i18n';
import { contact, faqs, services, whatsapp } from './content';
import s from './luxury.module.css';

const icons = { plane: Plane, car: Car, family: Users, passport: Globe2, money: CircleDollarSign, file: FileText, folder: FolderHeart, business: BriefcaseBusiness };
const consult = (subject: string) => whatsapp(`Hola, Luxury Travel Point. Quisiera información sobre ${subject}.`);
const external = { target: '_blank', rel: 'noopener noreferrer' } as const;

export default function LuxuryLanding({ packages = [], catalogError = false, shipping }: { packages?: TravelPackage[]; catalogError?: boolean; shipping?: ShippingCatalog }) { return <LuxuryLanguageProvider><LuxuryContent initialPackages={packages} initialError={catalogError} initialShipping={shipping}/></LuxuryLanguageProvider>; }

function LuxuryContent({ initialPackages, initialError, initialShipping }: { initialPackages: TravelPackage[]; initialError: boolean; initialShipping?: ShippingCatalog }) {
  const [catalog, setCatalog] = useState(initialPackages);
  const [catalogError, setCatalogError] = useState(initialError);
  const [shipping, setShipping] = useState(initialShipping);
  useEffect(() => {
    const controller = new AbortController();
    async function refreshShipping() {
      try {
        const response = await fetch('/api/luxury/shipping', { signal: controller.signal, cache: 'no-store' });
        if (response.ok) setShipping(await response.json());
      } catch { /* Keep the last successful catalog on transient connection errors. */ }
    }
    const timer = setInterval(refreshShipping, 30000);
    window.addEventListener('focus', refreshShipping);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener('focus', refreshShipping);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch('/api/travel/catalog', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Catalog unavailable');
        const body = await response.json();
        setCatalog(body.packages); setCatalogError(false);
      } catch { if (!controller.signal.aborted) setCatalogError(true); }
    }
    const timer = setInterval(refresh, 60000);
    if (initialError) void refresh();
    return () => { controller.abort(); clearInterval(timer); };
  }, [initialError]);
  const packages = catalog.filter(pkg => isPackageVisible(pkg));
  const cruise = packages.find(pkg => pkg.content.category === 'cruise');
  const {language}=useLuxuryLanguage();
  const now = new Date();
  const month = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit' }).formatToParts(now);
  const minMonth = `${month.find(p => p.type === 'year')?.value}-${month.find(p => p.type === 'month')?.value}`;
  const { tr, whatsapp: commercialContact } = useCommercialCopy(shipping);
  const structuredData = { '@context': 'https://schema.org', '@type': 'TravelAgency', name: 'Luxury Travel Point', url: 'https://luxury-travel-point.perlamarketplace.com', telephone: contact.tel, email: contact.email, image: 'https://luxury-travel-point.perlamarketplace.com/luxury/logo.webp', address: { '@type': 'PostalAddress', streetAddress: '3418 51st St W', addressLocality: 'Lehigh Acres', addressRegion: 'FL', postalCode: '33971', addressCountry: 'US' }, openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'], opens: '10:00', closes: '18:00' }, { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Sunday', opens: '10:00', closes: '16:00' }] };
  return translateTree(<div className={s.root} id="inicio">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    <a href="#contenido" className={s.skip}>Saltar al contenido</a>
    <div className={s.topbar}><span>DMC EN ESTADOS UNIDOS Y CUBA · AGENCIA RECEPTIVA Y EMISORA</span><a href={`tel:${contact.tel}`}><Phone size={12} /> {contact.phone}<span> · Atención a distancia 24/7</span></a></div>
    <header className={s.header}><nav className={s.nav} aria-label="Navegación principal"><a className={s.brand} href="#inicio" aria-label="Luxury Travel Point, inicio"><Image src="/luxury/airplane.webp" width={77} height={48} alt="" preload /><span>LUXURY<small>Travel Point</small></span></a><div className={s.desktopNav}><a href="#destinos">Viajes en grupo</a><a href="#experiencias">Experiencias</a>{cruise && <a href="#cruceros">Cruceros</a>}<a href="#envios">Envíos a Cuba</a><a href="#servicios">Más servicios</a></div><LanguageSelector /><a className={s.headerContact} href="#contacto">Hablemos <ArrowUpRight size={17} /></a><details className={s.mobileMenu}><summary>Menú</summary><div><a href="#destinos">Viajes en grupo</a><a href="#experiencias">Experiencias</a>{cruise && <a href="#cruceros">Cruceros</a>}<a href="#envios">Envíos a Cuba</a><a href="#servicios">Más servicios</a><a href="#contacto">Contacto</a></div></details></nav></header>
    <main id="contenido">
      <HeroGallery />
      <div className={s.container}><GroupExplorer packages={packages} error={catalogError}/><TravelExplorer minMonth={minMonth} packages={packages}/></div>
      <section id="experiencias" className={s.experiences}><div className={s.container}><p className={s.eyebrow}>NO TODOS VIAJAMOS IGUAL</p><div className={s.sectionHeading}><h2>Tu manera de viajar.<br /><em>Nuestro punto de partida.</em></h2><p className={s.experienceIntro}>Un destino es solo el comienzo. Diseñamos contigo la forma de vivirlo.</p></div><div className={s.experienceGrid}>{[{icon: Users, title: 'Juntos se vive mejor', text: 'Viajes en grupo para descubrir el mundo compartiendo cada experiencia.', subject: 'viajes en grupo'}, {icon: Compass, title: 'A tu ritmo', text: 'Viajes privados y recorridos personalizados según tus intereses.', subject: 'un viaje privado'}, {icon: HeartHandshake, title: 'El mejor destino: reencontrarse', text: 'Escapadas familiares y opciones de reunificación en Punta Cana.', subject: 'reunificación familiar en Punta Cana'}, {icon: BadgeCheck, title: 'Cada detalle cuenta', text: 'Asesoría para coordinar vuelos, hoteles, traslados y experiencias.', subject: 'planificar mi viaje completo'}].map(({icon: Icon, title, text, subject},i) => <a key={title} className={s.experienceItem} href={consult(subject)} {...external}><span className={s.experienceIndex}>0{i+1}</span><Icon size={28} strokeWidth={1.3} /><h3>{title}</h3><p>{text}</p><ArrowUpRight size={18} /></a>)}</div></div></section>
      {cruise && <section id="cruceros" className={s.cruise}><div className={s.cruisePhoto}><Image src={cruise.content.image} alt={cruise.content.title} fill sizes="(max-width: 800px) 100vw, 55vw"/></div><div className={s.cruiseText}><p className={s.eyebrow}>LA VIDA SE DISFRUTA A BORDO</p><h2>{cruise.content.title}</h2><p>{cruise.content.description}</p><a className={s.goldButton} href={`/viajes/${cruise.id}`}>Ver programa y salidas <ArrowUpRight size={19}/></a></div></section>}
      <section className={s.process}><div className={s.container}><div><p className={s.eyebrow}>DE LA IDEA AL ITINERARIO</p><h2>Nosotros te acompañamos.<br /><em>Tú disfruta el camino.</em></h2></div><ol>{[['Cuéntanos tu idea', 'Destino, fechas, viajeros y lo que te gustaría vivir.'],['Damos forma a tu viaje', 'Recibe opciones y consulta itinerario, precio e inclusiones.'],['Confirma y empieza a soñar', 'Revisa las condiciones con tu asesor antes de reservar.']].map(([title,text],i) => <li key={title}><span>0{i+1}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol></div></section>
      <section id="envios" className={s.shipping}><div className={s.container}>
        <LuxuryShipping catalog={shipping} />
        <LuxuryPickup />
      </div></section>
      <section id="servicios" className={`${s.container} ${s.services}`}><div className={s.sectionHeading}><div><p className={s.eyebrow}>UNA AGENCIA, MUCHAS SOLUCIONES</p><h2>Además de viajar,<br /><em>cuenta con nosotros.</em></h2></div><p>Servicios para tus viajes, tu familia y tus gestiones del día a día, con atención personalizada.</p></div><div className={s.servicesGrid}>{services.map(item => { const Icon = icons[item.icon as keyof typeof icons]; return <article key={item.title}><Icon size={26} strokeWidth={1.3} /><h3>{item.title}</h3><p>{item.text}</p><a href={consult(item.title)} {...external} aria-label={`Consultar ${item.title}`}>Consultar <ArrowUpRight size={16} /></a></article>; })}
        <article><Plane size={26}/><h3>{tr('Boletos Aéreos y Seguros de Viaje', 'Flights and Travel Insurance', 'Vols et assurances voyage')}</h3>
          <p>{tr('Vuelos regulares y chárter a Cuba. Consulta también opciones de seguros de viaje.', 'Scheduled and charter flights to Cuba. Ask about travel insurance options.', 'Vols réguliers et charters vers Cuba. Renseignez-vous aussi sur les assurances voyage.')}</p>
          <a href={commercialContact(tr('vuelos y seguros de viaje', 'flights and travel insurance', 'les vols et assurances voyage'))} {...external}>WhatsApp <ArrowUpRight size={16}/></a>
        </article>
        <article><CircleDollarSign size={26}/><h3>{tr('Remesas y recargas', 'Remittances and top-ups', 'Transferts d’argent et recharges')}</h3>
          <p>{tr('Consulta la disponibilidad de nuestro servicio de remesas en Cuba. Si hay cobertura en tu destino, contáctanos.', 'Check availability for our remittance service in Cuba. If your destination is covered, contact us.', 'Vérifiez la disponibilité de notre service de transfert d’argent à Cuba. Si votre destination est couverte, contactez-nous.')}</p>
          <a href="https://billetera.cc/cobertura" {...external}>{tr('Consultar disponibilidad', 'Check availability', 'Vérifier la disponibilité')} <ArrowUpRight size={16}/></a>
          <a href={commercialContact(tr('remesas a Cuba', 'remittances to Cuba', 'les transferts d’argent vers Cuba'))} {...external}>{tr('Solicitar remesa por WhatsApp', 'Ask about remittances on WhatsApp', 'Demander un transfert sur WhatsApp')} <ArrowUpRight size={16}/></a>
        </article>
      </div></section>
      <section className={s.faqSection}><div className={s.container}><div><p className={s.eyebrow}>ANTES DE EMPEZAR</p><h2>Resolvemos<br />tus <em>dudas.</em></h2><p>Y si te queda alguna más,<br />estamos a un mensaje.</p><a className={s.textButton} href={consult('sus servicios')} {...external}>Hablar con el equipo <ArrowUpRight size={17} /></a></div><div className={s.faqList}>{faqs.map(([q,a]) => <details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></div></section>
      <section id="contacto" className={s.contact}><div className={s.container}><div className={s.contactLead}><p className={s.eyebrow}>TU PRÓXIMO VIAJE EMPIEZA CON UNA CONVERSACIÓN</p><h2>¿Y si empezamos<br />a <em>planearlo?</em></h2><p>Visítanos en Lehigh Acres o cuéntanos tu idea desde donde estés. Estamos para ayudarte.</p><a className={s.goldButton} href={consult('planificar mi próximo viaje')} {...external}>Conversemos por WhatsApp <MessageCircle size={20} /></a></div><div className={s.contactInfo}><div><Phone size={21}/><div><small>LLÁMANOS O ESCRÍBENOS</small><a href={`tel:${contact.tel}`}>{contact.phone}</a><span>Atención a distancia 24/7</span></div></div><div><MapPin size={21}/><div><small>VISÍTANOS</small><p>{contact.address}</p><a className={s.directions} href={contact.maps} {...external}>Abrir en Google Maps <ArrowUpRight size={15}/></a></div></div><div><Clock3 size={21}/><div><small>HORARIO DE OFICINA</small><p>Lunes–sábado: 10 a. m.–6 p. m.<br/>Domingos: 10 a. m.–4 p. m.</p><span>Te recibimos cualquier día fuera de horario con consulta previa. Atención en línea las 24 horas.</span></div></div><a className={s.email} href={`mailto:${contact.email}`}>{contact.email} <ArrowUpRight size={16}/></a></div></div></section>
    </main>
    <footer className={s.footer}><div className={s.container}><a className={s.footerBrand} href="#inicio"><Image src="/luxury/airplane.webp" alt="" width={85} height={52}/><span>LUXURY<small>Travel Point</small></span></a><p>Your starting point<br/>to a luxury experience.</p><div><a href="https://www.facebook.com/share/1EjE5oAU7L/" {...external}>Facebook <ArrowUpRight size={14}/></a><a href="https://www.instagram.com/luxurytravelpoint/" {...external}>Instagram <ArrowUpRight size={14}/></a><a href="https://www.tiktok.com/@luxurytravelpoint" {...external}>TikTok <ArrowUpRight size={14}/></a></div></div><div className={`${s.container} ${s.footerBottom}`}><span>© {now.getFullYear()} Luxury Travel Point</span><span>Lehigh Acres, Florida · Viajes y multiservicios</span><a href="/login">Iniciar sesión <ArrowUpRight size={13}/></a></div></footer>
    <a className={s.floatingWhatsapp} href={consult('sus viajes y servicios')} {...external} aria-label="Contactar a Luxury Travel Point por WhatsApp"><MessageCircle size={25}/><span>¿Planeamos tu viaje?</span></a>
  </div>,language);
}
