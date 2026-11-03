/** Public identity only. Never use another tenant as a branding fallback. */
export type BrandingStore = {
  id?: string;
  name?: string | null;
  slug?: string | null;
  domain?: string | null;
  subdomain?: string | null;
  logo_url?: string | null;
  has_landing?: boolean | null;
  module_store_enabled?: boolean | null;
};

export type BrandingSettings = {
  store_name?: string | null;
  logo_url?: string | null;
  whatsapp?: string | null;
};

export function publicStoreOrigin(store?: BrandingStore | null) {
  const domain = (store?.domain || "").trim().toLowerCase()
    .replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
  if (/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(domain)) return `https://${domain}`;
  const subdomain = (store?.subdomain || "").trim().toLowerCase();
  if (/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(subdomain)) return `https://${subdomain}.perlamarketplace.com`;
  return null;
}

export function storeBranding(store?: BrandingStore | null, settings?: BrandingSettings | null) {
  const origin = publicStoreOrigin(store);
  const slug = store?.slug?.trim() || "";
  const phone = (settings?.whatsapp || "").replace(/\D/g, "");
  const storefrontUrl = store?.module_store_enabled === false ? null : origin
    ? `${origin}${store?.has_landing ? "/tienda" : ""}`
    : slug ? `https://perlamarketplace.com/tienda/${encodeURIComponent(slug)}` : null;
  return {
    id: store?.id || "",
    slug,
    name: settings?.store_name?.trim() || store?.name?.trim() || "Agencia de envíos",
    logoUrl: settings?.logo_url?.trim() || store?.logo_url?.trim() || null,
    website: origin || storefrontUrl,
    origin,
    storefrontUrl,
    whatsappUrl: phone ? `https://wa.me/${phone}` : null,
  };
}
export type StoreBranding = ReturnType<typeof storeBranding>;
