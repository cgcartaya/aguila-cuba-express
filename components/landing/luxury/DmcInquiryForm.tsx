'use client';

import { useRef, useState, type FormEvent } from 'react';
import type { Locale } from '@/lib/luxury/dmc/content';
import s from './dmc.module.css';

type Kind = 'event' | 'services' | 'destination';

export function DmcInquiryForm({ locale, kind, destination }: {
  locale: Locale;
  kind: Kind;
  destination?: string;
}) {
  const t = (en: string, es: string) => locale === 'es' ? es : en;
  const reference = useRef<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'sending' | 'error' | 'sent'>('idle');
  const programs = kind === 'event'
    ? [t('Meeting or conference', 'Reunión o congreso'), t('Incentive trip', 'Viaje de incentivo'), t('Gala or special event', 'Gala o evento especial'), t('Corporate retreat', 'Retiro corporativo')]
    : [t('Private travel', 'Viaje privado'), t('Group travel', 'Viaje en grupo'), t('Transport or logistics', 'Transporte o logística')];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === 'sending' || state === 'sent') return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    reference.current ??= crypto.randomUUID();
    setState('sending');
    try {
      const response = await fetch('/api/public/dmc/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, id: reference.current, locale, kind }),
      });
      if (response.ok) setConfirmation(reference.current);
      setState(response.ok ? 'sent' : 'error');
    } catch {
      setState('error');
    }
  }

  return <section className={s.section} id="proposal">
    <h2>{kind === 'event' ? t('Request an event proposal', 'Solicita una propuesta para tu evento') : t('Request a travel proposal', 'Solicita una propuesta de viaje')}</h2>
    {state === 'sent' ? (
      <p role="status">{t('We received your request. Save this reference:', 'Recibimos tu solicitud. Guarda esta referencia:')} <strong>{confirmation}</strong></p>
    ) : (
      <form className={s.inquiry} onSubmit={submit}>
        <label>{t('Full name', 'Nombre completo')} <input name="name" autoComplete="name" required minLength={2} maxLength={100} /></label>
        <label>{t('Email', 'Correo electrónico')} <input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
        <label>{t('Company (optional)', 'Empresa (opcional)')} <input name="organization" autoComplete="organization" maxLength={120} /></label>
        <label>{t('Phone (optional)', 'Teléfono (opcional)')} <input name="phone" type="tel" autoComplete="tel" maxLength={40} /></label>
        <label>{t('Program type', 'Tipo de programa')}
          <select name="program" required defaultValue="">
            <option value="" disabled>{t('Select an option', 'Selecciona una opción')}</option>
            {[...programs, t('Other', 'Otro')].map((program) => <option key={program}>{program}</option>)}
          </select>
        </label>
        <label>{t('Preferred city or state', 'Ciudad o estado de interés')} <input name="location" defaultValue={destination} maxLength={150} /></label>
        <label>{t('Estimated dates', 'Fechas estimadas')} <input name="dates" maxLength={100} /></label>
        <label>{t('Estimated group size', 'Tamaño estimado del grupo')} <input name="size" inputMode="numeric" pattern="[0-9]{0,8}" maxLength={8} /></label>
        <label className={s.fullField}>{t('Tell us what you are planning', 'Cuéntanos qué estás planeando')} <textarea name="details" rows={5} required minLength={10} maxLength={3000} /></label>
        <div hidden aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" /></div>
        <div className={s.fullField}>
          <button className={s.button} disabled={state === 'sending'}>{state === 'sending' ? t('Sending…', 'Enviando…') : t('Send request', 'Enviar solicitud')}</button>
          {state === 'error' && <p role="alert">{t('We could not send your request. Please try again.', 'No pudimos enviar tu solicitud. Inténtalo de nuevo.')}</p>}
        </div>
      </form>
    )}
  </section>;
}
