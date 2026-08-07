import type { Metadata } from "next";
import { headers } from "next/headers";

import AguilaLanding from "@/components/landing/AguilaLanding";
import DeParisLanding from "@/components/landing/deparis/DeParisLanding";
import PerlaMarketplaceLanding from "@/components/landing/PerlaMarketplaceLanding";
import YoyoLanding from "@/components/landing/yoyo/YoyoLanding";
import { buildStoreMetadata, resolveStoreBySlug } from "@/lib/saas/store-metadata";

const AGUILA_CANONICAL_URL = "https://www.aguilaexpressusa.com";

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

  // Dominios personalizados de Águila.
  if (
    normalizedHost === "aguilacubaexpress.com" ||
    normalizedHost === "aguila-cuba-express.com" ||
    normalizedHost === "aguilaexpressusa.com" ||
    normalizedHost.startsWith("aguila.") ||
    normalizedHost.startsWith("aguila-cuba-express.") ||
    normalizedHost.startsWith("aguilacubaexpress.") ||
    normalizedHost.startsWith("aguilaexpressusa.")
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

  // Subdominio y dominios personalizados de De Paris.
  if (
    normalizedHost === `deparis.${PLATFORM_DOMAIN}` ||
    normalizedHost.startsWith("deparis.") ||
    normalizedHost === "depariscuba.com" ||
    normalizedHost.startsWith("depariscuba.")
  ) {
    return "deparis";
  }

  return "perla";
}

async function getCurrentLanding(): Promise<LandingType> {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost || requestHeaders.get("host");

  return resolveLanding(host || "");
}

export async function generateMetadata(): Promise<Metadata> {
  const landing = await getCurrentLanding();

  if (landing === "aguila") {
    const store = await resolveStoreBySlug("aguila");

    if (store) {
      return buildStoreMetadata(store, AGUILA_CANONICAL_URL);
    }

    return {
      title: "Aguila Express USA | Paquetería, compras y envíos",
      description:
        "Envíos puerta a puerta, compras y rastreo en tiempo real, con atención personalizada.",
    };
  }

  if (landing === "yoyo") {
    return {
      title: "YOYO Envíos | Envíos seguros a Cuba",
      description:
        "Envíos express, aéreos y marítimos a Cuba con rastreo y atención personalizada.",
    };
  }

  if (landing === "deparis") {
    return {
      title: "De Paris | Panadería, bistró y mercado gourmet",
      description:
        "Panadería francesa, bistró y mercado gourmet — pide en línea con entrega y rastreo.",
    };
  }

  return {
    title: "Perla Marketplace | Tu negocio conectado",
    description:
      "Marketplace y plataforma de gestión para comercios y agencias de envíos.",
  };
}

export default async function HomePage() {
  const landing = await getCurrentLanding();

  if (landing === "aguila") {
    const store = await resolveStoreBySlug("aguila");
    return <AguilaLanding logoUrl={store?.logo_url || null} />;
  }

  if (landing === "yoyo") {
    return <YoyoLanding />;
  }

  if (landing === "deparis") {
    return <DeParisLanding />;
  }

  return <PerlaMarketplaceLanding />;
}
