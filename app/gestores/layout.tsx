import type { Metadata, Viewport } from "next";
export const metadata: Metadata = {
  title: { absolute: "ShareAPP · Perla Marketplace" },
  description: "Comparte productos de tus tiendas y conoce tus resultados.",
  applicationName: "ShareAPP",
  manifest: "/gestores/manifest.webmanifest",
  appleWebApp: { capable: true, title: "ShareAPP", statusBarStyle: "default" },
  icons: { icon: "/shareapp/icon-192.png", apple: "/shareapp/icon-180.png" },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#151d35",
};
export default function ShareappLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
