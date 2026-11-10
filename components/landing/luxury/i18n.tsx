'use client';

import { cloneElement, createContext, isValidElement, useContext, useEffect, useState, type ReactNode, type ReactElement } from 'react';
import translations from './translations.json';

export type LuxuryLanguage = 'es' | 'en' | 'fr';
const LanguageContext = createContext<{language: LuxuryLanguage; setLanguage: (language: LuxuryLanguage) => void}>({language:'es',setLanguage:()=>{}});
export function LuxuryLanguageProvider({children}:{children:ReactNode}) {
  const [language,setLanguage] = useState<LuxuryLanguage>('es');
  useEffect(() => {
    const previousLanguage=document.documentElement.lang;
    try { const saved=localStorage.getItem('luxury-language-v1');if(saved==='en'||saved==='fr')setLanguage(saved); } catch { /* Storage is optional. */ }
    return () => { document.documentElement.lang=previousLanguage; };
  },[]);
  useEffect(() => { document.documentElement.lang=language; },[language]);
  function changeLanguage(value:LuxuryLanguage) { setLanguage(value);try{localStorage.setItem('luxury-language-v1',value);}catch{ /* Private browsing is supported. */ } }
  return <LanguageContext.Provider value={{language,setLanguage:changeLanguage}}>{children}</LanguageContext.Provider>;
}
export const useLuxuryLanguage = () => useContext(LanguageContext);
export function translateText(text:string,language:LuxuryLanguage):string {
  if(language==='es')return text;
  const dictionary=translations[language] as Record<string,string>;
  const normalized=text.replace(/\s+/g,' ').trim();
  if(Object.prototype.hasOwnProperty.call(dictionary,normalized))return (text.match(/^\s*/)?.[0]??'')+dictionary[normalized]+(text.match(/\s*$/)?.[0]??'');
  if(normalized.includes(' · '))return normalized.split(' · ').map(part=>translateText(part,language)).join(' · ');
  const numbered=normalized.match(/^(\d+|6 o más) (personas?|noches)$/);
  if(numbered)return `${translateText(numbered[1],language)} ${translateText(numbered[2],language)}`;
  return text;
}
/** Translate React-owned text and labels; never mutate the live DOM or form values. */
export function translateTree(node:ReactNode,language:LuxuryLanguage):ReactNode {
  if(language==='es')return node;
  if(typeof node==='string')return translateText(node,language);
  if(Array.isArray(node))return node.map(child=>translateTree(child,language));
  if(!isValidElement(node))return node;
  const element=node as ReactElement<Record<string,unknown>>;
  if(element.type==='script'||element.type==='style'||element.type==='input'||element.type==='textarea') {
    if(element.type==='script'||element.type==='style')return element;
  }
  const props:Record<string,unknown>={};
  for(const key of ['aria-label','title','placeholder','alt'])if(typeof element.props[key]==='string')props[key]=translateText(element.props[key] as string,language);
  // Implicit option values must stay in their original language for filters and forms.
  if(element.type==='option'&&element.props.value===undefined&&typeof element.props.children==='string')props.value=element.props.children;
  if(element.props.children!==undefined)props.children=translateTree(element.props.children as ReactNode,language);
  return cloneElement(element,props);
}
