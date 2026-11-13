'use client';
import { useState } from 'react';
import { ArrowUpRight, CalendarDays, Download } from 'lucide-react';
import { availableDepartures, safeMediaUrl, type TravelContent } from '@/lib/travel/types';
import { whatsapp } from './content';
import s from './luxury.module.css';
import { translateTree, useLuxuryLanguage } from './i18n';

export const travelDate = (date: string, language = 'es') => date ? new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)) : 'Consultar fechas';
export default function PackageDetail({ content, preview = false, initialDepartureId = '' }: { content: TravelContent; preview?: boolean; initialDepartureId?: string }) {
  const { language } = useLuxuryLanguage();
  const departures = preview ? content.departures : availableDepartures(content);
  const [departureId, setDepartureId] = useState(initialDepartureId || departures[0]?.id || '');
  const selected = departures.find(departure => departure.id === departureId) || departures[0];
  const pdf = selected?.pdf || content.pdf;
  const message = `Hola, Luxury. Me interesa ${content.title}.${selected ? ` Salida: ${travelDate(selected.start)}.${selected.origin ? ` Origen: ${selected.origin}.` : ''}` : ' Quisiera consultar próximas fechas.'} ¿Pueden confirmar disponibilidad, precio y condiciones?`;
  return translateTree(<div className={s.packageDetail}>
    <p className={s.eyebrow}>{content.countries.join(' · ')}</p><h2>{content.title}</h2>
    <p className={s.packageDescription}>{content.description}</p>
    <div className={s.packageGallery}>{[content.image, ...content.gallery].filter((url, index, urls) => url && safeMediaUrl(url) && urls.indexOf(url) === index).map((url, index) => <img key={url} src={url} alt={`${content.title} · ${index + 1}`} loading={index ? 'lazy' : 'eager'} />)}</div>
    {content.days !== null && <p className={s.groupMeta}><CalendarDays size={18}/>{content.days} días{content.nights !== null ? ` / ${content.nights} noches` : ''}</p>}
    {content.route && <><h3>El recorrido</h3><p>{content.route}</p></>}
    <div className={s.departurePanel}><h3>Fechas y tarifas</h3>{departures.length ? <>
      <label>Elige tu salida<select value={selected?.id || ''} onChange={event => setDepartureId(event.target.value)}>{departures.map(departure => <option key={departure.id} value={departure.id}>{travelDate(departure.start, language)}{departure.end ? ` — ${travelDate(departure.end, language)}` : ''}{preview ? ` · ${departure.status}` : ''}</option>)}</select></label>
      {selected?.origin && <p>Salida desde {selected.origin}</p>}
      {selected?.deadline && <p>Reservas hasta el {travelDate(selected.deadline, language)}</p>}
      {selected?.rates.length ? <div className={s.packageRates}>{selected.rates.map((rate, index) => <div key={index}><span>{rate.label}</span><strong>${rate.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</strong><small>por persona</small></div>)}</div> : <p>Consulta el precio con la agencia.</p>}
    </> : <p>Consulta próximas fechas y una propuesta personalizada.</p>}<small>Disponibilidad e importe final sujetos a confirmación por la agencia.</small></div>
    {content.itinerary.length > 0 && <><h3>Tu viaje, día por día</h3><div className={s.packageItinerary}>{content.itinerary.map((day, index) => <details key={index} open={index === 0}><summary>{day.title}</summary><p>{day.description}</p></details>)}</div></>}
    <div className={s.packageColumns}>{content.includes.length > 0 && <section><h3>Incluye</h3><ul>{content.includes.map((line, index) => <li key={index}>{line}</li>)}</ul></section>}{content.excludes.length > 0 && <section><h3>No incluye y gastos adicionales</h3><ul>{content.excludes.map((line, index) => <li key={index}>{line}</li>)}</ul></section>}</div>
    {content.accommodation && <><h3>Alojamiento</h3><p className={s.preserveLines}>{content.accommodation}</p></>}
    {content.conditions && <details className={s.packageTerms}><summary>Condiciones, pagos e información importante</summary><p className={s.preserveLines}>{content.conditions.replaceAll('Confirma con Luxury los', 'Confirma con nuestra agencia los')}</p></details>}
    {content.source_text && <details className={s.packageTerms}><summary>Consultar el programa completo del documento</summary><p className={s.preserveLines}>{content.source_text}</p></details>}
    <div className={s.groupDialogActions}>{pdf && safeMediaUrl(pdf) && <a className={s.textButton} href={pdf} target="_blank" rel="noopener noreferrer"><Download size={18}/> Descargar programa PDF</a>}<a className={s.goldButton} href={whatsapp(message)} target="_blank" rel="noopener noreferrer">Consultar este viaje <ArrowUpRight size={18}/></a></div>
  </div>, language);
}
