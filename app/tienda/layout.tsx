"use client";

import { usePathname } from "next/navigation";

import Header from "@/components/tienda/Header";
import FloatingCartBar from "@/components/tienda/FloatingCartBar";
import BottomNavigation from "@/components/tienda/BottomNavigation";
import { TiendaSearchProvider } from "@/components/tienda/search/TiendaSearchContext";

import { useCart } from "@/contexts/CartContext";

type StoreLayoutProps = {
  children: React.ReactNode;
};

export default function StoreLayout({ children }: StoreLayoutProps) {
  const pathname = usePathname();
  const { cart } = useCart();

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  const isCartPage = pathname.endsWith("/cart") || pathname.includes("/cart/");
  const isCheckoutPage =
    pathname.endsWith("/checkout") || pathname.includes("/checkout/");

  return (
    <TiendaSearchProvider>
      <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-white pb-24 text-[#061b3a]">
        <Header cartCount={cartCount} />

        <div className="mx-auto w-full max-w-7xl overflow-hidden px-4">
          {children}
        </div>

        {!isCartPage && !isCheckoutPage && <FloatingCartBar />}
        {!isCheckoutPage && <BottomNavigation />}
      </main>
    </TiendaSearchProvider>
  );
}