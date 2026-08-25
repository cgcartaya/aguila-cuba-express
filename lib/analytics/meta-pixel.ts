import type { CartItem, Product } from "@/types/cart";

const AGUILA_HOST = "aguilaexpressusa.com";
const PURCHASE_STORAGE_KEY = "aguila_meta_pending_purchase";
const sentEvents = new Set<string>();

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

type MetaItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type PendingPurchase = {
  orderId: string;
  value: number;
  items: MetaItem[];
};

function isAguilaPublicPage() {
  if (typeof window === "undefined") return false;

  const host = window.location.hostname.toLowerCase().replace(/^www\./, "");
  const isAdmin =
    window.location.pathname === "/admin" ||
    window.location.pathname.startsWith("/admin/");

  return host === AGUILA_HOST && !isAdmin;
}

function originalProductId(id: string | number) {
  return String(id).replace(/^product-/, "");
}

function sendMetaEvent(
  eventName: "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase",
  parameters: Record<string, unknown>,
  dedupeKey: string,
  attemptsLeft = 20
) {
  if (!isAguilaPublicPage() || sentEvents.has(dedupeKey)) return;

  if (typeof window.fbq !== "function") {
    if (attemptsLeft > 0) {
      window.setTimeout(
        () => sendMetaEvent(eventName, parameters, dedupeKey, attemptsLeft - 1),
        250
      );
    }
    return;
  }

  sentEvents.add(dedupeKey);
  window.fbq("track", eventName, parameters);
}

function eventParameters(items: MetaItem[], value: number) {
  return {
    content_ids: items.map((item) => item.id),
    content_type: "product",
    contents: items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      item_price: item.price,
    })),
    value: Number(value.toFixed(2)),
    currency: "USD",
    num_items: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export function trackMetaViewContent(product: Product) {
  const item: MetaItem = {
    id: originalProductId(product.id),
    name: product.name,
    price: Number(product.price),
    quantity: 1,
  };

  sendMetaEvent(
    "ViewContent",
    { ...eventParameters([item], item.price), content_name: item.name },
    `view:${window.location.pathname}:${item.id}`
  );
}

export function trackMetaAddToCart(product: Product, quantity: number, unitPrice: number) {
  const item: MetaItem = {
    id: originalProductId(product.id),
    name: product.name,
    price: Number(unitPrice),
    quantity,
  };

  sendMetaEvent(
    "AddToCart",
    { ...eventParameters([item], item.price * quantity), content_name: item.name },
    `cart:${Date.now()}:${item.id}:${quantity}`
  );
}

export function metaItemsFromCart(cart: CartItem[]): MetaItem[] {
  return cart
    .filter((item) => item.type === "product")
    .map((item) => ({
      id: originalProductId(item.id),
      name: item.name,
      price: Number(item.price),
      quantity: item.quantity,
    }));
}

export function trackMetaInitiateCheckout(cart: CartItem[], value: number) {
  const items = metaItemsFromCart(cart);
  if (items.length === 0) return;

  const signature = items.map((item) => `${item.id}:${item.quantity}`).join("|");
  sendMetaEvent(
    "InitiateCheckout",
    eventParameters(items, value),
    `checkout:${window.location.pathname}:${signature}`
  );
}

export function savePendingMetaPurchase(orderId: string, cart: CartItem[], value: number) {
  if (!isAguilaPublicPage()) return;

  const purchase: PendingPurchase = {
    orderId,
    value: Number(value),
    items: metaItemsFromCart(cart),
  };

  if (purchase.items.length === 0) return;

  try {
    window.sessionStorage.setItem(PURCHASE_STORAGE_KEY, JSON.stringify(purchase));
  } catch {
    // El seguimiento nunca debe bloquear la compra.
  }
}

export function trackPendingMetaPurchase(orderNumber: string) {
  if (!isAguilaPublicPage() || !orderNumber) return;

  try {
    const raw = window.sessionStorage.getItem(PURCHASE_STORAGE_KEY);
    if (!raw) return;

    const purchase = JSON.parse(raw) as PendingPurchase;
    if (!purchase?.orderId || !Array.isArray(purchase.items)) return;
    if (purchase.orderId !== orderNumber) return;

    const completedKey = `aguila_meta_purchase_${purchase.orderId}`;
    if (window.localStorage.getItem(completedKey)) {
      window.sessionStorage.removeItem(PURCHASE_STORAGE_KEY);
      return;
    }

    sendMetaEvent(
      "Purchase",
      eventParameters(purchase.items, purchase.value),
      `purchase:${purchase.orderId}`
    );

    window.localStorage.setItem(completedKey, "1");
    window.sessionStorage.removeItem(PURCHASE_STORAGE_KEY);
  } catch {
    // El seguimiento nunca debe afectar la pantalla de confirmación.
  }
}
