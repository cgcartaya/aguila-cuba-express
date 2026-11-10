import type { Metadata } from 'next';
import { getPublicTravelPackages } from '@/lib/services/travel-public';
import LuxuryLanding from '@/components/landing/luxury/LuxuryLanding';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'Luxury Travel Point | Propuesta de diseño' },
  robots: { index: false, follow: false },
};
export default async function LuxuryDesignPreview() {
  try { return <LuxuryLanding packages={await getPublicTravelPackages()}/>; }
  catch { return <LuxuryLanding catalogError/>; }
}
