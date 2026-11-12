'use client';

import { useLuxuryLanguage, type LuxuryLanguage } from './i18n';
import s from './dmc.module.css';

const languages = [
  ['en', '🇺🇸', 'English'],
  ['es', '🇪🇸', 'Español'],
  ['fr', '🇫🇷', 'Français'],
] as const satisfies readonly (readonly [LuxuryLanguage, string, string])[];

export default function LanguageSelector() {
  const { language, setLanguage } = useLuxuryLanguage();
  const label = language === 'en' ? 'Language' : language === 'fr' ? 'Langue' : 'Idioma';
  return <div className={s.languages} role="group" aria-label={label}>
    {languages.map(([code, flag, name]) => (
      <button key={code} type="button" lang={code} aria-label={name} aria-pressed={language === code} onClick={() => setLanguage(code)}>{flag}</button>
    ))}
  </div>;
}
