'use client';

import type { Locale } from '@/lib/luxury/dmc/content';
import { saveLuxuryLanguage } from './i18n';
import s from './dmc.module.css';

export function DmcLanguageLinks({ locale, path }: { locale: Locale; path: string }) {
  return <div className={s.languages} aria-label={locale === 'es' ? 'Idioma' : 'Language'}>
    <a href={'/en' + path} lang="en" aria-label="English" aria-current={locale === 'en' ? 'true' : undefined} onClick={() => saveLuxuryLanguage('en')}>🇺🇸</a>
    <a href={'/es' + path} lang="es" aria-label="Español" aria-current={locale === 'es' ? 'true' : undefined} onClick={() => saveLuxuryLanguage('es')}>🇪🇸</a>
  </div>;
}
