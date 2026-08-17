import { NextRequest, NextResponse } from "next/server";

import type { Store } from "@/lib/saas/store-types";
import {
  getStoreByDomain,
  getStoreBySlug,
  getStoreBySubdomain,
} from "@/lib/services/stores";
import { getStoreProductsByStoreId } from "@/lib/services/products";

/*
  ============================================================
  FEED DE CATÁLOGO PARA META (Facebook / Instagram Shops)
  ============================================================
  Genera un CSV en el formato que Meta Commerce Manager espera
  cuando el dueño de una tienda elige "Usar una URL" al agregar
  productos (Agregar productos > Elige cómo subir el archivo).

  URL pública (una vez desplegado):
    https://www.aguilaexpressusa.com/api/meta-catalog
    https://www.aguilaexpressusa.com/api/meta-catalog.csv  (alias, ver next.config.ts)

  Esa es exactamente la dirección que hay que pegar en el campo
  "Ingresa la URL de tu servidor..." de Meta — NUNCA la URL de
  la tienda en sí, Meta espera un archivo/feed, no una página.

  Multiempresa: resuelve la tienda igual que StoreContext/middleware
  (por dominio propio, por subdominio de perlamarketplace.com, o por
  ?store=slug para pruebas manuales), así que cualquier tienda del
  SaaS puede generar su propio feed pegando su propio dominio + esta
  misma ruta, sin tocar código.
  ============================================================
*/

export const revalidate = 1800; // refresca el feed cada 30 min
export const maxDuration = 30;

const PLATFORM_DOMAIN = "perlamarketplace.com";

function normalizeHost(hostname: string) {
  return hostname.replace(/^www\./, "").toLowerCase().trim();
}

function getSubdomainFromHost(hostname: string) {
  const host = normalizeHost(hostname);
  if (!host.endsWith(`.${PLATFORM_DOMAIN}`)) return null;
  const subdomain = host.replace(`.${PLATFORM_DOMAIN}`, "").trim();
  if (!subdomain || subdomain === "www") return null;
  return subdomain;
}

async function resolveStore(
  request: NextRequest
): Promise<{ store: Store | null; usedOverride: boolean; host: string }> {
  const host = normalizeHost(request.headers.get("host") || "");
  const overrideSlug = request.nextUrl.searchParams.get("store")?.trim();

  if (overrideSlug) {
    const store = await getStoreBySlug(overrideSlug);
    return { store, usedOverride: true, host };
  }

  const subdomain = getSubdomainFromHost(host);
  if (subdomain) {
    const store = await getStoreBySubdomain(subdomain);
    if (store) return { store, usedOverride: false, host };
  }

  const storeByDomain = await getStoreByDomain(host);
  if (storeByDomain) return { store: storeByDomain, usedOverride: false, host };

  return { store: null, usedOverride: false, host };
}

function resolveBaseUrl(store: Store, host: string, usedOverride: boolean) {
  // Si la tienda se resolvió por el host real de la petición, esa es
  // exactamente la URL bajo la cual Meta está leyendo el feed: úsala.
  if (!usedOverride) return `https://${host}`;

  // ?store=slug manual (pruebas) sin host coincidente: reconstruir
  // la mejor URL pública posible para esa tienda.
  if (store.domain) return `https://www.${normalizeHost(store.domain)}`;
  if (store.subdomain) return `https://${store.subdomain}.${PLATFORM_DOMAIN}`;
  return `https://www.${PLATFORM_DOMAIN}`;
}

function buildProductUrl(store: Store, productId: string, baseUrl: string) {
  const isDefaultStore = store.slug === "aguila";
  const path = isDefaultStore
    ? `/tienda/producto/${productId}`
    : `/tienda/${store.slug}/producto/${productId}`;
  return `${baseUrl}${path}`;
}

function resolveMainImage(product: {
  image_url?: string | null;
  product_images?: Array<{
    image_url: string;
    is_main: boolean;
    position: number | null;
  }> | null;
}) {
  const images = product.product_images || [];
  const main = images.find((image) => image.is_main);
  const first = images
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0];

  return main?.image_url || first?.image_url || product.image_url || null;
}

// Escapa un valor para una celda CSV (comillas, comas, saltos de línea).
function csvCell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

const CSV_HEADERS = [
  "id",
  "title",
  "description",
  "availability",
  "condition",
  "price",
  "link",
  "image_link",
  "brand",
];

export async function GET(request: NextRequest) {
  const { store, usedOverride, host } = await resolveStore(request);

  if (!store) {
    return NextResponse.json(
      {
        error:
          "No se encontró una tienda para este dominio. Verifica que el dominio esté configurado en Admin > Tiendas, o usa ?store=slug para pruebas.",
      },
      { status: 404 }
    );
  }

  const { data: products, error } = await getStoreProductsByStoreId(store.id);

  if (error) {
    return NextResponse.json(
      { error: "No se pudieron cargar los productos de la tienda." },
      { status: 500 }
    );
  }

  const baseUrl = resolveBaseUrl(store, host, usedOverride);
  const brand = store.name || "Tienda";

  const rows = (products || [])
    .map((product: any) => {
      const imageLink = resolveMainImage(product);

      // Meta exige image_link: un producto sin ninguna imagen no se
      // puede anunciar, así que se omite del feed en vez de mandarlo roto.
      if (!imageLink) return null;

      const price = Number(product.price || 0).toFixed(2);
      const inStock = (product.stock ?? 0) > 0;

      return [
        csvCell(product.id),
        csvCell(product.name || ""),
        csvCell((product.description || product.name || "").slice(0, 5000)),
        csvCell(inStock ? "in stock" : "out of stock"),
        csvCell("new"),
        csvCell(`${price} USD`),
        csvCell(buildProductUrl(store, product.id, baseUrl)),
        csvCell(imageLink),
        csvCell(brand),
      ].join(",");
    })
    .filter((row): row is string => Boolean(row));

  const csv = [CSV_HEADERS.join(","), ...rows].join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "inline; filename=\"meta-catalog.csv\"",
      "Cache-Control": "public, max-age=1800, stale-while-revalidate=3600",
    },
  });
}
