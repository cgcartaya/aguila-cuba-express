import type { Metadata } from "next";
import DeParisLanding from "@/components/landing/deparis/DeParisLanding";
import { getFeaturedMenuItems, isMenuModuleEnabled } from "@/lib/services/menu";

// Sin esto, Next.js puede cachear la respuesta de Supabase de un
// build anterior y "congelar" el valor de module_menu_enabled (y los
// platos destacados) hasta el próximo redeploy. Con esto, se vuelve
// a consultar en cada visita.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "De Paris | Mercado & Bistró francés en Cienfuegos",
  description:
    "De Paris es un bar restaurante y mercado online de inspiración francesa en Cienfuegos, Cuba: panadería, quesos, vinos y platos de bistró con delivery o retiro en tienda.",
};

// Server component: consulta si el módulo de menú está habilitado
// para "deparis" y trae hasta 6 platillos marcados como destacados.
// Si el Super Admin desactiva el módulo, tanto el link del menú como
// la sección de "Platos Destacados" desaparecen solos, sin tocar
// código.
export default async function DeParisPage() {
  const [menuEnabled, featuredItems] = await Promise.all([
    isMenuModuleEnabled("deparis"),
    getFeaturedMenuItems("deparis", 6),
  ]);

  const menuHref = menuEnabled ? "/menu/deparis" : undefined;

  const featuredDishes = featuredItems.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    image_url: item.image_url,
  }));

  return <DeParisLanding menuHref={menuHref} featuredDishes={featuredDishes} />;
}
