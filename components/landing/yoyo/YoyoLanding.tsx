"use client";

import UpcomingPickupRoutes from "@/components/pickups/UpcomingPickupRoutes";
import YoyoNavbar from "@/components/landing/yoyo/YoyoNavbar";
import YoyoHero from "@/components/landing/yoyo/YoyoHero";
import { FinalSections, PickupSection, QuoteSection, ServicesSection } from "@/components/landing/yoyo/YoyoBrandSections";
import YoyoFooter from "@/components/landing/yoyo/YoyoFooter";

export default function YoyoLanding() {
  return <main className="min-h-screen bg-[#f6f8fc] text-slate-950"><YoyoNavbar/><YoyoHero/><UpcomingPickupRoutes storeSlug="yoyo-envios"/><ServicesSection/><QuoteSection/><PickupSection/><FinalSections/><YoyoFooter/></main>;
}
