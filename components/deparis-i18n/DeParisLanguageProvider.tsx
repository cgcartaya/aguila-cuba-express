"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import LanguageSelector from "./LanguageSelector";
import { translateDeParisText, type DeParisLocale } from "./translations";

const STORAGE_KEY = "deparis-language";
const LanguageContext = createContext<{ locale: DeParisLocale; setLocale: (locale: DeParisLocale) => void }>({ locale: "es", setLocale: () => undefined });
const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
const TRANSLATABLE_ATTRIBUTES = ["placeholder", "aria-label", "title"] as const;

function ignored(node: Node) {
  const element = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement;
  return Boolean(element?.closest("[data-dp-i18n-ignore], script, style"));
}

function translateTree(root: HTMLElement, locale: DeParisLocale) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let current: Node | null = root;
  while (current) {
    if (!ignored(current)) {
      if (current.nodeType === Node.TEXT_NODE) {
        const node = current as Text;
        if (!originalText.has(node)) originalText.set(node, node.data);
        const source = originalText.get(node) || node.data;
        node.data = locale === "en" ? translateDeParisText(source) : source;
      } else {
        const element = current as Element;
        let originals = originalAttributes.get(element);
        if (!originals) { originals = new Map(); originalAttributes.set(element, originals); }
        for (const attribute of TRANSLATABLE_ATTRIBUTES) {
          const value = element.getAttribute(attribute);
          if (value !== null && !originals.has(attribute)) originals.set(attribute, value);
          const source = originals.get(attribute);
          if (source !== undefined) element.setAttribute(attribute, locale === "en" ? translateDeParisText(source) : source);
        }
      }
    }
    current = walker.nextNode();
  }
}

export function useDeParisLanguage() { return useContext(LanguageContext); }

export default function DeParisLanguageProvider({ children, floatingSelector = false }: { children: React.ReactNode; floatingSelector?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [locale, updateLocale] = useState<DeParisLocale>("es");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "es") {
      queueMicrotask(() => updateLocale(saved));
    }
  }, []);

  const setLocale = useCallback((next: DeParisLocale) => {
    updateLocale(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    document.documentElement.lang = locale;
    translateTree(root, locale);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) translateTree(node as HTMLElement, locale);
          else if (node.nodeType === Node.TEXT_NODE && node.parentElement) translateTree(node.parentElement, locale);
        });
      }
    });
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [locale]);

  return <LanguageContext.Provider value={{ locale, setLocale }}><div ref={rootRef} data-deparis-locale={locale}>{children}{floatingSelector && <LanguageSelector floating />}</div></LanguageContext.Provider>;
}
