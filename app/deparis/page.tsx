import type { Metadata } from "next";
import DeParisLanding from "@/components/landing/deparis/DeParisLanding";
import { isMenuModuleEnabled } from "@/lib/services/menu";

export const metadata: Metadata = {
  title: "De Paris | Mercado & Bistró francés en Cienfuegos",
  description:
    "De Paris es un bar restaurante y mercado online de inspiración francesa en Cienfuegos, Cuba: panadería, quesos, vinos y platos de bistró con delivery o retiro en tienda.",
};

// Server component: consulta si el módulo de menú está habilitado
// para "deparis" y solo entonces la landing muestra el link hacia
// /menu/deparis. Si el Super Admin lo desactiva, el link desaparece
// solo, sin tocar código.
export default async function DeParisPage() {
  const menuEnabled = await isMenuModuleEnabled("deparis");

  return <DeParisLanding menuHref={menuEnabled ? "/menu/deparis" : undefined} />;
}
