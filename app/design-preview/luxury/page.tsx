import type { Metadata } from 'next';
import LuxuryLanding from '@/components/landing/luxury/LuxuryLanding';

export const metadata: Metadata = {
  title: { absolute: 'Luxury Travel Point | Propuesta de diseño' },
  robots: { index: false, follow: false },
};
export default function LuxuryDesignPreview() { return <LuxuryLanding />; }
