import type { Metadata } from "next";
import { buildLandingMetadata, landingProfiles } from "@/components/landing/metadata";
import YoyoLanding from "@/components/landing/yoyo/YoyoLanding";

export const metadata: Metadata = buildLandingMetadata(
  "https://perlamarketplace.com/yoyo-envios",
  landingProfiles.yoyo,
);

export default function YoyoEnviosPage() {
  return <YoyoLanding />;
}
