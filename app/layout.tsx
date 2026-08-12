import type { Metadata } from "next";

import "./globals.css";

import { CartProvider } from "@/contexts/CartContext";
import { StoreProvider } from "@/contexts/StoreContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { buildPerlaMetadata } from "@/lib/saas/store-metadata";

/*
 * Metadata por defecto/estática para todo el sitio.
 *
 * IMPORTANTE: este layout ya NO usa headers() para resolver la tienda
 * por dominio. Antes eso obligaba a Next.js a renderizar TODAS las
 * páginas de la plataforma de forma 100% dinámica en cada visita
 * (sin poder cachear nada), porque cualquier uso de headers()/cookies()
 * en el layout raíz "contamina" a todas las rutas hijas.
 *
 * El branding por tienda ahora vive donde realmente corresponde y sin
 * necesitar headers():
 * - /tienda/[slug]/layout.tsx y page.tsx -> generan su metadata a
 *   partir de params.slug (compatible con caché/ISR).
 * - / (home) -> app/page.tsx ya resuelve su propio landing por host
 *   (Águila, YOYO, De Paris) con su propio generateMetadata acotado.
 * - /contacto, /servicios, /salidas, /yoyo-envios, /deparis -> tienen
 *   su propia metadata estática.
 */
export const metadata: Metadata = buildPerlaMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body>
        <StoreProvider>
          <CurrencyProvider>
            <CartProvider>{children}</CartProvider>
          </CurrencyProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
