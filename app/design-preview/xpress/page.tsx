import type { Metadata } from "next";
import XpressLanding from "@/components/landing/xpress/XpressLanding";

export const metadata: Metadata = {
  title: "Vista previa de Xpress Multiservices",
  robots: { index: false, follow: false },
};

export default function XpressPreviewPage() {
  return <XpressLanding />;
}
