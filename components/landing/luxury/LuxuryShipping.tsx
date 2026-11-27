'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowUpRight, Car, ChevronDown, MessageCircle, Package, Plane, Ship, ShoppingBag, Truck, X } from 'lucide-react';
import { contact } from './content';
import { secureUrl, shippingStatus, thanksgivingEnds, thanksgivingRates, thanksgivingStarts, type ShippingEntry } from '@/lib/luxury/shipping';
import s from './luxury.module.css';
import { ShippingQuoters, useLuxuryRates } from './ShippingQuoters';
import { external, useCommercialCopy, type ShippingCatalog } from './commercial-copy';

const serviceIcons = { sea: Ship, air: Plane, express: Truck, durables: Package, vehicles: Car, online: ShoppingBag };

export default function LuxuryShipping({ catalog }: { catalog?: ShippingCatalog }) {
  const { language, tr, whatsapp } = useCommercialCopy(catalog);
  const entries = catalog?.entries ?? [];
  const { rates: liveRates, failed } = useLuxuryRates();
  const [thanksgiving, setThanksgiving] = useState(false);
  useEffect(() => {
    let timer: number | undefined;
    function refresh() {
      window.clearTimeout(timer);
      const now = Date.now();
      setThanksgiving(now >= thanksgivingStarts && now < thanksgivingEnds);
      const next = now < thanksgivingStarts ? thanksgivingStarts : thanksgivingEnds;
      if (now < next) timer = window.setTimeout(refresh, Math.min(next - now, 2_147_483_647));
    }
    refresh();
    window.addEventListener('focus', refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  const money = new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : 'en-US', {
    style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol',
  });
  const promoTerms = tr(
    'Primeras 70 lb por caja al precio de oferta. Las libras adicionales se cobran a tarifa regular. Se suman $20 por caja de envío y manejo. Máximo de 100 lb por caja.',
    'The offer applies to the first 70 lb per box. Additional pounds are charged at the regular rate. Add $20 per box for shipping and handling. Maximum 100 lb per box.',
    'Offre valable sur les 70 premières lb par boîte. Tarif normal au-delà. Ajoutez 20 $ par boîte pour l’envoi et la manutention. Maximum 100 lb par boîte.',
  );
  const rates = entries.filter(row => row.section === 'rate');
  const promotions = entries.filter(row => row.section === 'promotion' && shippingStatus(row) === 'active');
  const services = entries.filter(row => row.section === 'special' || row.section === 'online');
  function card(row: ShippingEntry) {
    const copy = { ...row.copy[language] };
    const tariff = row.key === 'sea' || row.key === 'air' ? thanksgivingRates[row.key] : undefined;
    if (row.section === 'rate' && tariff) {
      const matching = liveRates?.filter(rate => rate.countryCode === 'CU' &&
        rate.serviceCode === tariff.serviceCode && rate.transport === tariff.transport) ?? [];
      const lowest = Math.min(...matching.flatMap(rate => [
        rate.rate_per_lb,
        ...(rate.weight_threshold_lb !== null && rate.rate_at_or_above_threshold !== null &&
          (rate.maximum === null || rate.weight_threshold_lb <= rate.maximum) ? [rate.rate_at_or_above_threshold] : []),
      ]));
      const price = money.format(thanksgiving ? tariff.offer : lowest);
      copy.price = thanksgiving ? `${price}/lb` : Number.isFinite(lowest)
        ? tr(`Desde ${price}/lb`, `From ${price}/lb`, `À partir de ${price}/lb`) : '';
      if (thanksgiving) {
        copy.description = tr('Oferta vigente del 27 al 29 de noviembre.', 'Offer valid November 27–29.', 'Offre valable du 27 au 29 novembre.');
        copy.terms = `${promoTerms} ${tr('Tarifa regular', 'Regular rate', 'Tarif normal')} ${money.format(tariff.regular)}/lb.`;
      }
    }
    if (row.key === 'express') copy.price = '';
    if (thanksgiving && row.key === 'durables') {
      copy.price = '';
      copy.terms = tr('Aplica la oferta por libra de la modalidad elegida. Los artículos duraderos pagan arancel.', 'The per-pound offer applies based on your shipping method. Durable goods are subject to customs duties.', 'L’offre à la livre dépend du mode d’envoi. Les biens durables sont soumis aux droits de douane.');
    }
    if (thanksgiving && row.key === 'gold') {
      copy.title = tr('Cajas doradas · Envío marítimo', 'Gold boxes · Ocean shipping', 'Boîtes dorées · Envoi maritime');
      copy.price = tr('12 × 12 por $45 · 15 × 15 por $70', '12 × 12 for $45 · 15 × 15 for $70', '12 × 12 à 45 $ · 15 × 15 à 70 $');
      copy.description = tr('Hasta 100 lb por caja dorada, si el contenido cabe.', 'Up to 100 lb per gold box, if the contents fit.', 'Jusqu’à 100 lb par boîte dorée, si le contenu y tient.');
      copy.terms = '';
    }
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
    {thanksgiving && <ThanksgivingPopup catalog={catalog} />}
    <div className={s.shippingHeader}>
      <div><h2>{tr('Envíos a Cuba', 'Shipping to Cuba', 'Envois vers Cuba')}</h2></div>
      <a className={s.textButton} href="#rastreo">{tr('Consultar mi envío', 'Track my shipment', 'Suivre mon envoi')} <ArrowUpRight size={16}/></a>
    </div>
    {!catalog && <p><a className={s.textButton} href={whatsapp(tr('envíos a Cuba', 'shipping to Cuba', 'les envois vers Cuba'))} {...external}>{tr('Consulta tarifas con nuestra agencia', 'Ask our agency for rates', 'Demandez les tarifs à notre agence')} <MessageCircle size={16}/></a></p>}
    {entries.filter(row => row.section === 'hero').map(card)}
    <ShippingQuoters catalog={catalog} offers={promotions} rates={liveRates} failed={failed} thanksgiving={thanksgiving} />
    <div className={`${s.commercialGroup} ${s.serviceGrid}`}>{[...rates, ...services].map(card)}</div>
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

function ThanksgivingPopup({ catalog }: { catalog?: ShippingCatalog }) {
  const { tr } = useCommercialCopy(catalog);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return <dialog ref={dialog} className={s.thanksgivingDialog}
    aria-label={tr('Oferta de Acción de Gracias de Luxury Travel Point', 'Luxury Travel Point Thanksgiving offer', 'Offre de Thanksgiving de Luxury Travel Point')}>
    <button type="button" className={s.thanksgivingClose} onClick={() => dialog.current?.close()}
      aria-label={tr('Cerrar oferta', 'Close offer', 'Fermer l’offre')}>
      <X size={24} aria-hidden="true" />
    </button>
    <Image src="/luxury/thanksgiving-2026.webp" width={1024} height={1536}
      sizes="(max-width: 600px) 94vw, 560px"
      alt={tr(
        'Del 27 al 29 de noviembre. Envíos a Cuba: marítimo $1.00/lb y aéreo $2.99/lb en las primeras 70 lb por caja, más $20 de manejo. Hasta 100 lb. Las libras adicionales cuestan $1.99 por vía marítima o $3.49 por vía aérea. Cajas doradas marítimas a $45 y $70.',
        'November 27–29. Cuba shipping: ocean $1.00/lb and air $2.99/lb for the first 70 lb per box, plus $20 handling. Up to 100 lb. Extra pounds cost $1.99 by sea or $3.49 by air. Ocean gold boxes for $45 and $70.',
        'Du 27 au 29 novembre. Envois à Cuba : 1,00 $/lb par mer et 2,99 $/lb par avion pour les 70 premières lb par boîte, plus 20 $ de manutention. Maximum 100 lb. Au-delà : 1,99 $/lb par mer ou 3,49 $/lb par avion. Boîtes dorées par mer à 45 $ et 70 $.',
      )} />
  </dialog>;
}
