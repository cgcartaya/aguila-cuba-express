'use client';

import { useRef, useState, type FormEvent } from 'react';
import { ArrowUpRight, CalendarDays, Check, Compass, MapPin, MessageCircle, Users, X } from 'lucide-react';
import { destinations, whatsapp } from './content';
import s from './luxury.module.css';
import { useLuxuryLanguage, translateTree } from './i18n';


export default function TravelExplorer({ minMonth }: { minMonth: string }) {
  const {language}=useLuxuryLanguage();
  const [destination, setDestination] = useState('');
  const [month, setMonth] = useState('');
  const [travelers, setTravelers] = useState('2');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [prepared, setPrepared] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const selected = destinations.find(d => d.name === destination);

  function openInquiry(place = destination) {
    setDestination(place);
    setPrepared(false);
    dialog.current?.showModal();
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPrepared(true);
  }
  const message = `Hola, Luxury Travel Point. Quisiera una cotización de viaje.\nNombre: ${name.trim()}\nDestino o experiencia: ${destination || 'Quisiera asesoría para elegir'}\nMes: ${month || 'Fechas flexibles'}\nViajeros: ${travelers}\nDetalles: ${notes.trim() || 'Quisiera conocer las opciones, inclusiones y disponibilidad.'}`;

  return translateTree(<>
    <section className={s.planner} aria-label="Planifica tu viaje">
      <div className={s.plannerIntro}><Compass size={27} /><span>TU PRÓXIMA HISTORIA<small>Empieza por un destino.</small></span></div>
      <form onSubmit={event => { event.preventDefault(); openInquiry(); }}>
        <label><span><MapPin size={14} /> ¿A dónde vamos?</span><select value={destination} onChange={e => setDestination(e.target.value)}><option value="">Quiero inspirarme</option>{destinations.map(d => <option key={d.id}>{d.name}</option>)}<option>Crucero</option><option>Otro destino</option></select></label>
        <label><span><CalendarDays size={14} /> ¿Cuándo?</span><input aria-label="Mes del viaje" type="month" min={minMonth} value={month} onInput={e => setMonth(e.currentTarget.value)} onChange={e => setMonth(e.target.value)} /></label>
        <label><span><Users size={14} /> Viajeros</span><select value={travelers} onChange={e => setTravelers(e.target.value)}>{['1', '2', '3', '4', '5', '6 o más'].map(v => <option key={v} value={v}>{v} {v === '1' ? 'persona' : 'personas'}</option>)}</select></label>
        <button className={s.goldButton} type="submit">Diseñar mi viaje <ArrowUpRight size={18} /></button>
      </form>
    </section>
    <dialog ref={dialog} className={s.dialog} aria-labelledby="luxury-inquiry-title" onClose={() => setPrepared(false)} onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
      <div className={s.dialogBody}><button className={s.closeButton} type="button" aria-label="Cerrar consulta" onClick={() => dialog.current?.close()}><X size={22} /></button><p className={s.eyebrow}>UN VIAJE HECHO PARA TI</p><h2 id="luxury-inquiry-title">{prepared ? 'Tu viaje empieza aquí.' : 'Cuéntanos qué sueñas.'}</h2>
        {prepared ? <div className={s.prepared} role="status"><Check size={28} /><p>Tu consulta está lista. Continúa a WhatsApp para enviarla al equipo y recibir opciones. Aún no se ha enviado ni reservado nada.</p><pre>{message}</pre><a className={s.goldButton} href={whatsapp(message)} target="_blank" rel="noopener noreferrer">Continuar a WhatsApp <MessageCircle size={19} /></a><button className={s.textButton} type="button" onClick={() => setPrepared(false)}>Editar mi consulta</button></div> : <>
          {selected ? <ul className={s.inclusions}>{selected.details.map(detail => <li key={detail}><Check size={15} />{detail}</li>)}</ul> : <p>Cruceros, viajes privados, escapadas o aventuras en grupo: te ayudamos a encontrar tu experiencia.</p>}
          <form className={s.inquiryForm} onSubmit={submit}><label>Tu nombre<input autoFocus required maxLength={100} value={name} onChange={e => setName(e.target.value)} autoComplete="given-name" /></label><label>Destino o experiencia<input required maxLength={120} value={destination} placeholder="Por ejemplo: Punta Cana o un crucero" onChange={e => setDestination(e.target.value)} /></label><div className={s.formRow}><label>Mes aproximado<input type="month" min={minMonth} value={month} onInput={e => setMonth(e.currentTarget.value)} onChange={e => setMonth(e.target.value)} /></label><label>Viajeros<select value={travelers} onChange={e => setTravelers(e.target.value)}>{['1','2','3','4','5','6 o más'].map(v => <option key={v}>{v}</option>)}</select></label></div><label>¿Algo más que debamos saber?<textarea rows={3} maxLength={1500} value={notes} placeholder="Ciudad de salida, niños, tipo de hotel, fechas flexibles…" onChange={e => setNotes(e.target.value)} /></label><button className={s.goldButton} type="submit">Preparar mi consulta <ArrowUpRight size={19} /></button><small>Consulta personalizada. La disponibilidad y el precio se confirman antes de reservar.</small></form>
        </>}
      </div>
    </dialog>
  </>,language);
}
