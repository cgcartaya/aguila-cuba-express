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

export const XPRESS_PACKAGING_NOTICE =
  "Las frutas están sujetas a disponibilidad en el mercado. Las frutas se embalan en cajitas para el envío. El costo adicional es de aproximadamente $2 USD por cajita. Xpress confirma el importe según la cantidad de cajitas necesarias.";

export function customerManagementFee(storeSlug: string | null | undefined) {
  return storeSlug === "xpress" ? 1.50 : 0;
}
