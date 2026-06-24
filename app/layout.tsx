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

export const metadata = {
  title: "Águila Cuba Express",
  description: "Envíos, compras y entregas para Cuba desde Miami.",
  openGraph: {
    title: "Águila Cuba Express",
    description: "Envíos, compras y entregas para Cuba desde Miami.",
    url: "https://www.aguilacubaexpress.com",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
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
