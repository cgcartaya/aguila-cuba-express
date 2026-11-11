import { useLuxuryLanguage } from './i18n';
import { contact } from './content';
import type { ShippingEntry } from '@/lib/luxury/shipping';

export type ShippingCatalog = { entries: ShippingEntry[]; whatsapp: string };
export const external = { target: '_blank', rel: 'noopener noreferrer' } as const;

export function useCommercialCopy(catalog?: ShippingCatalog) {
  const { language } = useLuxuryLanguage();
  const tr = (es: string, en: string, fr: string) => ({ es, en, fr })[language];
  const whatsapp = (subject: string, message?: string) => {
    const text = message || tr(
      `Hola, Luxury Travel Point. Quisiera información sobre ${subject}.`,
      `Hello, Luxury Travel Point. I’d like information about ${subject}.`,
      `Bonjour, Luxury Travel Point. Je souhaiterais des renseignements sur ${subject}.`,
    );
    return `${catalog?.whatsapp || `https://wa.me/${contact.whatsapp}`}?text=${encodeURIComponent(text)}`;
  };
  return { language, tr, whatsapp };
}

