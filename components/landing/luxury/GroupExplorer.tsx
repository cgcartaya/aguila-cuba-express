'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import { availableDepartures, isPackageVisible, safeMediaUrl, type TravelPackage } from '@/lib/travel/types';
import { travelDate } from './PackageDetail';
import { useLuxuryLanguage, translateTree } from './i18n';
import s from './luxury.module.css';

export function filterPackages(packages: TravelPackage[], country: string, month: string, year: string, date: string, category: string, order: string) {
  return packages.filter(pkg => {
    const content = pkg.content;
    const departures = availableDepartures(content);
    return isPackageVisible(pkg) && (!category || content.category === category) && (!country || content.countries.includes(country))
      && (!(month || year || date) || departures.some(departure => (!month || departure.start.slice(5, 7) === month) && (!year || departure.start.startsWith(year)) && (!date || departure.start >= date)));
  }).sort((a, b) => {
    const da = availableDepartures(a.content), db = availableDepartures(b.content);
    const price = (pkg: TravelPackage) => Math.min(...availableDepartures(pkg.content).flatMap(departure => departure.rates.map(rate => rate.amount)));
    if (order === 'price') return price(a) - price(b);
    if (order === 'days') return (a.content.days ?? Infinity) - (b.content.days ?? Infinity);
    return Number(b.content.featured) - Number(a.content.featured) || a.content.sort_order - b.content.sort_order || (da[0]?.start || '9999').localeCompare(db[0]?.start || '9999');
  });
}
const benefits = [
  ['Todo coordinado', 'Vuelos, estancias y servicios del circuito planificados juntos.'],
  ['Presupuesto más claro', 'Consulta el precio, sus inclusiones y los gastos adicionales antes de reservar.'],
  ['Acompañamiento', 'Un equipo para orientarte desde la consulta hasta el regreso.'],
  ['Experiencias compartidas', 'Recorre nuevos destinos con un programa pensado para viajar en grupo.'],
];
const faqs = [
  ['¿El boleto aéreo está incluido?', 'Sí, en estos grupos el programa contempla vuelo. El origen, las conexiones y las condiciones se confirman para cada salida.'],
  ['¿Desde qué ciudad salen los vuelos?', 'Depende del circuito. Muchos parten de Miami; consulta el origen exacto con nuestra agencia antes de reservar.'],
  ['¿Todos viajan en el mismo vuelo?', 'La operación busca coordinar al grupo. Las plazas disponibles o una incorporación por cuenta propia pueden requerir vuelos diferentes.'],
  ['¿Qué incluye el boleto aéreo?', 'Tarifa e impuestos según el programa. El equipaje, los asientos y las restricciones dependen de la aerolínea y de la tarifa confirmada.'],
  ['¿Se pueden cambiar los vuelos?', 'Cualquier cambio requiere disponibilidad y puede generar diferencias de tarifa o penalidades. Pide las condiciones antes de pagar.'],
  ['¿Cuándo se confirma el itinerario aéreo?', 'Nuestra agencia te indicará los vuelos y los plazos de confirmación de tu grupo antes de formalizar la reserva.'],
  ['¿Puedo comprar solo los servicios terrestres?', 'Consulta si tu circuito permite incorporarte en destino, cómo se ajusta el importe y qué traslados están incluidos.'],
  ['¿Puedo salir desde otra ciudad?', 'Solicita una alternativa aérea. La agencia debe confirmar disponibilidad, suplemento y coordinación con el grupo.'],
  ['¿Cómo funciona el pago?', 'Solicita el depósito, las cuotas, la fecha de pago final y las condiciones de cancelación de tu salida. No todos los programas tienen los mismos plazos.'],
];
export default function GroupExplorer({ packages, error = false }: { packages: TravelPackage[]; error?: boolean }) {
  const { language } = useLuxuryLanguage();
  const [country, setCountry] = useState(''), [month, setMonth] = useState(''), [year, setYear] = useState('');
  const [date, setDate] = useState(''), [category, setCategory] = useState(''), [order, setOrder] = useState('date');
  const [, setClock] = useState(0);
  useEffect(() => { const timer = setInterval(() => setClock(value => value + 1), 60000); return () => clearInterval(timer); }, []);
  const countries = [...new Set(packages.flatMap(pkg => pkg.content.countries))].sort((a, b) => a.localeCompare(b, 'es'));
  const years = [...new Set(packages.flatMap(pkg => availableDepartures(pkg.content).map(departure => departure.start.slice(0, 4))))].sort();
  const results = filterPackages(packages, country, month, year, date, category, order);
  return translateTree(<section id="destinos" className={s.groupSection}>
    <div className={s.sectionHeading}><div><p className={s.eyebrow}>EL MUNDO, MEJOR ACOMPAÑADOS</p><h2>Tu próximo viaje.<br/><em>Un gran comienzo.</em></h2></div><p>Circuitos, grupos y experiencias seleccionados por Luxury. Descubre el programa y elige tu próxima salida.</p></div>
    <div className={s.groupToolbar}>
      <label>Tipo de viaje<select value={category} onChange={event => setCategory(event.target.value)}><option value="">Todos los viajes</option><option value="group">Viajes en grupo</option><option value="custom">Viajes a medida</option><option value="cruise">Cruceros</option></select></label>
      <label>País<select value={country} onChange={event => setCountry(event.target.value)}><option value="">Todos los países</option>{countries.map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Mes<select value={month} onChange={event => setMonth(event.target.value)}><option value="">Todos los meses</option>{Array.from({length:12},(_, index) => <option key={index} value={String(index+1).padStart(2,'0')}>{new Intl.DateTimeFormat('es',{month:'long', timeZone:'UTC'}).format(new Date(Date.UTC(2027,index,1)))}</option>)}</select></label>
      <label>Año<select value={year} onChange={event => setYear(event.target.value)}><option value="">Todos los años</option>{years.map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Salidas desde<input type="date" value={date} onChange={event => setDate(event.target.value)}/></label>
      <label>Ordenar por<select value={order} onChange={event => setOrder(event.target.value)}><option value="date">Destacados y fecha</option><option value="price">Menor precio</option><option value="days">Duración</option></select></label>
      <button type="button" className={s.textButton} onClick={() => {setCountry('');setMonth('');setYear('');setDate('');setCategory('');setOrder('date');}}>Limpiar filtros</button>
    </div>
    <div className={s.groupLayout}><div><p className={s.groupCount} role="status">{results.length} viajes encontrados</p>
      {error && <p role="alert">No se pudo cargar el catálogo. <button type="button" className={s.textButton} onClick={() => window.location.reload()}>Volver a intentar</button></p>}
      <div className={s.groupGrid}>{results.map(pkg => {
        const content = pkg.content;
        const departures = availableDepartures(content).filter(departure => (!month || departure.start.slice(5, 7) === month) && (!year || departure.start.startsWith(year)) && (!date || departure.start >= date));
        const href = `/viajes/${pkg.id}${departures[0] ? `?salida=${departures[0].id}` : ''}`;
        const prices = departures.flatMap(departure => departure.rates.map(rate => rate.amount));
        return <article key={pkg.id} className={s.groupCard}><a className={s.groupPhoto} href={href} aria-label={`Ver detalles de ${content.title}`}>
          {content.image && safeMediaUrl(content.image) && <img src={content.image} alt={content.title} loading="lazy"/>}
          <span className={s.departureBadge}>{departures[0] ? travelDate(departures[0].start, language) : 'Consultar próximas fechas'}</span>{content.days !== null && <span className={s.daysBadge}>{content.days} días</span>}</a>
          <div className={s.groupCardBody}><p className={s.eyebrow}>{content.countries.join(' · ')}</p><h3><a href={href}>{content.title}</a></h3>{prices.length > 0 && <p className={s.groupPrice}>Desde ${Math.min(...prices).toLocaleString('en-US')} USD <small>por persona</small></p>}<p>{content.route || content.description}</p><a className={s.textButton} href={href}>Ver programa y salidas <ArrowUpRight size={17}/></a></div></article>;
      })}</div>
      {!error && !results.length && <div className={s.emptyGroups}>No hay viajes con estos filtros. Prueba otras fechas o consulta una propuesta personalizada.</div>}
      <p className={s.catalogNote}>Precios por persona sujetos a disponibilidad, ocupación y condiciones del programa. Luxury confirma el importe final antes de reservar.</p>
    </div><aside className={s.groupAside}><p className={s.eyebrow}>VIAJA ACOMPAÑADO</p><h3>Disfruta el viaje<br/>desde el primer día.</h3>{benefits.map(([title,text]) => <div className={s.benefit} key={title}><Check size={20}/><div><h4>{title}</h4><p>{text}</p></div></div>)}<h3>Preguntas frecuentes de grupos con boleto</h3>{faqs.map(([question,answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</aside></div>
  </section>, language);
}
