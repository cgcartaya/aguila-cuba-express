'use client';

import { useState } from 'react';
import Script from 'next/script';
import s from './luxury.module.css';

declare global {
  interface Window {
    luxuryTranslateInit?: () => void;
    google?: { translate: { TranslateElement: new (options: Record<string, unknown>, id: string) => unknown } };
  }
}

// Load the translation provider only when the visitor requests another language.
export default function LanguageSelector() {
  const [enabled, setEnabled] = useState(false);
  const [failed, setFailed] = useState(false);
  function enable() {
    window.luxuryTranslateInit = () => {
      if (!document.getElementById('luxury-translate')?.querySelector('select')) {
        new window.google!.translate.TranslateElement({ pageLanguage: 'es', includedLanguages: 'es,en,fr,hi,ja,pt,de,ko,zh-CN,it', autoDisplay: false }, 'luxury-translate');
      }
    };
    setEnabled(true);
  }
  return <details className={s.languages}>
    <summary onClick={() => { if (!enabled) enable(); }}>🌐 Idiomas / Languages</summary>
    <div className={s.languagePanel}>
      <p>Español · English · Français · हिन्दी · 日本語 · Português · Deutsch · 한국어 · 中文 · Italiano</p>
      <div id="luxury-translate" aria-label="Seleccionar idioma" />
      <small>{failed ? 'La traducción no está disponible ahora. Puedes solicitar atención en tu idioma por WhatsApp.' : 'Español por defecto. Traducción automática de Google; confirma los detalles del viaje con tu asesor.'}</small>
    </div>
    {enabled && <Script id="luxury-google-translate" src="https://translate.google.com/translate_a/element.js?cb=luxuryTranslateInit" strategy="afterInteractive" onError={() => setFailed(true)} />}
  </details>;
}
