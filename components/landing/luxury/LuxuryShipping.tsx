'use client';

import Image from 'next/image';
import { ArrowUpRight, MessageCircle, Package } from 'lucide-react';
import { useLuxuryLanguage } from './i18n';
import { contact } from './content';
import { secureUrl, shippingStatus, type ShippingEntry } from '@/lib/luxury/shipping';
import s from './luxury.module.css';

export type ShippingCatalog = { entries: ShippingEntry[]; whatsapp: string };
export const external = { target: '_blank', rel: 'noopener noreferrer' } as const;

export function useCommercialCopy(catalog?: ShippingCatalog) {
  const { language } = useLuxuryLanguage();
  const tr = (es: string, en: string, fr: string) => ({ es, en, fr })[language];
  const whatsapp = (subject: string, message?: string) => {
    const text = message || tr(
      `Hola, Luxury Travel Point. Quisiera información sobre ${subject}.`,
      `Hello, Luxury Travel Point. I’d like information about ${subject}.`,
      `Bonjour, Luxury Travel Point. Je souhaiterais des renseignements sur ${subject}.`,
    );
    return `${catalog?.whatsapp || `https://wa.me/${contact.whatsapp}`}?text=${encodeURIComponent(text)}`;
  };
  return { language, tr, whatsapp };
}

export default function LuxuryShipping({ catalog }: { catalog?: ShippingCatalog }) {
  const { language, tr, whatsapp } = useCommercialCopy(catalog);
  const entries = catalog?.entries ?? [];
  const rates = entries.filter(row => row.section === 'rate');
  const promotions = entries.filter(row => row.section === 'promotion' && shippingStatus(row) === 'active');
  const services = entries.filter(row => row.section === 'special' || row.section === 'online');
  function card(row: ShippingEntry) {
    const copy = row.copy[language];
    const url = row.section === 'online' && secureUrl(row.external_url);
    return <article key={row.key} className={row.section === 'hero' ? s.goldenBox : s.commercialCard}>
      {row.section === 'hero' && <div className={s.goldenPhoto}>
        <Image src="/luxury/gold-box.webp" fill sizes="(max-width: 680px) 100vw, 50vw" alt={tr('Imagen ilustrativa de cajas doradas', 'Illustrative image of golden boxes', 'Image illustrative de boîtes dorées')} />
      </div>}
      <div>
        <h3>{copy.title}</h3>
        {row.service_key && entries.find(entry => entry.key === row.service_key)?.copy[language].title &&
          <p>{entries.find(entry => entry.key === row.service_key)?.copy[language].title}</p>}
        {copy.price && <p className={s.commercialPrice}>{copy.price}</p>}
        {copy.description && <p>{copy.description}</p>}
        {copy.delivery && <p>{copy.delivery}</p>}
        {copy.terms && <p className={s.commercialTerms}>{copy.terms}</p>}
        {url && <a className={s.textButton} href={url} {...external}>{tr('Abrir tienda', 'Open store', 'Ouvrir la boutique')} <ArrowUpRight size={16}/></a>}
        <a className={s.textButton} href={whatsapp(copy.price ? `${copy.title} (${copy.price})` : copy.title, copy.message)} {...external}>
          {copy.button || tr('Consultar por WhatsApp', 'Ask on WhatsApp', 'Nous contacter sur WhatsApp')} <MessageCircle size={16}/>
        </a>
      </div>
    </article>;
  }
  return <>
    <div className={s.shippingHeader}>
      <div><h2>{tr('Envíos a Cuba', 'Shipping to Cuba', 'Envois vers Cuba')}</h2></div>
      <a className={s.textButton} href="#rastreo">{tr('Consultar mi envío', 'Track my shipment', 'Suivre mon envoi')} <ArrowUpRight size={16}/></a>
    </div>
    {!catalog && <p><a className={s.textButton} href={whatsapp(tr('envíos a Cuba', 'shipping to Cuba', 'les envois vers Cuba'))} {...external}>{tr('Consulta tarifas con Luxury', 'Ask Luxury for rates', 'Demandez les tarifs à Luxury')} <MessageCircle size={16}/></a></p>}
    {entries.filter(row => row.section === 'hero').map(card)}
    {rates.length > 0 && <div className={s.commercialGroup}>
      <h3>{tr('Tarifas generales', 'General rates', 'Tarifs généraux')}</h3>
      <div className={s.commercialGrid}>{rates.map(card)}</div>
    </div>}
    {promotions.length > 0 && <div className={s.commercialGroup}>
      <h3>{tr('Promociones vigentes', 'Current offers', 'Offres en cours')}</h3>
      <div className={`${s.commercialGrid} ${s.commercialOffers}`}>{promotions.map(card)}</div>
    </div>}
    <div className={`${s.commercialGroup} ${s.commercialGrid}`}>{services.map(card)}</div>
    <section id="rastreo" className={s.commercialGroup}>
      <h3><Package size={22}/> {tr('Consultar mi envío', 'Track my shipment', 'Suivre mon envoi')}</h3>
      <div className={s.commercialGrid}>
        <article className={s.commercialCard}>
          <h4>SolveBigTech</h4>
          <p>{tr('Introduce el carnet de identidad de la persona que recibe en Cuba. El HBL es opcional y está arriba a la derecha en la guía. Si lo usas, escríbelo completo, desde CM hasta AP.', 'Enter the ID number of the recipient in Cuba. The optional HBL is in the top-right corner of your waybill. If you use it, enter the full code, from CM through AP.', 'Saisissez le numéro d’identité du destinataire à Cuba. Le HBL, facultatif, figure en haut à droite du bordereau. Si vous l’utilisez, saisissez le code complet, de CM à AP.')}</p>
          <a className={s.textButton} href="https://www.solvebigtech.com/solvedc/tracking/dayready/" {...external}>{tr('Rastrear con SolveBigTech', 'Track with SolveBigTech', 'Suivre avec SolveBigTech')} <ArrowUpRight size={16}/></a>
        </article>
        <article className={s.commercialCard}>
          <h4>YoY MultiServices</h4>
          <p>{tr('Introduce el localizador o HBL de la guía. Tiene tres letras y ocho números, por ejemplo TRE20590321.', 'Enter the tracking code or HBL from your waybill. It has three letters and eight digits, for example TRE20590321.', 'Saisissez le numéro de suivi ou le HBL du bordereau. Il comporte trois lettres et huit chiffres, par exemple TRE20590321.')}</p>
          <a className={s.textButton} href="https://yoymultiservices.com/" {...external}>{tr('Rastrear con YoY MultiServices', 'Track with YoY MultiServices', 'Suivre avec YoY MultiServices')} <ArrowUpRight size={16}/></a>
        </article>
      </div>
      <p className={s.shippingNote}>{rates.filter(row => row.copy[language].delivery).map(row => `${row.copy[language].title} · ${row.copy[language].delivery}`).join(' ')}</p>
      <p className={s.shippingNote}>{tr('Generalmente realizamos salidas los lunes y los envíos suelen salir en barco o avión esa misma semana. La programación puede variar.', 'We usually schedule departures on Mondays, and shipments typically leave by sea or air that same week. Schedules may vary.', 'Les départs sont généralement programmés le lundi et les colis partent habituellement par bateau ou avion la même semaine. Le calendrier peut varier.')}</p>
      <a className={s.textButton} href={`tel:${contact.tel}`}>{tr('Llamar a Luxury para ayuda', 'Call Luxury for help', 'Appeler Luxury pour obtenir de l’aide')} <ArrowUpRight size={16}/></a>
    </section>
  </>;
}
