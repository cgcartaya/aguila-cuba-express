export type PackageContentItem = { description: string; quantity: number };
export const MAX_PACKAGE_CONTENTS = 100;

/** Blank editor rows are ignored; partially completed rows must be corrected. */
export function normalizePackageContents(value: unknown): PackageContentItem[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > MAX_PACKAGE_CONTENTS) {
    throw new Error(`El contenido debe tener como máximo ${MAX_PACKAGE_CONTENTS} artículos.`);
  }
  const result: PackageContentItem[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') throw new Error('Revisa los artículos del paquete.');
    const description = typeof entry.description === 'string' ? entry.description.trim() : '';
    const quantity = Number(entry.quantity);
    if (!description && (!quantity || quantity === 1)) continue;
    if (!description || description.length > 160 || !Number.isFinite(quantity) || quantity <= 0 || quantity > 1000000) {
      throw new Error('Cada artículo necesita una descripción (máximo 160 caracteres) y una cantidad mayor que cero.');
    }
    if (Math.round(quantity * 100) !== quantity * 100 && Math.abs(Math.round(quantity * 100) - quantity * 100) > 1e-7) {
      throw new Error('Las cantidades admiten hasta dos decimales.');
    }
    result.push({ description, quantity });
  }
  return result;
}

export function packageNumber(value?: number | string | null) {
  if (value == null || !/^\d+$/.test(String(value)) || Number(value) <= 0) return 'Pendiente';
  return `PKG-${String(value).padStart(8, '0')}`;
}

export function packageInvoiceUrl(store: { domain?: string | null; subdomain?: string | null }, trackingCode: string, fallbackOrigin: string) {
  let origin = new URL(fallbackOrigin).origin;
  if (store.domain?.trim()) {
    const domain = store.domain.trim();
    const parsed = new URL(/^https?:\/\//i.test(domain) ? domain : `https://${domain}`);
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Dominio de la agencia no válido.');
    origin = parsed.origin;
  } else if (store.subdomain && /^[a-z0-9-]+$/i.test(store.subdomain)) {
    origin = `https://${store.subdomain.toLowerCase()}.perlamarketplace.com`;
  }
  if (!trackingCode.trim()) throw new Error('Este envío no tiene código de rastreo para enlazar la factura.');
  return `${origin}/factura/${encodeURIComponent(trackingCode.trim())}`;
}
