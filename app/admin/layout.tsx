import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import AdminAuthGuard from "@/components/admin/AdminAuthGuard";
import { resolveStoreByHost } from "@/lib/saas/store-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ||
    requestHeaders.get("host") ||
    "";

  const store = await resolveStoreByHost(host);

  return {
    title: store
      ? `Panel Administrativo | ${store.name || store.slug}`
      : "Panel Administrativo | Perla Marketplace",
  };
}

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <AdminAuthGuard>{children}</AdminAuthGuard>;
}
