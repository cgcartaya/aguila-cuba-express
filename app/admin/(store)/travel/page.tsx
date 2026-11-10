'use client';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useStore } from '@/hooks/useStore';
import { LUXURY_SLUG } from '@/lib/travel/types';
import TravelManager from '@/components/admin/travel/TravelManager';
export default function TravelAdminPage() {
  const access = useAdminAccess();
  const selection = useStore();
  const store = access.isSuperAdmin ? selection.store || access.store : access.store;
  if (access.loading || selection.loading) return <p>Cargando agencia…</p>;
  if (!store || store.slug !== LUXURY_SLUG) return <p>El módulo de paquetes turísticos está disponible para Luxury Travel Point.</p>;
  return <TravelManager key={store.id} storeId={store.id}/>;
}
