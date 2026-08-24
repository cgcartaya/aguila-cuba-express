"use client";

import { Languages } from "lucide-react";
import { useDeParisLanguage } from "./DeParisLanguageProvider";

export default function LanguageSelector({ floating = false, compact = false }: { floating?: boolean; compact?: boolean }) {
  const { locale, setLocale } = useDeParisLanguage();
  return (
    <div data-dp-i18n-ignore className={`${floating ? "fixed right-3 top-[68px] z-[80] shadow-lg" : ""} inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/95 p-1 text-[11px] font-black text-slate-700 backdrop-blur`} aria-label="Language selector">
      {!compact && <Languages size={14} className="ml-1 text-[#FC6C26]" />}
      {(["es", "en"] as const).map((item) => <button key={item} type="button" onClick={() => setLocale(item)} aria-pressed={locale === item} className={`rounded-full px-2.5 py-1.5 transition ${locale === item ? "bg-[#1B1410] text-white" : "hover:bg-slate-100"}`}>{item.toUpperCase()}</button>)}
    </div>
  );
}
