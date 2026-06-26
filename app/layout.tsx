import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/contexts/CartContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://aguilacubaexpress.com"),

  title: {
    default: "Águila Cuba Express | Envíos de Miami a Cienfuegos",
    template: "%s | Águila Cuba Express",
  },

  description:
    "Agencia de envíos desde Miami hacia Cienfuegos, Cuba. Servicio de paquetería, compras y entregas rápidas y seguras.",

  keywords: [
    "envíos a Cuba",
    "envíos a Cienfuegos",
    "paquetería Cuba",
    "agencia de envíos Miami",
    "compras para Cuba",
    "envíos Miami Cienfuegos",
    "Águila Cuba Express",
    "paquetes a Cuba",
    "mensajería Cuba",
  ],

  authors: [{ name: "Águila Cuba Express" }],
  creator: "Águila Cuba Express",
  publisher: "Águila Cuba Express",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  openGraph: {
    title: "Águila Cuba Express",
    description:
      "Envíos, compras y entregas desde Miami hacia Cienfuegos, Cuba.",

    url: "https://aguilacubaexpress.com",
    siteName: "Águila Cuba Express",

    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Águila Cuba Express",
      },
    ],

    locale: "es_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Águila Cuba Express",
    description:
      "Envíos, compras y entregas desde Miami hacia Cienfuegos, Cuba.",
    images: ["/og-image.png"],
  },

  alternates: {
    canonical: "https://aguilacubaexpress.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>
  <CartProvider>
    {children}
  </CartProvider>
</body>
    </html>
  );
}
