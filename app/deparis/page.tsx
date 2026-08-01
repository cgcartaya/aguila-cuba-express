import type { Metadata } from "next";
import DeParisLanding from "@/components/landing/deparis/DeParisLanding";

export const metadata: Metadata = {
  title: "De Paris | Mercado & Bistró francés en Miami",
  description:
    "De Paris es un bar restaurante y mercado online de inspiración francesa en Miami: panadería, quesos, vinos y platos de bistró con delivery o retiro en tienda.",
};

export default function DeParisPage() {
  return <DeParisLanding />;
}
