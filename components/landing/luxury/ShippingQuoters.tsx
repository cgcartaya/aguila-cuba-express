'use client';

import { useEffect, useState } from 'react';
import { Calculator, MessageCircle } from 'lucide-react';
import { weightRate } from '@/lib/shipping/weight-rate';
import type { ShippingEntry } from '@/lib/luxury/shipping';
import { external, useCommercialCopy, type ShippingCatalog } from './commercial-copy';
import s from './luxury.module.css';

type RateOption = {
  id: string; group: string; service: string; transport: string; destination: string; priority: number;
  rate_per_lb: number; weight_threshold_lb: number | null; rate_at_or_above_threshold: number | null;
  minimum: number; maximum: number | null; fee: number; minimumCharge: number;
};

export function ShippingQuoters({ catalog, offers }: { catalog?: ShippingCatalog; offers: ShippingEntry[] }) {
  const [mode, setMode] = useState<'rates' | 'offers'>('offers');
  const [rates, setRates] = useState<RateOption[]>();
  const [failed, setFailed] = useState(false);
  const [choice, setChoice] = useState('');
  const [pounds, setPounds] = useState('');
  const { language, tr, whatsapp } = useCommercialCopy(catalog);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const result = await fetch('/api/luxury/rates', { cache: 'no-store', signal: controller.signal });
        if (!result.ok) throw new Error('Rates unavailable');
        setRates((await result.json()).options);
        setFailed(false);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    }
    void load();
    const timer = window.setInterval(load, 60000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, []);

  const groups = [...new Map((rates ?? []).map(rate => [rate.group, rate])).values()].sort((a,b) =>
    a.service.localeCompare(b.service) || a.destination.localeCompare(b.destination) || a.transport.localeCompare(b.transport));
  const offer = offers.find(entry => entry.key === choice);
  const copy = offer?.copy[language];
  const weight = Number(pounds);
  const validWeight = Number.isFinite(weight) && weight > 0;
  const selected = groups.find(rate => rate.group === choice);
  const rate = rates?.filter(row => row.group === choice && (row.maximum === null || weight <= row.maximum))
    .sort((a,b) => b.priority - a.priority || a.id.localeCompare(b.id))[0];
  // Existing offers store translated display prices. Only recognize the configured, unambiguous price formats.
  const offerPrice = offer?.copy.es.price.trim();
  const parcelOffer = offer && ['seniors','new','office'].includes(offer.key) &&
    offer.copy.es.terms.startsWith('Hasta 70 lb por bulto.') &&
    offerPrice?.match(/^\$(\d+(?:\.\d{1,2})?)\/lb \+ \$(\d+(?:\.\d{1,2})?) por caja$/);
  const volumeOffer = offer?.key === 'air-volume' &&
    offer.copy.es.description === 'Envío aéreo de más de 50 lb en una misma caja.' &&
    offerPrice?.match(/^\$(\d+(?:\.\d{1,2})?)\/lb$/);
  const total = !validWeight ? null : mode === 'rates'
    ? rate && Math.max(Math.max(weight, rate.minimum) * weightRate(rate, weight) + rate.fee, rate.minimumCharge)
    : parcelOffer && weight <= 70 ? weight * Number(parcelOffer[1]) + Number(parcelOffer[2])
    : volumeOffer && weight > 50 ? weight * Number(volumeOffer[1]) : null;
  const money = typeof total === 'number' && Number.isFinite(total)
    ? new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : 'en-US', { style: 'currency', currency: 'USD' }).format(total) : '';
  const methods: Record<string,string> = {
    sea: tr('Marítimo','Ocean','Maritime'), maritime: tr('Marítimo','Ocean','Maritime'),
    air: tr('Aéreo','Air','Aérien'), express: 'Express',
  };
  function switchMode(next: typeof mode) { setChoice(''); setPounds(''); setMode(next); }
  const title = mode === 'offers' ? copy?.title : selected && `${selected.service} · ${selected.destination}`;
  const subject = title || tr('envíos a Cuba','shipping to Cuba','les envois vers Cuba');
  const message = validWeight && title ? tr(
    `Hola, quisiera confirmar un envío con Luxury: ${title}. Peso por caja: ${weight} lb.${money ? ` Estimado: ${money}.` : ''}`,
    `Hello, I’d like to confirm a shipment with Luxury: ${title}. Weight per box: ${weight} lb.${money ? ` Estimate: ${money}.` : ''}`,
    `Bonjour, je souhaite confirmer un envoi avec Luxury : ${title}. Poids par boîte : ${weight} lb.${money ? ` Estimation : ${money}.` : ''}`,
  ) : undefined;

  return <section className={s.quoter} id="cotizar">
    <h3><Calculator size={22}/> {tr('Cotiza tu envío','Estimate your shipment','Estimez votre envoi')}</h3>
    <div className={s.quoteModes}>
      <button type="button" aria-pressed={mode === 'offers'} onClick={() => switchMode('offers')}>{tr('Por oferta','By offer','Par offre')}</button>
      <button type="button" aria-pressed={mode === 'rates'} onClick={() => switchMode('rates')}>{tr('Por tarifa','By rate','Par tarif')}</button>
    </div>
    <div className={s.quoteFields}>
      {mode === 'offers' && offers.length > 0 && <label>{tr('Oferta vigente','Current offer','Offre en cours')}
        <select value={choice} onChange={event => setChoice(event.target.value)}>
          <option value="">{tr('Selecciona una oferta','Select an offer','Sélectionnez une offre')}</option>
          {offers.map(entry => <option key={entry.key} value={entry.key}>{entry.copy[language].title}</option>)}
        </select>
      </label>}
      {mode === 'rates' && groups.length > 0 && <label>{tr('Servicio y destino','Service and destination','Service et destination')}
        <select value={choice} onChange={event => setChoice(event.target.value)}>
          <option value="">{tr('Selecciona una tarifa','Select a rate','Sélectionnez un tarif')}</option>
          {groups.map(row => <option key={row.group} value={row.group}>{row.service} · {methods[row.transport] ?? row.transport} · {row.destination}</option>)}
        </select>
      </label>}
      {(selected || parcelOffer || volumeOffer) && <label>{tr('Peso de una caja (lb)','Weight of one box (lb)','Poids d’une boîte (lb)')}
        <input type="number" inputMode="decimal" min="0.01" step="0.01" value={pounds} onChange={event => setPounds(event.target.value)}/>
      </label>}
    </div>
    <div aria-live="polite">
      {mode === 'offers' && offers.length === 0 && <p>{tr('No hay ofertas publicadas hoy.','There are no offers published today.','Aucune offre publiée aujourd’hui.')}</p>}
      {mode === 'rates' && groups.length === 0 && <p>{failed
        ? tr('No se pudieron cargar las tarifas.','Rates could not be loaded.','Impossible de charger les tarifs.')
        : rates ? tr('Aún no hay tarifas en línea.','Online rates are not available yet.','Les tarifs en ligne ne sont pas encore disponibles.')
        : tr('Cargando tarifas…','Loading rates…','Chargement des tarifs…')}</p>}
      {copy && <div className={s.quoteDetails}>{copy.price && <strong>{copy.price}</strong>}{copy.description && <p>{copy.description}</p>}{copy.terms && <p>{copy.terms}</p>}</div>}
      {mode === 'rates' && selected && validWeight && !rate && <p>{tr('El peso supera el máximo de esta tarifa.','This weight exceeds the rate limit.','Ce poids dépasse la limite du tarif.')}</p>}
      {money && <p className={s.quoteTotal}>{tr('Estimado por caja','Estimate per box','Estimation par boîte')} <strong>{money}</strong></p>}
    </div>
    <a className={s.textButton} href={whatsapp(subject,message)} {...external}>{tr('Confirmar por WhatsApp','Confirm on WhatsApp','Confirmer sur WhatsApp')} <MessageCircle size={17}/></a>
  </section>;
}
