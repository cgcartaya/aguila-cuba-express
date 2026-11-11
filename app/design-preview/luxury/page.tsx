import type { Metadata } from 'next';
import { getPublicTravelPackages } from '@/lib/services/travel-public';
import { getLuxuryShipping } from '@/lib/luxury/shipping-public';
import LuxuryLanding from '@/components/landing/luxury/LuxuryLanding';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'Luxury Travel Point | Propuesta de diseño' },
  robots: { index: false, follow: false },
};
export default async function LuxuryDesignPreview() {
  const [travel, shipping] = await Promise.allSettled([getPublicTravelPackages(), getLuxuryShipping()]);
  return <LuxuryLanding
    packages={travel.status === 'fulfilled' ? travel.value : []}
    catalogError={travel.status === 'rejected'}
    shipping={shipping.status === 'fulfilled' ? shipping.value : undefined}
  />;
}
