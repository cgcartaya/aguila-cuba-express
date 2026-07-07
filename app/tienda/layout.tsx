"use client";

/* =========================================================
   LAYOUT GENERAL DE LA TIENDA PÚBLICA - HOME ONLY STICKY

   - Header fijo arriba.
   - Categorías sticky SOLO en home:
     /tienda
     /tienda/[slug]
   - En carrito, checkout, producto, categorías, etc. NO aparecen.
========================================================= */

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import Header from "@/components/tienda/Header";
import StickyCategoryTabs from "@/components/tienda/StickyCategoryTabs";
import FloatingCartBar from "@/components/tienda/FloatingCartBar";
import BottomNavigation from "@/components/tienda/BottomNavigation";
import { TiendaSearchProvider } from "@/components/tienda/search/TiendaSearchContext";

import { useCart } from "@/contexts/CartContext";
import { useStore } from "@/hooks/useStore";
import { getActiveCategoriesByStoreId } from "@/lib/services/settings";

import type { Category } from "@/components/admin/settings/types";

type StoreLayoutProps = {
  children: React.ReactNode;
};

const reservedTiendaRoutes = [
  "cart",
  "checkout",
  "producto",
  "productos",
  "productos-destacados",
  "combos",
  "categorias",
];

function isPublicStoreHome(pathname: string) {
  const pathParts = pathname.split("/").filter(Boolean);

  const isDefaultHome = pathParts.length === 1 && pathParts[0] === "tienda";

  const isStoreSlugHome =
    pathParts.length === 2 &&
    pathParts[0] === "tienda" &&
    !reservedTiendaRoutes.includes(pathParts[1]);

  return isDefaultHome || isStoreSlugHome;
}

export default function StoreLayout({ children }: StoreLayoutProps) {
  const pathname = usePathname();

  const { cart } = useCart();
  const { store } = useStore();

  const [categories, setCategories] = useState<Category[]>([]);

  const cartCount = cart.reduce((total, item) => {
    return total + item.quantity;
  }, 0);

  const showStickyCategories = isPublicStoreHome(pathname);

  const isCartPage = pathname.endsWith("/cart") || pathname.includes("/cart/");
  const isCheckoutPage =
    pathname.endsWith("/checkout") || pathname.includes("/checkout/");

  const hideBottomNavigation = isCheckoutPage;
  const hideFloatingCart = isCartPage || isCheckoutPage;

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  useEffect(() => {
    let mounted = true;

    async function loadCategories() {
      if (!store?.id || !showStickyCategories) {
        setCategories([]);
        return;
      }

      const { data } = await getActiveCategoriesByStoreId(store.id);

      if (!mounted) return;

      setCategories((data as Category[]) || []);
    }

    loadCategories();

    return () => {
      mounted = false;
    };
  }, [store?.id, showStickyCategories]);

  const stickyCategories = useMemo(() => {
    if (!showStickyCategories) return [];

    return [
      {
        name: "Combos",
        color: "#061b3a",
      },
      ...categories.map((category) => ({
        name: category.name,
        color: category.color,
      })),
    ];
  }, [categories, showStickyCategories]);

  const contentTopPadding =
    showStickyCategories && stickyCategories.length > 0
      ? "pt-[106px]"
      : "pt-[58px]";

  return (
    <TiendaSearchProvider>
      <main className="min-h-screen w-full max-w-full overflow-x-clip bg-white pb-24 text-[#061b3a]">
        <Header cartCount={cartCount} />

        {showStickyCategories && stickyCategories.length > 0 && (
          <StickyCategoryTabs categories={stickyCategories} />
        )}

        <div
          className={`mx-auto w-full max-w-7xl overflow-hidden px-4 ${contentTopPadding}`}
        >
          {children}
        </div>

        {!hideFloatingCart && <FloatingCartBar />}
        {!hideBottomNavigation && <BottomNavigation />}
      </main>
    </TiendaSearchProvider>
  );
}
