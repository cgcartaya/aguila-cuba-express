import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import MenuPageClientHybrid from '@/components/menu/MenuPageClientHybrid';
import { getPublicMenu } from '@/lib/services/menu';
import { getStoreSettings } from '@/lib/services/settings';
import { getRestaurantSection } from '@/lib/restaurant/server';
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };
type ThemeStyle = CSSProperties & { '--restaurant-primary': string; '--restaurant-secondary': string; '--restaurant-background': string };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug !== 'aguila') return { title: 'Restaurante' };
  const menu = await getPublicMenu(slug);
  if (!menu?.store) return { title: 'Restaurante' };
  const { config } = await getRestaurantSection(menu.store.id);
  if (!config.enabled) return { title: 'Restaurante', robots: { index: false, follow: false } };
  return { title: `${config.name} | Águila Express`, description: config.description || 'Comida a domicilio con entrega independiente.', openGraph: { title: `${config.name} | Águila Express`, description: config.description, ...(config.logo_url ? { images: [config.logo_url] } : {}) } };
}
export default async function RestaurantPage({ params }: Props) {
  const { slug } = await params;
  if (slug !== 'aguila') notFound();
  const menu = await getPublicMenu(slug);
  if (!menu?.store?.is_active || !menu.store.module_menu_enabled) notFound();
  const { config } = await getRestaurantSection(menu.store.id);
  if (!config.enabled) notFound();
  const { data: settings } = await getStoreSettings(menu.store.id);
  const themeStyle: ThemeStyle = { '--restaurant-primary': config.accent, '--restaurant-secondary': config.secondary_color, '--restaurant-background': config.background_color };
  return <div className="restaurant-theme" style={themeStyle}>
    <style>{`
      .restaurant-theme > main { background-color: var(--restaurant-background) !important; }
      .restaurant-theme > main > header { background-color: var(--restaurant-secondary) !important; }
      .restaurant-theme > main > header + div { background-color: color-mix(in srgb, var(--restaurant-background) 88%, white) !important; border-color: color-mix(in srgb, var(--restaurant-primary) 18%, transparent) !important; }
      .restaurant-theme > main input:focus { border-color: var(--restaurant-primary) !important; }
      .restaurant-theme > main nav a:active { border-color: var(--restaurant-primary) !important; background-color: color-mix(in srgb, var(--restaurant-primary) 10%, white) !important; }
    `}</style>
    <Suspense fallback={null}><MenuPageClientHybrid restaurantSection={config} store={{ ...menu.store, name: config.name, logo_url: config.logo_url || null }} categories={menu.categories} dailyMenus={menu.dailyMenus} whatsappNumber={settings?.whatsapp || null} storeSlug={slug} landingHref="/tienda/aguila" /></Suspense>
  </div>;
}
