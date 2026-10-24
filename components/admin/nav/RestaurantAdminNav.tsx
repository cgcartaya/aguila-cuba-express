"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronDown, UtensilsCrossed } from 'lucide-react';
import { withAlpha } from '@/lib/admin/theme';

const links = [
  ['/admin/menu/restaurante', 'Configuración'],
  ['/admin/menu', 'Categorías y platos'],
  ['/admin/menu/ordenes', 'Pedidos'],
  ['/admin/menu/restaurante#zonas', 'Zonas y tarifas'],
  ['/admin/menu/operacion', 'Disponibilidad'],
  ['/admin/menu/inventario', 'Inventario del restaurante'],
  ['/admin/menu/menu-del-dia', 'Menú del día'],
] as const;

/** Uses the existing desktop theme and mobile link styles; only Águila replaces its flat menu group. */
export default function RestaurantAdminNav({ pathname, mobile = false, onNavigate, textColor = '#061b3a', accentColor = '#061b3a', pendingOrders = 0 }: {
  pathname: string; mobile?: boolean; onNavigate?: () => void; textColor?: string; accentColor?: string; pendingOrders?: number;
}) {
  const [hash, setHash] = useState('');
  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync(); window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [pathname]);
  return <details open className="group">
    <summary className={`flex cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-3 font-bold transition hover:opacity-80 [&::-webkit-details-marker]:hidden ${mobile ? 'text-base text-[#061b3a]' : 'text-sm'}`} style={mobile ? undefined : { color: textColor }}>
      <UtensilsCrossed size={mobile ? 24 : 19} />Restaurante<ChevronDown size={18} className="ml-auto transition-transform group-open:rotate-180" />
    </summary>
    <div className="mt-1 space-y-1.5 pl-4">
      {links.map(([href, label]) => {
        const [path, fragment] = href.split('#');
        const active = pathname === path && (fragment ? hash === `#${fragment}` : !hash || (path !== '/admin/menu/restaurante'));
        return <Link key={href} href={href} onClick={() => { setHash(fragment ? `#${fragment}` : ''); onNavigate?.(); }} aria-current={active ? 'page' : undefined}
          className={`flex min-h-11 items-center rounded-2xl px-4 py-3 text-sm font-bold transition ${mobile ? (active ? 'bg-red-50 text-red-600' : 'text-[#061b3a] hover:bg-slate-50') : (active ? 'bg-white shadow-lg' : 'hover:opacity-80')}`}
          style={mobile ? undefined : { color: active ? accentColor : textColor, ...(active ? {} : { backgroundColor: withAlpha(textColor, 0.05) }) }}>{label}{href === '/admin/menu/ordenes' && pendingOrders > 0 && <span className="ml-auto rounded-full bg-red-600 px-2 py-0.5 text-xs font-black text-white">{pendingOrders > 99 ? '99+' : pendingOrders}</span>}</Link>;
      })}
    </div>
  </details>;
}
