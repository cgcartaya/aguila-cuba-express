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
import { getStoreBySlug } from "@/lib/services/stores";

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


function getStoreSlugFromPathname(pathname: string) {
  const pathParts = pathname.split("/").filter(Boolean);

  const isSlugHomeOrChild =
    pathParts.length >= 2 &&
    pathParts[0] === "tienda" &&
    !reservedTiendaRoutes.includes(pathParts[1]);

  return isSlugHomeOrChild ? pathParts[1] : null;
}

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
  const pathnameStoreSlug = getStoreSlugFromPathname(pathname);

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
      if (!showStickyCategories) {
        setCategories([]);
        return;
      }

      /*
        En tiendas por slug no dependemos solamente de StoreContext.
        Al recargar directamente /tienda/deparis, el contexto puede tardar
        en resolver la tienda y las pestañas sticky quedaban vacías.
      */
      let resolvedStoreId = store?.id || null;

      if (pathnameStoreSlug) {
        const pathnameStore = await getStoreBySlug(pathnameStoreSlug);
        resolvedStoreId = pathnameStore?.id || null;
      }

      if (!resolvedStoreId) {
        if (mounted) setCategories([]);
        return;
      }

      const { data, error } = await getActiveCategoriesByStoreId(
        resolvedStoreId
      );

      if (!mounted) return;

      if (error) {
        console.error("Error cargando categorías sticky:", error);
        setCategories([]);
        return;
      }

      setCategories((data as Category[]) || []);
    }

    loadCategories();

    return () => {
      mounted = false;
    };
  }, [pathnameStoreSlug, showStickyCategories, store?.id]);

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
