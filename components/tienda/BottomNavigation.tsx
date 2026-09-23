"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStoreSettings } from "@/lib/services/settings";
import { usePathname } from "next/navigation";
import { useStore } from "@/hooks/useStore";

import {
  House,
  Package,
  ShoppingBag,
  CalendarDays,
  MessageCircle,
} from "lucide-react";

export default function BottomNavigation() {
  const pathname = usePathname();
  const { store, loading: storeLoading } = useStore();
  const [helpPhone, setHelpPhone] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setHelpPhone(null);
    if (!store?.id || storeLoading) return () => { active = false; };
    getStoreSettings(store.id).then(({ data }) => {
      if (!active) return;
      const digits = (data?.whatsapp || data?.phone || store.client_phone || "").replace(/\D/g, "");
      setHelpPhone(digits.length >= 8 ? digits : null);
    }).catch(() => { if (active) setHelpPhone(null); });
    return () => { active = false; };
  }, [store?.id, storeLoading, store?.client_phone]);
  const showShipping = !storeLoading && store?.module_shipping_enabled === true;
  const showDepartures = showShipping && store?.module_pickups_enabled === true;

const isDefaultStore = store?.slug === "aguila";

const storeBaseUrl =
  store?.slug && !isDefaultStore
    ? `/tienda/${store.slug}`
    : "/tienda";

  const isActive = (href: string) => {
    if (href === storeBaseUrl) {
      return pathname === href || pathname.startsWith(`${href}/`);
    }

    return pathname.startsWith(href);
  };

  const itemClass = (active: boolean) =>
    `flex flex-col items-center gap-1 transition ${
      active ? "text-red-600" : "text-slate-500"
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white px-4 py-2 shadow-lg xl:hidden">
      <div className="mx-auto flex max-w-2xl items-center justify-around text-center text-xs font-bold">
        <Link href="/" className={itemClass(pathname === "/")}>
          <House size={21} />
          <span>Inicio</span>
        </Link>

        {showShipping && <Link
          href="/rastrear"
          className={itemClass(pathname.startsWith("/rastrear"))}
        >
          <Package size={21} />
          <span>Rastrear</span>
        </Link>}

        <Link href={storeBaseUrl} className={itemClass(isActive(storeBaseUrl))}>
          <ShoppingBag size={21} />
          <span>Tienda</span>
        </Link>

        {showDepartures && <Link
          href="/salidas"
          className={itemClass(pathname.startsWith("/salidas"))}
        >
          <CalendarDays size={21} />
          <span>Salidas</span>
        </Link>}

        {helpPhone && <a
          href={`https://wa.me/${helpPhone}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 text-green-600 transition"
        >
          <MessageCircle size={21} />
          <span>Ayuda</span>
        </a>}
      </div>
    </nav>
  );
}