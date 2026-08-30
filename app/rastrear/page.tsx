import type { Metadata } from "next";
import { headers } from "next/headers";
import TrackingSearch from "@/components/tracking/TrackingSearch";
import {
  buildStoreTrackingMetadata,
  normalizeStoreHost,
  resolveStoreByHost,
  resolveStoreBySlug,
} from "@/lib/saas/store-metadata";

async function getTrackingContext() {
  const requestHeaders = await headers();
  const host = normalizeStoreHost(
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || ""
  );
  const protocol =
    requestHeaders.get("x-forwarded-proto") ||
    (host.includes("localhost") ? "http" : "https");
  const store = (host ? await resolveStoreByHost(host) : null) ||
    (await resolveStoreBySlug("aguila"));

  return { store, canonicalUrl: `${protocol}://${host || "aguilaexpressusa.com"}/rastrear` };
}

export async function generateMetadata(): Promise<Metadata> {
  const { store, canonicalUrl } = await getTrackingContext();

  if (!store) {
    return {
      title: "Rastrea tu envío | Águila Express USA",
      description: "Consulta el estado y las actualizaciones de tu envío.",
    };
  }

  return buildStoreTrackingMetadata(store, canonicalUrl);
}

export default function RastrearPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-14 text-slate-900 sm:px-6 sm:py-20">
      <section className="mx-auto max-w-4xl text-center">
        <span className="inline-flex rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-700">
          Seguimiento seguro
        </span>

        <h1 className="mt-5 text-4xl font-black text-[#062446] sm:text-6xl">
          Rastrear envío
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          Escribe los 8 caracteres que aparecen después de ACE- para consultar el estado y el historial de tu paquete.
        </p>

        <TrackingSearch />

        <div className="mx-auto mt-12 grid max-w-3xl gap-4 text-left sm:grid-cols-3">
          <Feature title="Código privado" text="Cada envío tiene un código único y fácil de compartir." />
          <Feature title="Estado actualizado" text="Consulta el progreso después de cada sincronización." />
          <Feature title="Datos protegidos" text="No mostramos teléfonos, dirección ni notas internas." />
        </div>
      </section>
    </main>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-black text-[#062446]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}
