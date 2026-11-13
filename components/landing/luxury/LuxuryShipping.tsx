'use client';

import Image from 'next/image';
import { ArrowUpRight, Car, ChevronDown, MessageCircle, Package, ShoppingBag, Truck } from 'lucide-react';
import { contact } from './content';
import { secureUrl, shippingStatus, type ShippingEntry } from '@/lib/luxury/shipping';
import s from './luxury.module.css';
import { ShippingQuoters } from './ShippingQuoters';
import { external, useCommercialCopy, type ShippingCatalog } from './commercial-copy';

const serviceIcons = { express: Truck, durables: Package, vehicles: Car, online: ShoppingBag };

export default function LuxuryShipping({ catalog }: { catalog?: ShippingCatalog }) {
  const { language, tr, whatsapp } = useCommercialCopy(catalog);
  const entries = catalog?.entries ?? [];
  const rates = entries.filter(row => row.section === 'rate');
  const promotions = entries.filter(row => row.section === 'promotion' && shippingStatus(row) === 'active');
  const services = entries.filter(row => row.section === 'special' || row.section === 'online');
  function card(row: ShippingEntry) {
    const copy = row.copy[language];
    const url = row.section === 'online' && secureUrl(row.external_url);
    const ServiceIcon = serviceIcons[row.key as keyof typeof serviceIcons] ?? Package;
    const hasDetails = copy.delivery || copy.terms;
    return <article key={row.key} className={row.section === 'hero' ? s.goldenBox : s.serviceCard}>
      {row.section === 'hero' && <div className={s.goldenPhoto}>
        <Image src="/luxury/gold-box.webp" fill sizes="(max-width: 680px) 100vw, 50vw" alt={tr('Imagen ilustrativa de cajas doradas', 'Illustrative image of golden boxes', 'Image illustrative de boîtes dorées')} />
        <Image className={s.boxSeal} src="/luxury/box-seal.jpg" width={1254} height={1254} alt={tr('Sello impreso de Luxury Travel Point', 'Luxury Travel Point printed seal', 'Sceau imprimé de Luxury Travel Point')} />
      </div>}
      <div>
        {row.section !== 'hero' && <span className={s.serviceIcon}><ServiceIcon size={22} aria-hidden="true" /></span>}
        <h3>{copy.title}</h3>
        {row.service_key && entries.find(entry => entry.key === row.service_key)?.copy[language].title &&
          <p>{entries.find(entry => entry.key === row.service_key)?.copy[language].title}</p>}
        {copy.price && <p className={s.commercialPrice}>{copy.price}</p>}
        {copy.description && <p>{copy.description}</p>}
        {row.section === 'hero' ? <>
          {copy.delivery && <p>{copy.delivery}</p>}
          {copy.terms && <p className={s.commercialTerms}>{copy.terms}</p>}
        </> : hasDetails && <details className={s.serviceDetails}>
          <summary>{tr('Entrega y condiciones', 'Delivery and terms', 'Livraison et conditions')} <ChevronDown size={16} aria-hidden="true" /></summary>
          {copy.delivery && <p>{copy.delivery}</p>}
          {copy.terms && <p>{copy.terms}</p>}
        </details>}
        <div className={s.serviceActions}>
        {url && <a className={s.textButton} href={url} {...external}>{tr('Abrir tienda', 'Open store', 'Ouvrir la boutique')} <ArrowUpRight size={16}/></a>}
        <a className={s.textButton} href={whatsapp(copy.price ? `${copy.title} (${copy.price})` : copy.title, copy.message)} {...external}>
          {copy.button || tr('Consultar por WhatsApp', 'Ask on WhatsApp', 'Nous contacter sur WhatsApp')} <MessageCircle size={16}/>
        </a>
        </div>
      </div>
    </article>;
  }
  return <>
    <div className={s.shippingHeader}>
      <div><h2>{tr('Envíos a Cuba', 'Shipping to Cuba', 'Envois vers Cuba')}</h2></div>
      <a className={s.textButton} href="#rastreo">{tr('Consultar mi envío', 'Track my shipment', 'Suivre mon envoi')} <ArrowUpRight size={16}/></a>
    </div>
    {!catalog && <p><a className={s.textButton} href={whatsapp(tr('envíos a Cuba', 'shipping to Cuba', 'les envois vers Cuba'))} {...external}>{tr('Consulta tarifas con nuestra agencia', 'Ask our agency for rates', 'Demandez les tarifs à notre agence')} <MessageCircle size={16}/></a></p>}
    {entries.filter(row => row.section === 'hero').map(card)}
    <ShippingQuoters catalog={catalog} offers={promotions}/>
    <div className={`${s.commercialGroup} ${s.serviceGrid}`}>{services.map(card)}</div>
    <section id="rastreo" className={s.commercialGroup}>
      <h3><Package size={22}/> {tr('Consultar mi envío', 'Track my shipment', 'Suivre mon envoi')}</h3>
      <div className={s.commercialGrid}>
        <article className={s.commercialCard}>
          <h4>{tr('Empieza con CM y termina en AP', 'Starts with CM and ends in AP', 'Commence par CM et se termine par AP')}</h4>
          <p>{tr('Introduce el carnet de identidad de la persona que recibe en Cuba. El HBL es opcional y está arriba a la derecha en la guía. Si lo usas, escríbelo completo, desde CM hasta AP.', 'Enter the ID number of the recipient in Cuba. The optional HBL is in the top-right corner of your waybill. If you use it, enter the full code, from CM through AP.', 'Saisissez le numéro d’identité du destinataire à Cuba. Le HBL, facultatif, figure en haut à droite du bordereau. Si vous l’utilisez, saisissez le code complet, de CM à AP.')}</p>
          <a className={s.textButton} href="https://www.solvebigtech.com/solvedc/tracking/dayready/" {...external}>{tr('Rastrear código CM…AP', 'Track CM…AP code', 'Suivre le code CM…AP')} <ArrowUpRight size={16}/></a>
        </article>
        <article className={s.commercialCard}>
          <h4>{tr('Empieza con TRE', 'Starts with TRE', 'Commence par TRE')}</h4>
          <p>{tr('Introduce el localizador o HBL de la guía. Tiene tres letras y ocho números, por ejemplo TRE20590321.', 'Enter the tracking code or HBL from your waybill. It has three letters and eight digits, for example TRE20590321.', 'Saisissez le numéro de suivi ou le HBL du bordereau. Il comporte trois lettres et huit chiffres, par exemple TRE20590321.')}</p>
          <a className={s.textButton} href="https://yoymultiservices.com/" {...external}>{tr('Rastrear código TRE', 'Track TRE code', 'Suivre le code TRE')} <ArrowUpRight size={16}/></a>
        </article>
      </div>
      <p className={s.shippingNote}>{rates.filter(row => row.copy[language].delivery).map(row => `${row.copy[language].title} · ${row.copy[language].delivery}`).join(' ')}</p>
      <p className={s.shippingNote}>{tr('Generalmente realizamos salidas los lunes y los envíos suelen salir en barco o avión esa misma semana. La programación puede variar.', 'We usually schedule departures on Mondays, and shipments typically leave by sea or air that same week. Schedules may vary.', 'Les départs sont généralement programmés le lundi et les colis partent habituellement par bateau ou avion la même semaine. Le calendrier peut varier.')}</p>
      <a className={s.textButton} href={`tel:${contact.tel}`}>{tr('Llamar a nuestra agencia', 'Call our agency', 'Appeler notre agence')} <ArrowUpRight size={16}/></a>
    </section>
  </>;
}
