import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getPublicTravelPackages } from '@/lib/services/travel-public';
import { isLuxuryHost } from '@/lib/luxury/hosts';
import { normalizeStoreHost } from '@/lib/saas/store-metadata';
import PackageDetail from '@/components/landing/luxury/PackageDetail';
import { LuxuryLanguageProvider } from '@/components/landing/luxury/i18n';
import LanguageSelector from '@/components/landing/luxury/LanguageSelector';
import s from '@/components/landing/luxury/luxury.module.css';

const getPackage = cache(async (id: string) => {
  const requestHeaders = await headers();
  const host = normalizeStoreHost(requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || '');
  if (!isLuxuryHost(host)) notFound();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const packages = await getPublicTravelPackages(true);
  const pkg = packages.find(item => item.id === id);
  if (!pkg) notFound();
  return { pkg, host };
});
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { pkg: { content }, host } = await getPackage(id);
  const url = `https://${host}/viajes/${id}`;
  return { title: `${content.title} | Luxury Travel Point`, description: content.description.slice(0, 180), alternates: { canonical: url }, openGraph: { title: content.title, description: content.description.slice(0, 180), url, images: content.image ? [{ url: new URL(content.image, url).href }] : [] } };
}
export default async function TravelPackagePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ salida?: string }> }) {
  const { id } = await params;
  const [{ pkg }, query] = await Promise.all([getPackage(id), searchParams]);
  return <LuxuryLanguageProvider><main className={s.root} style={{ minHeight: '100vh', background: '#f5f2eb', paddingBottom: 50 }}><div style={{ maxWidth: 1048, margin: 'auto' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 24 }}><Link className={s.packageBack} href="/#destinos">← Luxury Travel Point · Todos los viajes</Link><LanguageSelector/></div><PackageDetail content={pkg.content} initialDepartureId={typeof query.salida === 'string' ? query.salida : ''}/></div></main></LuxuryLanguageProvider>;
}
