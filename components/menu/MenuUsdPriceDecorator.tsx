"use client";

import { useEffect, useState } from "react";

type Currency = "CUP" | "USD" | "EUR";
type Props = { enabled: boolean; cupPerUsd: number | null; cupPerEur: number | null };

const STORAGE_KEY = "perla-menu-currency";

function formatMoney(cup: number, currency: Currency, cupPerUsd: number | null, cupPerEur: number | null) {
  if (currency === "USD" && cupPerUsd) return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cup / cupPerUsd);
  if (currency === "EUR" && cupPerEur) return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cup / cupPerEur);
  return `${new Intl.NumberFormat("es-CU", { maximumFractionDigits: 2 }).format(cup)} CUP`;
}

function readCupAmount(element: HTMLElement) {
  const stored = element.dataset.menuCupAmount;
  if (stored) { const value = Number(stored); return Number.isFinite(value) && value >= 0 ? value : null; }
  const text = element.textContent?.trim() || "";
  const match = text.match(/^\$\s*([\d,.]+)$/);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(value) || value < 0) return null;
  element.dataset.menuCupAmount = String(value);
  return value;
}

function findMenuPriceElements() {
  const elements = new Set<HTMLElement>();
  document.querySelectorAll<HTMLElement>("article strong").forEach((element) => {
    if (/^\$\s*[\d,.]+$/.test(element.textContent?.trim() || "") || element.dataset.menuCupAmount) elements.add(element);
  });
  document.querySelectorAll<HTMLElement>("h2").forEach((heading) => {
    const row = heading.parentElement?.parentElement;
    const strong = row?.querySelector<HTMLElement>(":scope > strong");
    if (strong && (/^\$\s*[\d,.]+$/.test(strong.textContent?.trim() || "") || strong.dataset.menuCupAmount)) elements.add(strong);
  });
  return elements;
}

export default function MenuUsdPriceDecorator({ enabled, cupPerUsd, cupPerEur }: Props) {
  const [currency, setCurrency] = useState<Currency>("CUP");
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "USD" && cupPerUsd) setCurrency("USD");
    else if (saved === "EUR" && cupPerEur) setCurrency("EUR");
  }, [cupPerUsd, cupPerEur]);

  useEffect(() => {
    if (!enabled) return;
    window.localStorage.setItem(STORAGE_KEY, currency);
    let queued = false;
    const apply = () => {
      queued = false;
      findMenuPriceElements().forEach((element) => {
        const cup = readCupAmount(element);
        if (cup === null) return;
        const next = formatMoney(cup, currency, cupPerUsd, cupPerEur);
        if (element.textContent !== next) element.textContent = next;
      });
    };
    const queueApply = () => { if (!queued) { queued = true; window.requestAnimationFrame(apply); } };
    queueApply();
    const observer = new MutationObserver(queueApply);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [enabled, currency, cupPerUsd, cupPerEur]);

  if (!enabled) return null;
  const options: { code: Currency; flag: string; symbol: string; disabled?: boolean }[] = [
    { code: "CUP", flag: "🇨🇺", symbol: "$" },
    { code: "USD", flag: "🇺🇸", symbol: "$", disabled: !cupPerUsd },
    { code: "EUR", flag: "🇪🇺", symbol: "€", disabled: !cupPerEur },
  ];

  return (
    <div className="sticky top-0 z-[45] flex justify-end px-3 pt-2 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-lg backdrop-blur">
        <span className="hidden px-2 text-[10px] font-black uppercase tracking-wide text-slate-400 sm:block">Moneda</span>
        {options.map((option) => (
          <button key={option.code} type="button" disabled={option.disabled} onClick={() => setCurrency(option.code)} title={option.disabled ? `${option.code} no configurado` : `Ver precios en ${option.code}`} className={`flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-black transition ${currency === option.code ? "bg-[#071B35] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"} disabled:cursor-not-allowed disabled:opacity-35`}>
            <span className="text-base leading-none">{option.flag}</span><span>{option.code}</span><span className="opacity-60">{option.symbol}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
