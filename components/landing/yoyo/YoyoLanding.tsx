"use client";

import YoyoNavbar from "@/components/landing/yoyo/YoyoNavbar";
import YoyoHero from "@/components/landing/yoyo/YoyoHero";
import YoyoPromotions from "@/components/landing/yoyo/YoyoPromotions";
import YoyoMovementMap from "@/components/landing/yoyo/YoyoMovementMap";
import { FinalSections, PickupSection, QuoteSection } from "@/components/landing/yoyo/YoyoBrandSections";
import YoyoFooter from "@/components/landing/yoyo/YoyoFooter";

export default function YoyoLanding() {
  return <main className="min-h-screen bg-[#f6f8fc] text-slate-950"><YoyoNavbar/><YoyoHero/><YoyoPromotions/><YoyoMovementMap/><QuoteSection/><PickupSection/><FinalSections/><YoyoFooter/></main>;
}
