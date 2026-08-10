import type { Metadata } from "next";
import YoyoLanding from "@/components/landing/yoyo/YoyoLanding";

export const metadata: Metadata = {
  title: "YOYO Envíos | Envíos seguros a Cuba",
  description:
    "Envíos express, aéreos y marítimos a Cuba con recogida a domicilio, seguimiento y atención personalizada.",
};

export default function YoyoEnviosPage() {
  return <YoyoLanding />;
}
