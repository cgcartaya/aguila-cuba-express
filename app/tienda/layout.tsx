"use client";

/* =========================================================
   LAYOUT GENERAL DE LA TIENDA PÚBLICA
   Este archivo envuelve todas las páginas dentro de /tienda
========================================================= */

import { usePathname } from "next/navigation";

import Header from "@/components/tienda/Header";
import FloatingCartBar from "@/components/tienda/FloatingCartBar";
import MainBanner from "@/components/tienda/MainBanner";
import BottomNavigation from "@/components/tienda/BottomNavigation";

import { useCart } from "@/contexts/CartContext";

type StoreLayoutProps = {
  children: React.ReactNode;
};

export default function StoreLayout({ children }: StoreLayoutProps) {
  const pathname = usePathname();

  const { cart } = useCart();

  const cartCount = cart.reduce((total, item) => {
    return total + item.quantity;
  }, 0);

  const hideMainBanner =
    pathname.startsWith("/tienda/producto/") ||
    pathname.startsWith("/tienda/cart") ||
    pathname.startsWith("/tienda/checkout") ||
    

  const hideBottomNavigation = pathname.startsWith("/tienda/checkout");

  const hideFloatingCart =
    pathname.startsWith("/tienda/cart") ||
    pathname.startsWith("/tienda/checkout") ||
   

  return (
    <main className="min-h-screen bg-white pb-24 text-[#061b3a]">
      <Header cartCount={cartCount} />

      <div className="mx-auto max-w-7xl px-4">
        {!hideMainBanner && <MainBanner />}

        {children}
      </div>

      {!hideFloatingCart && <FloatingCartBar />}
      {!hideBottomNavigation && <BottomNavigation />}
    </main>
  );
}