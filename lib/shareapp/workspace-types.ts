export type Section = "catalogo" | "publicaciones" | "resultados" | "cuenta";
export const sections: { id: Section; label: string; hint: string }[] = [
  {
    id: "catalogo",
    label: "Catálogo",
    hint: "Encuentra tu próxima publicación",
  },
  {
    id: "publicaciones",
    label: "Publicaciones",
    hint: "Tu contenido, listo para compartir",
  },
  {
    id: "resultados",
    label: "Resultados",
    hint: "Conoce el impacto de tus enlaces",
  },
  { id: "cuenta", label: "Mi cuenta", hint: "Tu acceso y tus tiendas" },
];
export type Membership = {
  id: string;
  store_id: string;
  display_name: string;
  stores: { name: string; slug?: string };
};
export type CatalogItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  stock?: number;
  category?: string;
  product_images?: { image_url: string; is_main: boolean }[];
  combo_items?: {
    quantity: number;
    products: {
      id?: string;
      stock: number;
      is_active: boolean;
      store_id: string;
      deleted_at: string | null;
    } | null;
  }[];
};
export type Publication = {
  id: string;
  kind: "store" | "product" | "combo";
  item_id: string | null;
  network: string;
  title: string;
  body: string;
  url: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};
export type Draft = {
  key: string;
  id?: string;
  kind: Publication["kind"];
  itemId?: string | null;
  title: string;
  body: string;
  network: string;
  url?: string;
  active?: boolean;
  saved?: { title: string; body: string; network: string };
};
export const networkNames: Record<string, string> = {
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  instagram: "Instagram",
  telegram: "Telegram",
  other: "Otra red",
};
export function itemAvailable(
  item: CatalogItem,
  storeId: string,
  kind: string,
) {
  if (kind === "product") return Number(item.stock) > 0;
  if (!item.combo_items?.length) return false;
  // Multiple component rows can refer to the same product; aggregate demand.
  const demand = new Map<string, { quantity: number; stock: number }>();
  for (const [index, row] of item.combo_items.entries()) {
    const product = row.products;
    if (
      !(row.quantity > 0) ||
      !product?.is_active ||
      product.deleted_at ||
      product.store_id !== storeId
    )
      return false;
    const id = product.id || String(index);
    const previous = demand.get(id);
    demand.set(id, {
      quantity: (previous?.quantity || 0) + row.quantity,
      stock: Number(product.stock),
    });
  }
  return Array.from(demand.values()).every((row) => row.stock >= row.quantity);
}
export function newDraft(
  item?: CatalogItem,
  kind: "product" | "combo" = "product",
  storeName = "nuestra tienda",
): Draft {
  return {
    key: globalThis.crypto.randomUUID(),
    kind: item ? kind : "store",
    itemId: item?.id,
    title: item?.name || `Descubre ${storeName}`,
    body: item
      ? `${item.name}\nPrecio: ${Number(item.price).toFixed(2)} USD\n${item.description || ""}`
          .trim()
          .slice(0, 5000)
      : `Descubre los productos de ${storeName}. Consulta precios y disponibilidad en nuestra tienda.`,
    network: "whatsapp",
  };
}
