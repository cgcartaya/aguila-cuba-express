import type { Metadata } from "next";
import { headers } from "next/headers";

import "./globals.css";

import { CartProvider } from "@/contexts/CartContext";
import { StoreProvider } from "@/contexts/StoreContext";
import {
  buildPerlaMetadata,
  buildStoreMetadata,
  resolveStoreByHost,
} from "@/lib/saas/store-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();

  const host =
    requestHeaders.get("x-forwarded-host") ||
    requestHeaders.get("host") ||
    "perlamarketplace.com";

  const protocol =
    requestHeaders.get("x-forwarded-proto") ||
    (host.includes("localhost") ? "http" : "https");

  const cleanHost = host.split(",")[0].trim().split(":")[0];
  const store = await resolveStoreByHost(cleanHost);

  if (!store) {
    return buildPerlaMetadata();
  }

  return buildStoreMetadata(
    store,
    `${protocol}://${cleanHost}`
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body>
        <StoreProvider>
          <CartProvider>{children}</CartProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
