import { createHmac, timingSafeEqual } from "node:crypto";

export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const CODE = /^[a-f0-9]{48}$/;
export const cookieName = (storeId: string) =>
  `perla_ref_${storeId.replaceAll("-", "")}`;
export type Receipt = {
  linkId: string;
  storeId: string;
  visitId: string;
  issuedAt: number;
};

export function signReceipt(receipt: Receipt, secret: string) {
  const payload = Buffer.from(JSON.stringify(receipt)).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}

export function verifyReceipt(
  value: string | undefined,
  storeId: string,
  secret: string,
  days: number,
  now = Date.now(),
): Receipt | null {
  if (!value || value.length > 1200) return null;
  try {
    const [payload, signature, extra] = value.split(".");
    if (extra || !payload || !signature) return null;
    const expected = createHmac("sha256", secret).update(payload).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      return null;
    const receipt = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as Receipt;
    const age = now - receipt.issuedAt;
    if (
      receipt.storeId !== storeId ||
      !UUID.test(receipt.linkId) ||
      !UUID.test(receipt.visitId) ||
      !Number.isFinite(age) ||
      age < 0 ||
      age > days * 86400000
    )
      return null;
    return receipt;
  } catch {
    return null;
  }
}

export type PublicStore = {
  id: string;
  slug: string;
  domain?: string | null;
  subdomain?: string | null;
  has_landing?: boolean | null;
};
export function storefront(store: PublicStore) {
  const domain = store.domain
    ?.trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  // The host comes exclusively from the saved store configuration, never the request body.
  const safeDomain =
    domain && /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain)
      ? domain.toLowerCase()
      : null;
  const subdomain = store.subdomain?.trim().toLowerCase();
  const host =
    safeDomain ||
    (subdomain && /^[a-z0-9][a-z0-9-]*$/.test(subdomain)
      ? `${subdomain}.perlamarketplace.com`
      : null);
  return {
    origin: host ? `https://${host}` : "https://perlamarketplace.com",
    base: host
      ? store.has_landing
        ? "/tienda"
        : ""
      : `/tienda/${encodeURIComponent(store.slug)}`,
  };
}
export function destination(
  store: PublicStore,
  kind: string,
  itemId: string | null,
) {
  const { origin, base } = storefront(store);
  return (
    `${origin}${base}${kind === "product" ? `/producto/${itemId}` : kind === "combo" ? `/combos/${itemId}` : ""}` ||
    origin
  );
}
export function isPreviewBot(userAgent: string) {
  return /bot\b|crawler|spider|facebookexternalhit|facebot|WhatsApp|TelegramBot|Twitterbot|Slackbot|Discordbot|LinkedInBot/i.test(
    userAgent,
  );
}

// A custom domain may be canonicalized to/from www by hosting before Next.js.
// Accept only that exact saved-domain alias, keeping checkout on the cookie host.
export function storefrontForRequest(
  store: PublicStore,
  requestOrigin: string,
) {
  const canonical = storefront(store);
  if (!store.domain?.trim()) return canonical;
  const host = new URL(canonical.origin).hostname;
  const configured = store.domain
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .toLowerCase();
  if (configured !== host) return canonical;
  const alias = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
  return requestOrigin === `https://${alias}`
    ? { ...canonical, origin: requestOrigin }
    : canonical;
}
