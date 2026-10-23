const RESERVED_ROUTES = new Set([
  "cart", "checkout", "producto", "productos", "productos-destacados", "combos", "categorias",
]);

/** Resolve from the current URL so searches never jump to another tenant. */
export function getStorefrontSearchPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "tienda" || !parts[1] || RESERVED_ROUTES.has(parts[1])) return "/tienda";
  return `/tienda/${parts[1]}`;
}
