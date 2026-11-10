'use client';

import { useLuxuryLanguage, type LuxuryLanguage } from './i18n';
import s from './luxury.module.css';

export default function LanguageSelector() {
  const {language,setLanguage}=useLuxuryLanguage();
  const label=language==='en'?'Language':language==='fr'?'Langue':'Idioma';
  return <label className={s.languageSelect}><span>🌐 {label}</span><select aria-label={label} value={language} onChange={e=>setLanguage(e.target.value as LuxuryLanguage)}><option value="es" lang="es">Español</option><option value="en" lang="en">English</option><option value="fr" lang="fr">Français</option></select></label>;
}
