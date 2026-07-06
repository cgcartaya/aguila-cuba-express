"use client";

/* =========================================================
   LAYOUT GENERAL DE LA TIENDA PÚBLICA
   Header V2 + SearchProvider:
   - El buscador vive en el Header.
   - El estado de búsqueda se comparte con la página de tienda.
   - No usa useSearchParams, compatible con Next.js 15/Vercel.
========================================================= */

import { usePathname } from "next/navigation";

import Header from "@/components/tienda/Header";
import FloatingCartBar from "@/components/tienda/FloatingCartBar";
import MainBanner from "@/components/tienda/MainBanner";
import BottomNavigation from "@/components/tienda/BottomNavigation";
import { TiendaSearchProvider } from "@/components/tienda/search/TiendaSearchContext";

import { useCart } from "@/contexts/CartContext";
import { useStore } from "@/hooks/useStore";

type StoreLayoutProps = {
  children: React.ReactNode;
};

export default function StoreLayout({ children }: StoreLayoutProps) {
  const pathname = usePathname();

  const { cart } = useCart();
  const { store } = useStore();

  const cartCount = cart.reduce((total, item) => {
    return total + item.quantity;
  }, 0);

  const isProductDetail = pathname.includes("/producto/");

  const isCartPage =
    pathname.endsWith("/cart") || pathname.includes("/cart/");

  const isCheckoutPage =
    pathname.endsWith("/checkout") || pathname.includes("/checkout/");

  const hideMainBanner = isProductDetail || isCartPage || isCheckoutPage;

  const hideBottomNavigation = isCheckoutPage;

  const hideFloatingCart = isCartPage || isCheckoutPage;

  return (
    <TiendaSearchProvider>
      <main className="min-h-screen bg-white pb-24 text-[#061b3a]">
        <Header cartCount={cartCount} />

        <div className="mx-auto max-w-7xl px-4">
          {!hideMainBanner && <MainBanner storeId={store?.id} />}

          {children}
        </div>

        {!hideFloatingCart && <FloatingCartBar />}
        {!hideBottomNavigation && <BottomNavigation />}
      </main>
    </TiendaSearchProvider>
  );
}
