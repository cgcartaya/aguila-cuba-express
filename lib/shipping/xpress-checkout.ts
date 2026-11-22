export const XPRESS_FRESH_CATEGORY = "Frutas frescas";
export const XPRESS_FRESH_SERVICE = "xpress-frutas";
export const XPRESS_FRESH_DELIVERY = "La Habana: 24 horas. Otras provincias: 48–72 horas.";

export function isXpressFreshProduct(category: string | null | undefined) {
  return category?.trim().toLowerCase() === XPRESS_FRESH_CATEGORY.toLowerCase();
}

export function isXpressCheckoutRate(mode: string, scope: string) {
  if (mode === "express") return scope === "municipality";
  if (mode === "air" || mode === "sea") return scope === "province";
  return true;
}
