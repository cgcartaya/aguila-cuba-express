'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { ArrowUpRight, CalendarDays, Check, Download, Plane, X } from 'lucide-react';
import rawGroups from './groups.json';
import { whatsapp } from './content';
import s from './luxury.module.css';

type Group = Omit<(typeof rawGroups)[number], 'pdf'> & { pdf: string | null };
const groups: Group[] = rawGroups;
const countries = [...new Set(groups.flatMap(g => g.countries))].sort((a,b) => a.localeCompare(b, 'es'));
const years = [...new Set(groups.map(g => g.date.slice(0,4)))].sort();
const dateLabel = (date: string) => new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
export function filterGroups(country: string, month: string, year: string, date: string, order: string) {
  return groups.filter(g => (!country || g.countries.includes(country)) && (!month || g.date.slice(5,7) === month) && (!year || g.date.startsWith(year)) && (!date || g.date >= date)).sort((a,b) => order === 'price' ? (a.price ?? Infinity) - (b.price ?? Infinity) : order === 'days' ? a.days - b.days : a.date.localeCompare(b.date));
}
const benefits = [
  ['Todo coordinado', 'Vuelos, estancias y servicios del circuito planificados juntos.'],
  ['Presupuesto más claro', 'Consulta el precio, sus inclusiones y los gastos adicionales antes de reservar.'],
  ['Acompañamiento', 'Un equipo para orientarte desde la consulta hasta el regreso.'],
  ['Experiencias compartidas', 'Recorre nuevos destinos con un programa pensado para viajar en grupo.'],
];
const faqs = [
  ['¿El boleto aéreo está incluido?', 'Sí, en estos grupos el programa contempla vuelo. El origen, las conexiones y las condiciones se confirman para cada salida.'],
  ['¿Desde qué ciudad salen los vuelos?', 'Depende del circuito. Muchos parten de Miami; consulta el origen exacto con Luxury antes de reservar.'],
  ['¿Todos viajan en el mismo vuelo?', 'La operación busca coordinar al grupo. Las plazas disponibles o una incorporación por cuenta propia pueden requerir vuelos diferentes.'],
  ['¿Qué incluye el boleto aéreo?', 'Tarifa e impuestos según el programa. El equipaje, los asientos y las restricciones dependen de la aerolínea y de la tarifa confirmada.'],
  ['¿Se pueden cambiar los vuelos?', 'Cualquier cambio requiere disponibilidad y puede generar diferencias de tarifa o penalidades. Pide las condiciones antes de pagar.'],
  ['¿Cuándo se confirma el itinerario aéreo?', 'Luxury te indicará los vuelos y los plazos de confirmación de tu grupo antes de formalizar la reserva.'],
  ['¿Puedo comprar solo los servicios terrestres?', 'Consulta si tu circuito permite incorporarte en destino, cómo se ajusta el importe y qué traslados están incluidos.'],
  ['¿Puedo salir desde otra ciudad?', 'Solicita una alternativa aérea. La agencia debe confirmar disponibilidad, suplemento y coordinación con el grupo.'],
  ['¿Cómo funciona el pago?', 'Solicita el depósito, las cuotas, la fecha de pago final y las condiciones de cancelación de tu salida. No todos los programas tienen los mismos plazos.'],
];
export default function GroupExplorer() {
  const [country, setCountry] = useState(''); const [month, setMonth] = useState(''); const [year, setYear] = useState('');
  const [date, setDate] = useState(''); const [order, setOrder] = useState('date'); const [selected, setSelected] = useState<Group | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const results = filterGroups(country, month, year, date, order);
  function open(group: Group) { setSelected(group); dialog.current?.showModal(); }
  return <section id="destinos" className={s.groupSection}>
    <div className={s.sectionHeading}><div><p className={s.eyebrow}>EL MUNDO, MEJOR ACOMPAÑADOS</p><h2>Tu próximo viaje.<br/><em>Un gran grupo.</em></h2></div><p>Salidas organizadas con boleto aéreo incluido. Elige tu circuito y descubre sus detalles sin salir de esta página.</p></div>
    <div className={s.groupToolbar}>
      <label>País<select value={country} onChange={e => setCountry(e.target.value)}><option value="">Todos los países</option>{countries.map(c => <option key={c}>{c}</option>)}</select></label>
      <label>Mes<select value={month} onChange={e => setMonth(e.target.value)}><option value="">Todos los meses</option>{Array.from({length:12},(_,i) => <option key={i} value={String(i+1).padStart(2,'0')}>{new Intl.DateTimeFormat('es',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2027,i,1)))}</option>)}</select></label>
      <label>Año<select value={year} onChange={e => setYear(e.target.value)}><option value="">Todos los años</option>{years.map(y => <option key={y}>{y}</option>)}</select></label>
      <label>Salidas desde<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
      <label>Ordenar por<select value={order} onChange={e => setOrder(e.target.value)}><option value="date">Fecha de salida</option><option value="price">Menor precio</option><option value="days">Duración</option></select></label>
      <button type="button" className={s.textButton} onClick={() => { setCountry('');setMonth('');setYear('');setDate('');setOrder('date'); }}>Limpiar filtros</button>
    </div>
    <div className={s.groupLayout}><div>
      <p className={s.groupCount} role="status">{results.length} grupos encontrados</p>
      <div className={s.groupGrid}>{results.map(g => <article key={g.id} className={s.groupCard}>
        <button type="button" className={s.groupPhoto} onClick={() => open(g)} aria-label={`Ver detalles de ${g.title}, salida ${dateLabel(g.date)}`}><Image src={g.image} alt={g.title} fill sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw"/><span className={s.airBadge}><Plane size={13}/> Boleto aéreo incluido</span><span className={s.departureBadge}>{dateLabel(g.date)}</span><span className={s.daysBadge}>{g.days} días</span></button>
        <div className={s.groupCardBody}><p className={s.eyebrow}>{g.countries.join(' · ')}</p><h3><button type="button" onClick={() => open(g)}>{g.title}</button></h3>{g.price != null && <p className={s.groupPrice}>Desde ${g.price.toLocaleString('en-US')} USD</p>}<p>{g.route}</p><button type="button" className={s.textButton} onClick={() => open(g)}>Ver circuito e inclusiones <ArrowUpRight size={17}/></button></div>
      </article>)}</div>
      {!results.length && <div className={s.emptyGroups}>No hay grupos con estos filtros. Prueba otras fechas o consulta una propuesta personalizada.</div>}
      <p className={s.catalogNote}>Selección de programas de PJR consultada el 10 de noviembre de 2026. Precios de referencia sujetos a disponibilidad, categoría y condiciones. Luxury confirma el importe final antes de reservar.</p>
      <div className={s.usTrips}><h3>Estados Unidos, con tu agencia DMC</h3><p>Orlando y sus parques, Miami, Las Vegas, Nueva York y los springs de Florida. Cuéntanos qué quieres conocer y diseñamos tu propuesta.</p><a className={s.goldButton} href={whatsapp('Hola, Luxury. Quisiera información sobre sus circuitos en Estados Unidos.')} target="_blank" rel="noopener noreferrer">Consultar un viaje en Estados Unidos <ArrowUpRight size={18}/></a></div>
    </div><aside className={s.groupAside}><p className={s.eyebrow}>VIAJAR CON BOLETO</p><h3>Disfruta el viaje<br/>desde el primer día.</h3>{benefits.map(([title,text]) => <div className={s.benefit} key={title}><Check size={20}/><div><h4>{title}</h4><p>{text}</p></div></div>)}<h3>Preguntas frecuentes</h3>{faqs.map(([q,a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</aside></div>
    <dialog ref={dialog} className={`${s.dialog} ${s.groupDialog}`} aria-labelledby="luxury-group-title" onClick={e => { if(e.currentTarget === e.target) dialog.current?.close(); }}>
      {selected && <div className={s.dialogBody}><button autoFocus type="button" className={s.closeButton} aria-label="Cerrar circuito" onClick={() => dialog.current?.close()}><X/></button><p className={s.eyebrow}>VIAJE EN GRUPO · BOLETO AÉREO INCLUIDO</p><h2 id="luxury-group-title">{selected.title}</h2><p className={s.groupMeta}><CalendarDays size={18}/> {dateLabel(selected.date)} · {selected.days} días{selected.nights ? ` / ${selected.nights} noches` : ''}</p>{selected.price != null && <p className={s.groupPrice}>Desde ${selected.price.toLocaleString('en-US')} USD</p>}<h3>El recorrido</h3><p>{selected.route}</p><h3>Incluye</h3><ul className={s.inclusions}>{selected.includes.map(item => <li key={item}><Check size={16}/>{item}</li>)}</ul>{selected.excludes.length > 0 && <><h3>No incluye</h3><ul className={s.inclusions}>{selected.excludes.map(item => <li key={item}>{item}</li>)}</ul></>}<h3>Antes de reservar</h3><p>Confirma ciudad de salida, hoteles, vuelos, equipaje, visitas, documentación y condiciones de pago y cancelación. Los gastos personales, propinas y servicios no especificados se consultan por separado.</p><div className={s.groupDialogActions}>{selected.pdf ? <a className={s.goldButton} href={selected.pdf} download><Download size={18}/> Descargar resumen PDF</a> : <a className={s.textButton} href={whatsapp(`Hola, Luxury. Quisiera el resumen PDF del circuito ${selected.title}, salida ${dateLabel(selected.date)}.`)} target="_blank" rel="noopener noreferrer">Solicitar resumen PDF <Download size={18}/></a>}<a className={s.goldButton} href={whatsapp(`Hola, Luxury. Me interesa ${selected.title}. Salida: ${dateLabel(selected.date)}. Duración: ${selected.days} días. ¿Pueden confirmar disponibilidad, precio e inclusiones?`)} target="_blank" rel="noopener noreferrer">Consultar este grupo <ArrowUpRight size={18}/></a></div></div>}
    </dialog>
  </section>;
}
