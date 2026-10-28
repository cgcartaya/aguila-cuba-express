import type { Metadata } from "next";
import AlvarezLanding from "@/components/landing/alvarez/AlvarezLanding";

export const metadata: Metadata = {
  title: "Alvarez Travel | Envíos y viajes entre Hialeah y Cuba",
  description: "Envíos, remesas, viajes y atención personalizada desde Hialeah hacia Cuba.",
};

export default function AlvarezTravelPreviewPage() {
  return <AlvarezLanding />;
}

