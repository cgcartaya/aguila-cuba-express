import type { Metadata } from "next";
import { headers } from "next/headers";

import AguilaLanding from "@/components/landing/AguilaLanding";
import PerlaMarketplaceLanding from "@/components/landing/PerlaMarketplaceLanding";
import YoyoLanding from "@/components/landing/yoyo/YoyoLanding";

const PLATFORM_DOMAIN = "perlamarketplace.com";

type LandingType = "aguila" | "yoyo" | "perla";

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
    return {
      title: "Águila Cuba Express | Envíos y compras para Cuba",
      description:
        "Envíos, compras, rastreo y atención personalizada de Miami a Cuba.",
    };
  }

  if (landing === "yoyo") {
    return {
      title: "YOYO Envíos | Envíos seguros a Cuba",
      description:
        "Envíos express, aéreos y marítimos a Cuba con rastreo y atención personalizada.",
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
    return <AguilaLanding />;
  }

  if (landing === "yoyo") {
    return <YoyoLanding />;
  }

  return <PerlaMarketplaceLanding />;
}
