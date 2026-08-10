/* =========================================================
   BANNER HELPERS

   Funciones reutilizables para:
   - Crear links de categoría.
   - Detectar qué categoría tiene seleccionada un banner.
   - Normalizar textos.
========================================================= */

import type { Category } from "@/components/admin/settings/types";

export const BANNER_BUCKET = "banner-images";

export function getCategoryLink(category: Category) {
  return `/tienda/categorias/${encodeURIComponent(
    category.name.toLowerCase()
  )}`;
}

export function getSelectedCategoryFromLink(
  categories: Category[],
  link?: string | null
) {
  if (!link) return "";

  const found = categories.find(
    (category) => getCategoryLink(category) === link
  );

  return found?.id || "";
}

export function getBannerTargetLink(
  categories: Category[],
  categoryId: string
) {
  if (!categoryId) return "/tienda";

  const category = categories.find((item) => item.id === categoryId);

  if (!category) return "/tienda";

  return getCategoryLink(category);
}

export function cleanText(value: string) {
  return value.trim();
}