import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { localized, pages, type Locale } from '@/lib/luxury/dmc/content';
import { DmcInquiryForm } from './DmcInquiryForm';
import dmc from './dmc.module.css';
import s from './mice.module.css';

export const miceHero = '/luxury/mice/reception.webp';

const experiences = [
  {
    image: '/luxury/mice/meetings.webp',
    title: ['Meetings & Conferences', 'Reuniones y congresos'],
    text: ['From executive meetings to multi-day conferences, we help find the right venue, coordinate suppliers and keep the agenda moving on site.', 'Desde reuniones ejecutivas hasta congresos de varios días, te ayudamos a elegir la sede, coordinar proveedores y llevar la agenda en el lugar.'],
  },
  {
    image: '/luxury/mice/incentives.webp',
    title: ['Incentive Travel', 'Viajes de incentivo'],
    text: ['Reward your team with a program built around the destination, from private group activities and tailored itineraries to coordinated transfers.', 'Reconoce a tu equipo con un programa diseñado en torno al destino, con actividades privadas, itinerarios a medida y traslados coordinados.'],
  },
  {
    image: '/luxury/mice/galas.webp',
    title: ['Galas & Special Events', 'Galas y eventos especiales'],
    text: ['Bring guests together for a gala dinner, a corporate celebration or a private reception with VIP hospitality.', 'Reúne a tus invitados en una cena de gala, una celebración corporativa o una recepción privada con hospitalidad VIP.'],
  },
] as const;

const steps = [
  [['Discovery', 'Consulta inicial'], ['Tell us about your audience, dates and goals.', 'Cuéntanos quiénes asistirán, las fechas y los objetivos.']],
  [['Custom proposal', 'Propuesta personalizada'], ['Review options shaped around your priorities.', 'Revisa opciones preparadas según tus prioridades.']],
  [['Planning', 'Planificación'], ['Align the venue, suppliers, transfers and schedule.', 'Coordina la sede, los proveedores, los traslados y la agenda.']],
  [['Event delivery', 'Ejecución'], ['Keep the program on track with on-site coordination.', 'Mantén el programa en marcha con coordinación en el lugar.']],
] as const;

export function MiceEditorial({ locale }: { locale: Locale }) {
  const t = (en: string, es: string) => localized([en, es], locale);
  const page = pages['mice-events'];
  return <main className={s.page}>
    <section className={s.hero}>
      <Image src={miceHero} alt="" fill sizes="100vw" preload />
      <div className={s.heroContent}>
        <p className={s.eyebrow}>{localized(page.label, locale)}</p>
        <h1>{localized(page.title, locale)}</h1>
        <p className={s.lead}>{localized(page.description, locale)}</p>
        <div className={s.actions}>
          <a className={dmc.button} href="#proposal">{t('Request an Event Proposal', 'Solicita una propuesta para tu evento')} <ArrowRight size={18} aria-hidden /></a>
          <Link className={dmc.secondary} href={`/${locale}/our-services`}>{t('Explore Our Services', 'Explora nuestros servicios')}</Link>
        </div>
      </div>
    </section>
    <section className={s.experiences} aria-labelledby="mice-experiences">
      <h2 id="mice-experiences">{t('Corporate experiences', 'Experiencias corporativas')}</h2>
      {experiences.map(({ image, title, text }) => (
        <article className={s.experience} key={image}>
          <Image src={image} alt="" width={960} height={720} sizes="(max-width: 760px) 92vw, 48vw" />
          <div>
            <h3>{localized(title, locale)}</h3>
            <p>{localized(text, locale)}</p>
          </div>
        </article>
      ))}
      <p className={s.caption}>{t('Illustrative imagery', 'Imágenes ilustrativas')}</p>
    </section>
    <section className={s.coordination}>
      <div className={s.wrap}>
        <h2>{t('From the first conversation to event day', 'De la primera conversación al día del evento')}</h2>
        <p className={s.lead}>{t('We can bring venues, transportation, activities and local logistics together in one plan.', 'Podemos reunir la sede, el transporte, las actividades y la logística local en un solo plan.')}</p>
        <ol className={s.steps}>
          {steps.map(([title, description]) => <li key={title[0]}>
            <h3>{localized(title, locale)}</h3>
            <p>{localized(description, locale)}</p>
          </li>)}
        </ol>
        <Link className={s.destinationLink} href={`/${locale}/destinations`}>{t('Explore destinations and ask about availability', 'Explora destinos y consulta disponibilidad')} <ArrowRight size={17} aria-hidden /></Link>
      </div>
    </section>
    <div className={s.proposal}><DmcInquiryForm locale={locale} kind="event" /></div>
  </main>;
}
