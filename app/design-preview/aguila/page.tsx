import type { Metadata } from "next";
import AguilaLanding from "@/components/landing/AguilaLanding";

export const metadata: Metadata = {
  title: { absolute: "Águila Express USA | Propuesta de diseño" },
  robots: { index: false, follow: false },
};
export default function AguilaDesignPreview() {
  return <AguilaLanding />;
}
