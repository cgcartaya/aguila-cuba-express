export type Section =
  "inicio" | "catalogo" | "campanas" | "publicaciones" | "resultados" | "cuenta";
export const sections: { id: Section; label: string; hint: string }[] = [
  { id: "inicio", label: "Inicio", hint: "Tu actividad y resultados de un vistazo" },
  { id: "catalogo", label: "Catálogo", hint: "Encuentra tu próxima publicación" },
  { id: "campanas", label: "Campañas", hint: "Pósteres de tu tienda, listos para compartir" },
  { id: "publicaciones", label: "Publicaciones", hint: "Tu contenido, listo para compartir" },
  { id: "resultados", label: "Resultados", hint: "Conoce el impacto de tus enlaces" },
  { id: "cuenta", label: "Mi cuenta", hint: "Tu acceso y tus tiendas" },
];
export type Membership = { id: string; store_id: string; display_name: string; stores: { name: string; slug?: string } };
export type CatalogItem = {
  id: string; name: string; description: string; price: number; image_url: string | null; stock?: number; category?: string;
  product_images?: { image_url: string; is_main: boolean }[];
  combo_items?: { quantity: number; products: { id?: string; stock: number; is_active: boolean; store_id: string; deleted_at: string | null } | null }[];
};
export type Publication = { campaign_id?: string | null; id: string; kind: "store" | "product" | "combo"; item_id: string | null; network: string; title: string; body: string; url: string; active: boolean; created_at: string; updated_at: string };
export type Draft = { campaignId?: string | null; key: string; imageUrl?: string | null; id?: string; kind: Publication["kind"]; itemId?: string | null; title: string; body: string; network: string; url?: string; active?: boolean; saved?: { title: string; body: string; network: string } };
export const networkNames: Record<string, string> = { whatsapp: "WhatsApp", facebook: "Facebook", instagram: "Instagram", telegram: "Telegram", other: "Otra red" };
export function itemAvailable(item: CatalogItem, storeId: string, kind: string) {
  if (kind === "product") return Number(item.stock) > 0;
  if (!item.combo_items?.length) return false;
  const demand = new Map<string, { quantity: number; stock: number }>();
  for (const [index, row] of item.combo_items.entries()) {
    const product = row.products;
    if (!(row.quantity > 0) || !product?.is_active || product.deleted_at || product.store_id !== storeId) return false;
    const id = product.id || String(index);
    const previous = demand.get(id);
    demand.set(id, { quantity: (previous?.quantity || 0) + row.quantity, stock: Number(product.stock) });
  }
  return Array.from(demand.values()).every((row) => row.stock >= row.quantity);
}
export function newDraft(item?: CatalogItem, kind: "product" | "combo" = "product", storeName = "nuestra tienda"): Draft {
  return { key: globalThis.crypto.randomUUID(), kind: item ? kind : "store", itemId: item?.id, imageUrl: item ? catalogImage(item) : null, title: item?.name || `Descubre ${storeName}`, body: item ? `${item.name}\nPrecio: ${Number(item.price).toFixed(2)} USD\n${publicationExcerpt(item.description || "", item.name)}`.trim().slice(0, 5000) : `Descubre los productos de ${storeName}. Consulta precios y disponibilidad en nuestra tienda.`, network: "whatsapp" };
}
export function publicationExcerpt(description: string, name: string) {
  const plain = description.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").trim();
  const normalize = (value: string) => value.toLocaleLowerCase("es").replace(/[^\p{L}\p{N}]/gu, "");
  const lines = plain.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  while (lines.length && normalize(lines[0]) === normalize(name)) lines.shift();
  const text = lines.join(" ").replace(/\s+/g, " ");
  if (text.length <= 220) return text;
  const clipped = text.slice(0, 217);
  return clipped.slice(0, clipped.lastIndexOf(" ") > 150 ? clipped.lastIndexOf(" ") : clipped.length) + "…";
}
export function catalogImage(item: CatalogItem) {
  return item.product_images?.find((row) => row.is_main)?.image_url?.trim() || item.product_images?.find((row) => row.image_url?.trim())?.image_url?.trim() || item.image_url?.trim() || null;
}
export function publicationImage(url: string) {
  try { const code = new URL(url).pathname.match(/^\/r\/([a-f0-9]{48})$/)?.[1]; return code ? `/r/${code}/image` : null; } catch { return null; }
}
