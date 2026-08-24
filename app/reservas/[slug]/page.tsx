import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getStoreBySlug } from "@/lib/services/stores";
import ReservasPageClient from "@/components/reservas/ReservasPageClient";
import DeParisLanguageProvider from "@/components/deparis-i18n/DeParisLanguageProvider";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);

  if (!store) {
    return { title: "Reservas | Perla Marketplace" };
  }

  return {
    title: `Reservar mesa | ${store.name}`,
    description: `Reserva tu mesa en línea en ${store.name}.`,
  };
}

export default async function ReservasPage({ params }: PageProps) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);

  if (!store) {
    notFound();
  }

  if (!store.module_reservas_enabled) {
    notFound();
  }

  const content = (
    <ReservasPageClient
      storeSlug={slug}
      storeName={store.name}
      // Mismo criterio que /menu/[slug]: la landing real de De Paris
      // vive en "/" (detección por host en app/page.tsx), no en
      // "/deparis" — evita repetir el 404 del botón "Volver" que ya
      // se dio en el módulo de menú.
      landingHref={slug === "deparis" ? "/" : undefined}
      accent={store.primary_color || ""}
      bg={store.secondary_color || ""}
    />
  );
  return slug === "deparis" ? <DeParisLanguageProvider floatingSelector>{content}</DeParisLanguageProvider> : content;
}
