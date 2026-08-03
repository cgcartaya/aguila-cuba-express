import type { Metadata } from "next";
import { headers } from "next/headers";

import AguilaLanding from "@/components/landing/AguilaLanding";
import PerlaMarketplaceLanding from "@/components/landing/PerlaMarketplaceLanding";
import YoyoLanding from "@/components/landing/yoyo/YoyoLanding";
import DeParisLanding from "@/components/landing/deparis/DeParisLanding";
import {
  buildPerlaMetadata,
  buildStoreMetadata,
  resolveStoreByHost,
} from "@/lib/saas/store-metadata";

const PLATFORM_DOMAIN = "perlamarketplace.com";

type LandingType = "aguila" | "yoyo" | "deparis" | "perla";

function normalizeHost(value: string | null) {
  return (value || "")
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(":")[0]
    .toLowerCase()
    .trim();
}

function resolveLanding(host: string): LandingType {
  const normalizedHost = normalizeHost(host);

  // Dominios personalizados de Águila..
  if (
    normalizedHost === "aguilacubaexpress.com" ||
    normalizedHost === "aguila-cuba-express.com" ||
    normalizedHost.startsWith("aguila.") ||
    normalizedHost.startsWith("aguila-cuba-express.") ||
    normalizedHost.startsWith("aguilacubaexpress.")
  ) {
    return "aguila";
  }

  // Subdominios admitidos de YOYO.
  if (
    normalizedHost === `yoyo.${PLATFORM_DOMAIN}` ||
    normalizedHost === `yoyo-envios.${PLATFORM_DOMAIN}` ||
    normalizedHost.startsWith("yoyo-envios.") ||
    normalizedHost.startsWith("yoyo.")
  ) {
    return "yoyo";
  }

  // Dominio y subdominios de De Paris.
  if (
    normalizedHost === "depariscuba.com" ||
    normalizedHost === `deparis.${PLATFORM_DOMAIN}` ||
    normalizedHost.startsWith("deparis.") ||
    normalizedHost.startsWith("depariscuba.")
  ) {
    return "deparis";
  }

  return "perla";
}

async function getCurrentHost(): Promise<string> {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  return forwardedHost || requestHeaders.get("host") || "";
}

const FALLBACK_METADATA: Record<LandingType, { title: string; description: string }> = {
  aguila: {
    title: "Águila Cuba Express | Envíos y compras para Cuba",
    description:
      "Envíos, compras, rastreo y atención personalizada de Miami a Cuba.",
  },
  yoyo: {
    title: "YOYO Envíos | Envíos seguros a Cuba",
    description:
      "Envíos express, aéreos y marítimos a Cuba con rastreo y atención personalizada.",
  },
  deparis: {
    title: "De Paris | Mercado & Bistró francés en Cienfuegos",
    description:
      "De Paris es un bar restaurante y mercado online de inspiración francesa en Cienfuegos, Cuba: panadería, quesos, vinos y platos de bistró con delivery o retiro en tienda.",
  },
  perla: {
    title: "Perla Marketplace | Tu negocio conectado",
    description:
      "Marketplace y plataforma de gestión para comercios y agencias de envíos.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const host = await getCurrentHost();

  /*
   * Prioridad 1: lo que la tienda configuró en su panel (logo,
   * favicon, título SEO, descripción, imagen para compartir).
   * Esto es lo que se ve en Ajustes > SEO y vista al compartir.
   */
  const store = await resolveStoreByHost(host);

  if (store) {
    const cleanHost = normalizeHost(host);
    return buildStoreMetadata(store, `https://${cleanHost}`);
  }

  /*
   * Prioridad 2 (respaldo): si el dominio no tiene fila en `stores`
   * (o le faltan campos), usamos el texto fijo histórico para las
   * landings especiales, y si tampoco aplica, el genérico de Perla.
   */
  const landing = resolveLanding(host);

  if (landing === "perla") {
    return buildPerlaMetadata();
  }

  return FALLBACK_METADATA[landing];
}

export default async function HomePage() {
  const host = await getCurrentHost();
  const landing = resolveLanding(host);

  if (landing === "aguila") {
    return <AguilaLanding />;
  }

  if (landing === "yoyo") {
    return <YoyoLanding />;
  }

  if (landing === "deparis") {
    return <DeParisLanding />;
  }

  return <PerlaMarketplaceLanding />;
}
