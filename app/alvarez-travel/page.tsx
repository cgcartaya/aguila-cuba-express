import type { Metadata } from "next";
import AlvarezLanding from "@/components/landing/alvarez/AlvarezLanding";
import "./alvarez-brand.css";

export const metadata: Metadata = {
  title: "Álvarez Travel | Tu conexión entre Estados Unidos y Cuba",
  description:
    "Envíos, viajes y servicios con orientación clara, atención cercana y condiciones confirmadas. De aquí pa’ Cuba sin cuento.",
};

export default function AlvarezTravelPreviewPage() {
  return <div className="alvarez-brand-surface"><AlvarezLanding /></div>;
}
